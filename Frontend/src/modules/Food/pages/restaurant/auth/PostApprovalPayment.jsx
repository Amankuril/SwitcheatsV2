import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { restaurantAPI } from "@food/api"
import { getModuleToken, getModuleRefreshToken, setAuthData as setModuleAuthData } from "@food/utils/auth"
import { toast } from "sonner"

const GST_RATE = 0.18

export default function PostApprovalPayment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [settings, setSettings] = useState(null)
  const [paymentType, setPaymentType] = useState("full")
  const [partialAmount, setPartialAmount] = useState("")
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [restaurantRes, settingsRes] = await Promise.all([
          restaurantAPI.getCurrentRestaurant(),
          restaurantAPI.getSubscriptionSettings(),
        ])

        if (!mounted) return

        const restaurant = restaurantRes?.data?.data?.restaurant || restaurantRes?.data?.restaurant
        if (restaurant?.onboardingFeePaid) {
          navigate("/food/restaurant", { replace: true })
          return
        }

        const s = settingsRes?.data?.data || null
        if (!s) throw new Error("Subscription settings missing")
        setSettings(s)
      } catch {
        toast.error("Failed to load payment details")
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

    const silverPrice = Number(settings.silverPrice || 999)
    const goldPrice = Number(settings.goldPrice || 1999)
    const onboardingFeeBase = Number(settings.onboardingFee || 799)

    const selectedPlanBase = plan === "gold" ? goldPrice : silverPrice
    const selectedPlanGST = Math.round(selectedPlanBase * GST_RATE)
    const subscriptionPlanTotal = selectedPlanBase + selectedPlanGST

    const onboardingGST = Math.round(onboardingFeeBase * GST_RATE)
    const onboardingFeeTotal = onboardingFeeBase + onboardingGST

    const partialBase = Number(partialAmount || 0)
    let subscriptionPaidNowBase = 0

    if (paymentType === "full") subscriptionPaidNowBase = selectedPlanBase
    if (paymentType === "partial") subscriptionPaidNowBase = Math.max(0, Math.min(partialBase, selectedPlanBase))

    const subscriptionPaidNowGST = Math.round(subscriptionPaidNowBase * GST_RATE)
    const subscriptionPaidNowTotal = subscriptionPaidNowBase + subscriptionPaidNowGST
    const subscriptionDueLaterTotal = Math.max(0, subscriptionPlanTotal - subscriptionPaidNowTotal)
    const payableNow = onboardingFeeTotal + subscriptionPaidNowTotal

    return {
      silverPrice,
      goldPrice,
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
  }, [settings, plan, paymentType, partialAmount])

  const handleCreateOrder = async () => {
    if (!plan || !calc) {
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

  if (loading || !calc) {
    return (
      <div className="min-h-screen bg-[#E6E6E9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-600">Loading payment details...</div>
      </div>
    )
  }

  const isPlanSelected = Boolean(plan)

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-base font-semibold text-gray-900">Complete activation payment</h1>
        <p className="text-[11px] text-gray-500 mt-1">Your account is approved. Finish payment to unlock dashboard access.</p>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-2xl w-full mx-auto">
        <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl leading-tight tracking-tight font-semibold text-gray-900">Onboarding setup</h2>
          <p className="text-[13px] leading-6 text-gray-600">
            Complete the setup with payment to activate your restaurant. The onboarding fee is mandatory.
          </p>

          <div className="rounded-2xl border border-[#fac0df] bg-[#fff0f7] px-4 py-4 text-[#FA0272]">
            <p className="text-lg font-semibold leading-none mb-2">Onboarding fee</p>
            <p className="text-xl leading-tight font-semibold mb-2">₹{calc.onboardingFeeBase} + ₹{calc.onboardingGST} (18% GST)</p>
            <p className="text-2xl font-bold leading-none mb-2">Total: ₹{calc.onboardingFeeTotal}</p>
            <p className="text-xs">Mandatory to activate account</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl leading-tight font-semibold text-gray-900">Select subscription plan</h2>
          <p className="text-[13px] leading-6 text-gray-600">Choose one of the plans below and then select how much you want to pay now.</p>

          {[{ id: "silver", title: `Silver Plan (₹${calc.silverPrice}/mo + 18% GST)`, total: calc.silverPrice + Math.round(calc.silverPrice * GST_RATE), features: ["Silver Plan", "Basic features", "Standard support"] }, { id: "gold", title: `Gold Plan (₹${calc.goldPrice}/mo + 18% GST)`, total: calc.goldPrice + Math.round(calc.goldPrice * GST_RATE), features: ["Gold Plan", "Premium features", "Priority support"] }].map((p) => {
            const selected = plan === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlan(p.id)
                  setPaymentType("full")
                  setPartialAmount("")
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-left bg-white ${selected ? "border-black" : "border-[#d5d8de]"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg leading-tight font-semibold text-gray-900">{p.title}</p>
                    <p className="text-lg font-semibold leading-none text-[#2f4564] mt-2">Total: ₹{p.total}</p>
                    <div className="mt-3 space-y-1">
                      {p.features.map((f) => (
                        <p key={f} className="text-xs text-gray-600">• {f}</p>
                      ))}
                    </div>
                  </div>
                  <span className={`mt-1 h-9 w-9 rounded-full border-[3px] ${selected ? "border-black bg-black" : "border-[#c6cbd4] bg-transparent"}`} />
                </div>
              </button>
            )
          })}
        </section>

        {isPlanSelected && (
          <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl leading-tight font-semibold text-gray-900">Payment option</h2>

            {[{ id: "full", title: "Pay now", desc: `Pay onboarding fee (₹${calc.onboardingFeeTotal}) plus the selected subscription plan (₹${calc.subscriptionPlanTotal}) in full now.` }, { id: "partial", title: "Pay partial", desc: "Pay part of the subscription now. Onboarding fee is always collected." }, { id: "later", title: "Pay later", desc: `Pay subscription later. Only onboarding fee (₹${calc.onboardingFeeTotal} with GST) will be collected now.` }].map((opt) => {
              const selected = paymentType === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPaymentType(opt.id)
                    if (opt.id !== "partial") setPartialAmount("")
                  }}
                  className={`w-full rounded-2xl border-2 px-4 py-4 text-left bg-white ${selected ? "border-black" : "border-[#d5d8de]"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg leading-none font-semibold text-gray-900">{opt.title}</p>
                      <p className="text-xs leading-5 text-gray-600 mt-2">{opt.desc}</p>
                    </div>
                    <span className={`mt-1 h-8 w-8 rounded-full border-[3px] ${selected ? "border-black bg-black" : "border-[#c6cbd4] bg-transparent"}`} />
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
          <section className="rounded-2xl bg-white border border-gray-200 p-4 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl leading-tight font-semibold text-gray-900">Payment summary</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Onboarding fee (Base)</span><span className="font-semibold text-black">₹{calc.onboardingFeeBase}</span></div>
              <div className="flex justify-between"><span>Onboarding GST (18%)</span><span className="font-semibold text-black">₹{calc.onboardingGST}</span></div>
              <div className="flex justify-between border-b border-[#d5d8de] pb-2"><span className="font-semibold text-[#2d405f]">Onboarding Total</span><span className="font-semibold text-black">₹{calc.onboardingFeeTotal}</span></div>

              <div className="flex justify-between"><span>Subscription ({plan === "gold" ? "Gold" : "Silver"} Plan) Base</span><span className="font-semibold text-black">₹{calc.selectedPlanBase}</span></div>
              <div className="flex justify-between"><span>Subscription GST (18%)</span><span className="font-semibold text-black">₹{calc.selectedPlanGST}</span></div>
              <div className="flex justify-between border-b border-[#d5d8de] pb-2"><span className="font-semibold text-[#2d405f]">Subscription Total</span><span className="font-semibold text-black">₹{calc.subscriptionPlanTotal}</span></div>

              <p className="text-xs font-semibold text-[#6a7487] tracking-wide pt-1">BREAKDOWN OF PAY NOW</p>
              <div className="flex justify-between"><span>Onboarding (Total)</span><span className="font-semibold text-black">₹{calc.onboardingFeeTotal}</span></div>
              <div className="flex justify-between"><span>Subscription (Pay now) Base</span><span className="font-semibold text-black">₹{calc.subscriptionPaidNowBase}</span></div>
              <div className="flex justify-between"><span>Subscription (Pay now) GST</span><span className="font-semibold text-black">₹{calc.subscriptionPaidNowGST}</span></div>
              <div className="flex justify-between border-t border-[#fac0df] pt-2"><span className="text-base font-semibold text-[#2d405f]">Total to pay now</span><span className="text-base font-semibold text-[#FA0272]">₹{calc.payableNow}</span></div>
              <div className="flex justify-between pt-1">
                <span className="text-xs text-[#6a7487]">Remaining due later (inc. GST)</span>
                <span className="text-xs font-semibold text-[#6a7487]">₹{calc.subscriptionDueLaterTotal}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between max-w-2xl w-full mx-auto">
        <Button variant="ghost" className="text-base text-gray-600" onClick={() => navigate("/food/restaurant/login", { replace: true })}>Back</Button>
        <Button
          onClick={handleCreateOrder}
          disabled={!isPlanSelected || processing}
          className="bg-black text-white hover:bg-black/90 rounded-xl px-6 py-5 text-base"
        >
          {processing ? "Processing..." : "Finish & Pay"}
        </Button>
      </footer>
    </div>
  )
}
