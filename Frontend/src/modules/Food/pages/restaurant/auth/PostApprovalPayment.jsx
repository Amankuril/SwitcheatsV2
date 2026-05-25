import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { Skeleton } from "@food/components/ui/skeleton"
import { restaurantAPI } from "@food/api"
import { getModuleToken, getModuleRefreshToken, setAuthData as setModuleAuthData } from "@food/utils/auth"
import { toast } from "sonner"

const GST_RATE = 0.18
const STATIC_SUBSCRIPTION_COLOR = "#FA0272"

export default function PostApprovalPayment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [settings, setSettings] = useState(null)
  const [loadError, setLoadError] = useState("")
  const [paymentType, setPaymentType] = useState("full")
  const [partialAmount, setPartialAmount] = useState("")
  const [plan, setPlan] = useState("starter")
  const [planSelectionWarning, setPlanSelectionWarning] = useState("")
  const [attemptedPlanId, setAttemptedPlanId] = useState("")
  const [mode, setMode] = useState("onboarding")
  const [planCatalog, setPlanCatalog] = useState([])
  const [gmvLast30Days, setGmvLast30Days] = useState(0)
  const cachedFeatureFlag = typeof window !== "undefined"
    ? localStorage.getItem("restaurant_subscription_feature_enabled")
    : null

  useLayoutEffect(() => {
    if (cachedFeatureFlag === "false") {
      navigate("/food/restaurant", { replace: true })
    }
  }, [cachedFeatureFlag, navigate])

  if (cachedFeatureFlag === "false") {
    return null
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoadError("")
        const [restaurantRes, featureRes] = await Promise.all([
          restaurantAPI.getCurrentRestaurant(),
          restaurantAPI.getFeatureSettingsPublic(),
        ])
        if (!mounted) return

        const rows = Array.isArray(featureRes?.data?.data) ? featureRes.data.data : []
        const feature = rows.find((row) => row.key === "restaurant_subscription")
        const isSubscriptionEnabled = feature ? Boolean(feature.isEnabled) : true
        localStorage.setItem("restaurant_subscription_feature_enabled", String(isSubscriptionEnabled))
        if (!isSubscriptionEnabled) {
          navigate("/food/restaurant", { replace: true })
          return
        }

        const restaurant =
          restaurantRes?.data?.data?.restaurant ||
          restaurantRes?.data?.restaurant

        const expiryMs = restaurant?.subscriptionValidTill ? new Date(restaurant.subscriptionValidTill).getTime() : NaN
        const isExpired = Number.isFinite(expiryMs) && expiryMs < Date.now()
        const nextMode = restaurant?.onboardingFeePaid ? (isExpired ? "renewal" : "none") : "onboarding"
        if (nextMode === "none") {
          navigate("/food/restaurant", { replace: true })
          return
        }
        setMode(nextMode)

        const settingsRes = await restaurantAPI.getSubscriptionSettings()
        if (!mounted) return
        const s = settingsRes?.data?.data || null
        if (!s) throw new Error("Subscription settings missing")

        const eligibility = restaurant?.subscriptionEligibility || {}
        const eligibilityPlan = String(eligibility?.eligiblePlan || "starter").toLowerCase()
        const catalog = Array.isArray(eligibility?.planCatalog) ? eligibility.planCatalog : [
          { id: "starter", label: "Starter", basePrice: Number(s.starterPrice || 999) },
          { id: "growth", label: "Growth", basePrice: Number(s.growthPrice || 1999) },
          { id: "premium", label: "Premium", basePrice: Number(s.premiumPrice || 2999) },
        ]
        setPlanCatalog(catalog)
        setPlan(eligibilityPlan)
        setGmvLast30Days(Number(eligibility?.gmvLast30Days || 0))
        setSettings(s)
      } catch (err) {
        const featureDisabledByMessage = /feature|subscription.*disabled/i.test(
          err?.response?.data?.message || err?.message || ""
        )
        if (featureDisabledByMessage) {
          navigate("/food/restaurant", { replace: true })
          return
        }
        toast.error(err?.response?.data?.message || "Failed to load payment details")
        if (mounted) {
          setLoadError("Unable to load payment details. Please retry.")
          setSettings(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [navigate])

  const calc = useMemo(() => {
    if (!settings) return null

    const starterPrice = Number(settings.starterPrice || 999)
    const growthPrice = Number(settings.growthPrice || 1999)
    const premiumPrice = Number(settings.premiumPrice || 2999)
    const onboardingFeeBase = Number(settings.onboardingFee || 799)

    const selectedPlanBase =
      plan === "premium" ? premiumPrice : plan === "growth" ? growthPrice : starterPrice
    const selectedPlanGST = Math.round(selectedPlanBase * GST_RATE)
    const subscriptionPlanTotal = selectedPlanBase + selectedPlanGST

    const onboardingGST = Math.round(onboardingFeeBase * GST_RATE)
    const onboardingFeeTotal = mode === "onboarding" ? onboardingFeeBase + onboardingGST : 0

    const partialBase = Number(partialAmount || 0)
    let subscriptionPaidNowBase = 0

    if (paymentType === "full") subscriptionPaidNowBase = selectedPlanBase
    if (paymentType === "partial") subscriptionPaidNowBase = Math.max(0, Math.min(partialBase, selectedPlanBase))

    const subscriptionPaidNowGST = Math.round(subscriptionPaidNowBase * GST_RATE)
    const subscriptionPaidNowTotal = subscriptionPaidNowBase + subscriptionPaidNowGST
    const subscriptionDueLaterTotal = Math.max(0, subscriptionPlanTotal - subscriptionPaidNowTotal)
    const payableNow = onboardingFeeTotal + subscriptionPaidNowTotal

    return {
      starterPrice,
      growthPrice,
      premiumPrice,
      onboardingFeeBase,
      onboardingGST,
      onboardingFeeTotal,
      selectedPlanBase,
      selectedPlanGST,
      subscriptionPlanTotal,
      subscriptionPaidNowBase,
      subscriptionPaidNowGST,
      subscriptionPaidNowTotal,
      subscriptionDueLaterTotal,
      payableNow,
    }
  }, [settings, plan, paymentType, partialAmount, mode])

  const paymentInfoContent = useMemo(() => ({
    full: mode === "onboarding"
      ? "Pay now: Onboarding fee and the selected plan are charged right away. From the next cycle onward, regular due rules apply."
      : "Pay now: The full selected plan amount is charged right away. Once dues are cleared, the remaining wallet balance stays available.",
    partial: mode === "onboarding"
      ? "Pay partial: Onboarding fee is mandatory now. A partial plan amount is paid now and the rest becomes due. Due is auto-deducted when available earnings reach the due amount."
      : "Pay partial: A partial plan amount is paid now and the rest becomes due. Due auto-settles when available earnings can fully cover it.",
    later: mode === "onboarding"
      ? "Pay later: Only onboarding fee is charged now. The full plan amount becomes due and will auto-deduct from available earnings once balance is sufficient."
      : "Pay later: Nothing is charged now. The full plan amount becomes due and will auto-deduct from available earnings once balance is sufficient.",
  }), [mode])

  const handleCreateOrder = async () => {
    if (!calc) {
      toast.error("Please select a subscription plan")
      return
    }

    if (paymentType === "partial") {
      const partialBase = Number(partialAmount || 0)
      if (!Number.isFinite(partialBase) || partialBase <= 0) {
        toast.error("Please enter a valid partial amount")
        return
      }
      if (partialBase > calc.selectedPlanBase) {
        toast.error(`Partial amount cannot exceed ₹${calc.selectedPlanBase}`)
        return
      }
    }

    setProcessing(true)
    try {
      const body = {
        subscriptionPlan: plan,
        subscriptionPaymentType: paymentType,
        mode,
      }
      if (paymentType === "partial") {
        body.subscriptionPartialAmount = Number(partialAmount || 0)
      }

      const res = await restaurantAPI.createPostApprovalOnboardingOrder(body)
      const orderData = res?.data?.data
      if (!orderData?.razorpay) throw new Error("Failed to create payment order")

      const { loadRazorpayScript, initRazorpayPayment } = await import("@food/utils/razorpay")
      await loadRazorpayScript()

      await initRazorpayPayment({
        key: orderData.razorpay.key,
        amount: orderData.razorpay.amount,
        currency: "INR",
        order_id: orderData.razorpay.orderId,
        name: "Restaurant onboarding",
        description: "Activation payment",
        handler: async (response) => {
          try {
            const verifyRes = await restaurantAPI.verifyPostApprovalOnboardingPayment({
              razorpayOrderId: orderData.razorpay.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              subscriptionPlan: plan,
              subscriptionPaymentType: paymentType,
              subscriptionPartialAmount: paymentType === "partial" ? Number(partialAmount || 0) : 0,
              mode,
            })

            const verifiedRestaurant =
              verifyRes?.data?.data?.restaurant ||
              verifyRes?.data?.restaurant ||
              null

            if (verifiedRestaurant) {
              try {
                const token = getModuleToken("restaurant")
                const refresh = getModuleRefreshToken("restaurant")
                if (token) {
                  setModuleAuthData("restaurant", token, verifiedRestaurant, refresh)
                }
              } catch {
                // no-op: fallback to dashboard navigation
              }
            }

            window.dispatchEvent(new Event("restaurantAuthChanged"))

            toast.success("Payment successful. Dashboard unlocked.")
            navigate("/food/restaurant", { replace: true })
          } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Payment verification failed")
          } finally {
            setProcessing(false)
          }
        },
        onClose: () => setProcessing(false),
        onError: (err) => {
          toast.error(err?.description || "Payment failed")
          setProcessing(false)
        },
      })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to initiate payment")
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64 mt-2" />
        </header>
        <main className="flex-1 p-4 space-y-4 max-w-2xl w-full mx-auto">
          <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-3 w-36" />
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </section>
        </main>

        <footer className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between max-w-2xl w-full mx-auto">
          <Skeleton className="h-10 w-20 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </footer>
      </div>
    )
  }

  if (!calc) {
    return (
      <div className="min-h-screen bg-[#E6E6E9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-red-200 px-5 py-4 text-sm text-red-600">Failed to load payment details. Please refresh and try again.</div>
      </div>
    )
  }

  const isPlanSelected = Boolean(plan)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] via-[#f7f9ff] to-[#f4f5f7] flex flex-col">
      <header className="bg-white/90 backdrop-blur border-b border-[#dbe2f2] px-4 py-4">
        <h1 className="text-base font-semibold text-[#0f172a]">Complete activation payment</h1>
        <p className="text-[11px] mt-1" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Your account is approved. Finish payment to unlock dashboard access.</p>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-2xl w-full mx-auto">
        {loadError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            {loadError}
          </div>
        ) : null}

        <section className={`rounded-3xl p-5 space-y-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${mode === "renewal" ? "bg-gradient-to-br from-[#fff1f2] via-[#fff7ed] to-[#fffbeb] border-2 border-[#fb7185]" : "bg-white border border-[#dbe2f2]"}`}>
          <h2 className="text-xl leading-tight tracking-tight font-semibold text-gray-900">{mode === "onboarding" ? "Onboarding setup" : "Subscription renewal"}</h2>
          {mode === "renewal" ? (
            <div className="rounded-2xl border-2 border-[#fb7185] bg-gradient-to-r from-white to-[#fff7ed] px-4 py-4 min-h-[165px] flex flex-col justify-between shadow-[0_8px_22px_rgba(244,63,94,0.18)]">
              <div>
                <div className="inline-flex items-center rounded-full border border-[#fb7185] bg-[#ffe4e6] px-2.5 py-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#be123c]">Action Required</p>
                </div>
                <p className="text-[14px] leading-6 text-[#881337] mt-3 font-medium">
                  Your subscription has expired. Complete renewal now to restore dashboard access and continue operations.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-3 py-2">
                <span className="text-[11px] text-[#be123c] font-semibold">Last 30 days GMV</span>
                <span className="text-[12px] text-[#881337] font-bold">₹{Number(gmvLast30Days || 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-[13px] leading-6" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>
              Complete the setup with payment to activate your restaurant. The onboarding fee is mandatory.
            </p>
          )}

          {mode === "onboarding" ? (
            <div className="rounded-2xl border border-[#ffc0de] bg-gradient-to-r from-[#fff2f8] to-[#ffe8f3] px-4 py-4">
              <p className="text-lg font-semibold leading-none mb-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Onboarding fee</p>
              <p className="text-xl leading-tight font-semibold mb-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>₹{calc.onboardingFeeBase} + ₹{calc.onboardingGST} (18% GST)</p>
              <p className="text-2xl font-bold leading-none mb-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Total: ₹{calc.onboardingFeeTotal}</p>
              <p className="text-xs" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Mandatory to activate account</p>
            </div>
          ) : null}
          {mode === "onboarding" ? (
            <p className="text-xs" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Last 30 days GMV: ₹{Number(gmvLast30Days || 0).toFixed(2)}</p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white border border-[#dbe2f2] p-4 space-y-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl leading-tight font-semibold text-gray-900">Select subscription plan</h2>
          <p className="text-[13px] leading-6" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>All plans are visible, but your eligible plan is auto-selected and locked by GMV slab.</p>

          {planCatalog.map((catalogPlan) => {
            const total = Number(catalogPlan?.basePrice || 0) + Math.round(Number(catalogPlan?.basePrice || 0) * GST_RATE)
            const title = `${String(catalogPlan?.label || catalogPlan?.id || "").trim()} Plan (₹${Number(catalogPlan?.basePrice || 0)}/mo + 18% GST)`
            const gmvMin = Number(catalogPlan?.gmvMin || 0)
            const gmvMaxRaw = catalogPlan?.gmvMax
            const hasMax = Number.isFinite(Number(gmvMaxRaw))
            const gmvLabel = hasMax
              ? `GMV: ₹${gmvMin.toFixed(2)} - ₹${Number(gmvMaxRaw).toFixed(2)}`
              : `GMV: ₹${gmvMin.toFixed(2)}+`
            const features = [`${String(catalogPlan?.label || catalogPlan?.id || "").trim()} Plan`, "Platform features", "Support included"]
            const p = { id: catalogPlan?.id, title, total, features }
            const selected = plan === p.id
            const attempted = attemptedPlanId === p.id && !selected
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (selected) {
                    setAttemptedPlanId("")
                    setPlanSelectionWarning("")
                    return
                  }
                  setAttemptedPlanId(p.id)
                  setPlanSelectionWarning(`You are eligible for the ${String(plan || "starter").toUpperCase()} plan based on current GMV. Other plans are locked.`)
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200 ${selected ? "border-[#111827] bg-gradient-to-r from-[#f9fbff] to-[#f2f7ff] shadow-[0_8px_24px_rgba(17,24,39,0.10)]" : attempted ? "border-[#ef4444] bg-[#fff5f5] shadow-[0_8px_20px_rgba(239,68,68,0.18)]" : "border-[#d5d8de] bg-white hover:border-[#9aa8c2] hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg leading-tight font-semibold text-gray-900">{p.title}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>{gmvLabel}</p>
                    <p className="text-lg font-semibold leading-none mt-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Total: ₹{p.total}</p>
                    <div className="mt-3 space-y-1">
                      {p.features.map((f) => (
                        <p key={f} className="text-xs" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>• {f}</p>
                      ))}
                    </div>
                  </div>
                  <span className={`mt-1 h-9 w-9 min-h-9 min-w-9 aspect-square shrink-0 rounded-full border-[3px] ${selected ? "border-[#111827] bg-[#111827]" : "border-[#c6cbd4] bg-transparent"}`} />
                </div>
              </button>
            )
          })}
          {planSelectionWarning ? (
            <p className="text-xs text-[#dc2626] font-semibold bg-[#fff1f2] border border-[#fecdd3] rounded-xl px-3 py-2">
              {planSelectionWarning}
            </p>
          ) : null}
        </section>

        {isPlanSelected && (
          <section className="rounded-3xl bg-white border border-[#dbe2f2] p-4 space-y-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl leading-tight font-semibold text-gray-900">Payment option</h2>

            {[{ id: "full", title: "Pay now", desc: mode === "onboarding" ? `Pay onboarding fee (₹${calc.onboardingFeeTotal}) plus the selected subscription plan (₹${calc.subscriptionPlanTotal}) in full now.` : `Pay the selected subscription plan (₹${calc.subscriptionPlanTotal}) in full now.` }, { id: "partial", title: "Pay partial", desc: mode === "onboarding" ? "Pay part of the subscription now. Onboarding fee is always collected." : "Pay part of the subscription now and keep the rest as due." }, { id: "later", title: "Pay later", desc: mode === "onboarding" ? `Pay subscription later. Only onboarding fee (₹${calc.onboardingFeeTotal} with GST) will be collected now.` : "Pay the subscription later. No amount will be collected now." }].map((opt) => {
              const selected = paymentType === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPaymentType(opt.id)
                    if (opt.id !== "partial") setPartialAmount("")
                  }}
                  className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200 ${selected ? "border-[#111827] bg-gradient-to-r from-[#f9fbff] to-[#f2f7ff] shadow-[0_8px_24px_rgba(17,24,39,0.10)]" : "border-[#d5d8de] bg-white hover:border-[#9aa8c2] hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg leading-none font-semibold text-gray-900">{opt.title}</p>
                      <p className="text-xs leading-5 mt-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>{opt.desc}</p>
                      <p className="text-[11px] leading-4 mt-2" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>{paymentInfoContent[opt.id]}</p>
                    </div>
                    <span className={`mt-1 h-8 w-8 min-h-8 min-w-8 aspect-square shrink-0 rounded-full border-[3px] ${selected ? "border-[#111827] bg-[#111827]" : "border-[#c6cbd4] bg-transparent"}`} />
                  </div>
                </button>
              )
            })}

            {paymentType === "partial" && (
              <div>
                <Label className="text-xs text-gray-700 mb-1 block">Enter subscription partial amount</Label>
                <Input
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="bg-white"
                  placeholder={`Enter partial plan base payment (₹1 - ₹${calc.selectedPlanBase})`}
                />
              </div>
            )}
          </section>
        )}

        {isPlanSelected && (
          <section className="rounded-3xl bg-white border border-[#dbe2f2] p-4 space-y-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl leading-tight font-semibold text-gray-900">Payment summary</h2>
            <div className="space-y-2 text-sm" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>
              {mode === "onboarding" ? (
                <>
                  <div className="flex justify-between"><span>Onboarding fee (Base)</span><span className="font-semibold text-black">₹{calc.onboardingFeeBase}</span></div>
                  <div className="flex justify-between"><span>Onboarding GST (18%)</span><span className="font-semibold text-black">₹{calc.onboardingGST}</span></div>
                  <div className="flex justify-between border-b border-[#d5d8de] pb-2"><span className="font-semibold" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Onboarding Total</span><span className="font-semibold text-black">₹{calc.onboardingFeeTotal}</span></div>
                </>
              ) : null}

              <div className="flex justify-between"><span>Subscription ({String(plan || "starter").toUpperCase()} Plan) Base</span><span className="font-semibold text-black">₹{calc.selectedPlanBase}</span></div>
              <div className="flex justify-between"><span>Subscription GST (18%)</span><span className="font-semibold text-black">₹{calc.selectedPlanGST}</span></div>
              <div className="flex justify-between border-b border-[#d5d8de] pb-2"><span className="font-semibold" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Subscription Total</span><span className="font-semibold text-black">₹{calc.subscriptionPlanTotal}</span></div>

              <p className="text-xs font-semibold tracking-wide pt-1" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>BREAKDOWN OF PAY NOW</p>
              {mode === "onboarding" ? (
                <div className="flex justify-between"><span>Onboarding (Total)</span><span className="font-semibold text-black">₹{calc.onboardingFeeTotal}</span></div>
              ) : null}
              <div className="flex justify-between"><span>Subscription (Pay now) Base</span><span className="font-semibold text-black">₹{calc.subscriptionPaidNowBase}</span></div>
              <div className="flex justify-between"><span>Subscription (Pay now) GST</span><span className="font-semibold text-black">₹{calc.subscriptionPaidNowGST}</span></div>
              <div className="flex justify-between border-t border-[#fac0df] pt-2"><span className="text-base font-semibold" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Total to pay now</span><span className="text-base font-semibold" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>₹{calc.payableNow}</span></div>
              <div className="flex justify-between pt-1">
                <span className="text-xs" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>Remaining due later (inc. GST)</span>
                <span className="text-xs font-semibold" style={{ color: STATIC_SUBSCRIPTION_COLOR }}>₹{calc.subscriptionDueLaterTotal}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between max-w-2xl w-full mx-auto">
        <Button variant="ghost" className="text-base text-gray-600" onClick={() => navigate("/food/restaurant/login", { replace: true })}>Back</Button>
        <Button
          onClick={handleCreateOrder}
          disabled={processing}
          className="bg-black text-white hover:bg-black/90 rounded-xl px-6 py-5 text-base"
        >
          {processing ? "Processing..." : "Finish & Pay"}
        </Button>
      </footer>
    </div>
  )
}
