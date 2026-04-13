import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ShieldCheck, Timer, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { restaurantAPI } from "@food/api"
import {
  setAuthData as setRestaurantAuthData,
  setRestaurantPendingPhone,
} from "@food/utils/auth"
import { checkOnboardingStatus, isRestaurantOnboardingComplete } from "@food/utils/onboardingUtils"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { motion, AnimatePresence } from "framer-motion"

export default function RestaurantOTP() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [contactInfo, setContactInfo] = useState("") 
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const inputRefs = useRef([])
  const hasSubmittedRef = useRef(false)
  const otpSectionRef = useRef(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("restaurantAuthData")
    if (stored) {
      const data = JSON.parse(stored)
      setAuthData(data)
      if (data.method === "email" && data.email) {
        setContactInfo(data.email)
      } else if (data.phone) {
        const phoneMatch = data.phone?.match(/(\+\d+)\s*(.+)/)
        setContactInfo(phoneMatch ? `${phoneMatch[1]} ${phoneMatch[2].replace(/\D/g, "")}` : (data.phone || ""))
      }
    } else {
      navigate("/food/restaurant/login")
      return
    }

    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const viewport = window.visualViewport
    if (!viewport) return
    const updateKeyboardState = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height)
      setKeyboardOffset(keyboardHeight > 120 ? keyboardHeight : 0)
    }
    updateKeyboardState()
    viewport.addEventListener("resize", updateKeyboardState)
    viewport.addEventListener("scroll", updateKeyboardState)
    return () => {
      viewport.removeEventListener("resize", updateKeyboardState)
      viewport.removeEventListener("scroll", updateKeyboardState)
    }
  }, [])

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((digit) => digit !== "") && newOtp.length === 4) {
      if (!hasSubmittedRef.current) {
        hasSubmittedRef.current = true
        handleVerify(newOtp.join(""))
      }
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => { if (i < 4) newOtp[i] = digit })
    setOtp(newOtp)
    if (digits.length === 4) handleVerify(newOtp.join(""))
    else inputRefs.current[digits.length]?.focus()
  }

  const handleVerify = async (otpValue = null) => {
    const code = otpValue || otp.join("")
    if (hasSubmittedRef.current && !otpValue) return
    if (code.length !== 4) {
      setError("Please enter the complete 4-digit code")
      hasSubmittedRef.current = false
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (!authData) throw new Error("Session expired.")
      const phone = authData.method === "phone" ? authData.phone : null
      const email = authData.method === "email" ? authData.email : null
      const purpose = authData.isSignUp ? "register" : "login"

      const response = await restaurantAPI.verifyOTP(phone, code, purpose, null, email)
      const data = response?.data?.data || response?.data
      const needsRegistration = data?.needsRegistration === true
      const normalizedPhone = data?.phone || phone

      if (needsRegistration) {
        setRestaurantPendingPhone(normalizedPhone)
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem("restaurantLoginPhone")
        navigate("/food/restaurant/onboarding", { replace: true })
        return
      }

      const accessToken = data?.accessToken
      const refreshToken = data?.refreshToken ?? null
      const restaurant = data?.user ?? data?.restaurant

      if (accessToken && restaurant) {
        setRestaurantAuthData("restaurant", accessToken, restaurant, refreshToken)
        window.dispatchEvent(new Event("restaurantAuthChanged"))
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem("restaurantLoginPhone")

        setTimeout(async () => {
          if (authData?.isSignUp) {
            navigate("/food/restaurant/onboarding", { replace: true })
          } else {
            try {
              if (!isRestaurantOnboardingComplete(restaurant)) {
                const incompleteStep = await checkOnboardingStatus()
                if (incompleteStep) {
                  navigate(`/food/restaurant/onboarding?step=${incompleteStep}`, { replace: true })
                  return
                }
              }
              navigate("/food/restaurant", { replace: true })
            } catch (err) { navigate("/food/restaurant", { replace: true }) }
          }
        }, 500)
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Invalid OTP."
      if (/pending approval/i.test(message)) {
        const pendingPhone = authData?.phone || authData?.email || contactInfo
        if (pendingPhone) setRestaurantPendingPhone(pendingPhone)
        sessionStorage.removeItem("restaurantAuthData")
        sessionStorage.removeItem("restaurantLoginPhone")
        navigate("/food/restaurant/pending-verification", {
          replace: true, state: { phone: pendingPhone || "" },
        })
        return
      }
      setError(message)
      setOtp(["", "", "", ""])
      hasSubmittedRef.current = false
      inputRefs.current[0]?.focus()
    } finally { setIsLoading(false) }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setIsLoading(true)
    setError("")
    try {
      if (!authData) throw new Error("Session expired.")
      const purpose = authData.isSignUp ? "register" : "login"
      const phone = authData.method === "phone" ? authData.phone : null
      const email = authData.method === "email" ? authData.email : null
      await restaurantAPI.sendOTP(phone, purpose, email)
      setResendTimer(60)
    } catch (err) { setError("Failed to resend OTP.") }
    setIsLoading(false)
    setOtp(["", "", "", ""])
    inputRefs.current[0]?.focus()
  }

  if (!authData) return null

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[60%] h-[60%] rounded-full bg-[#FA0272]/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[420px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden border border-white/50 dark:border-white/5"
        style={{ marginBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 0 }}
      >
        <div className="flex items-center px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => navigate("/food/restaurant/login")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group"
          >
            <ArrowLeft className="h-5 w-5 text-[#FA0272] group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <span className="ml-3 font-black text-[10px] uppercase tracking-[0.3em] text-zinc-900 dark:text-white pt-0.5">
            Security Check
          </span>
        </div>

        <div className="p-8 sm:p-10 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none italic">
              Verify OTP
            </h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
              We've sent a code to <span className="text-[#FA0272] font-black">{contactInfo}</span>
            </p>
          </div>

          <div className="space-y-8">
            <div ref={otpSectionRef} className="flex justify-center gap-3 sm:gap-4">
              {otp.map((digit, index) => (
                <motion.input
                  key={index}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  disabled={isLoading}
                  className={`w-14 h-16 bg-zinc-100/50 dark:bg-zinc-800/80 border-2 rounded-2xl text-center text-3xl font-black text-zinc-900 dark:text-white transition-all duration-300 ${
                    error 
                      ? "border-red-500 bg-red-50/50" 
                      : focusedIndex === index 
                        ? "border-[#FA0272] ring-4 ring-[#FA0272]/10 shadow-lg" 
                        : "border-zinc-100 dark:border-zinc-800"
                  }`}
                />
              ))}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center justify-center gap-2 text-[11px] font-black text-[#FA0272] bg-[#FA0272]/5 py-3 px-4 rounded-xl border border-[#FA0272]/10 uppercase tracking-widest italic"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <Button
                onClick={() => handleVerify()}
                disabled={isLoading || otp.some(d => !d)}
                className="w-full h-16 rounded-2xl font-black text-base tracking-widest uppercase transition-all duration-300 bg-[#FA0272] hover:bg-[#D40261] text-white shadow-[0_12px_32px_rgba(250,2,114,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                {isLoading ? "Validating..." : "Connect Account"}
              </Button>

              <div className="flex justify-center">
                {resendTimer > 0 ? (
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    <Timer className="w-4 h-4 text-[#FA0272]" />
                    RESEND IN <span className="text-[#FA0272]">{resendTimer}S</span>
                  </div>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-[#FA0272] font-black text-[10px] tracking-[0.3em] uppercase hover:underline"
                  >
                    <RefreshCw className="w-4 h-4" />
                    RESEND CODE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 tracking-[0.4em] uppercase">
            SECURE VERIFICATION GATEWAY &bull; {companyName.toUpperCase()}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
