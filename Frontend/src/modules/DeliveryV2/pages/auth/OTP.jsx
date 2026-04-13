import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, Timer, RefreshCw, AlertCircle, ShieldCheck, User } from "lucide-react"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { deliveryAPI } from "@food/api"
import { setAuthData as storeAuthData } from "@food/utils/auth"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { motion, AnimatePresence } from "framer-motion"

export default function DeliveryOTP() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [verifiedOtp, setVerifiedOtp] = useState("")
  const [pendingMessage, setPendingMessage] = useState("")
  const [isRejected, setIsRejected] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [deviceToken, setDeviceToken] = useState(null)
  const [activePlatform, setActivePlatform] = useState("web")
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    const stored = sessionStorage.getItem("deliveryAuthData")
    if (stored) {
      setAuthData(JSON.parse(stored))
    } else {
      const token = localStorage.getItem("delivery_accessToken")
      const authenticated = localStorage.getItem("delivery_authenticated") === "true"
      if (token && authenticated) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          if (payload.exp > Math.floor(Date.now() / 1000)) {
            navigate("/food/delivery", { replace: true })
            return
          }
        } catch (e) {}
      }
      navigate("/food/delivery/login", { replace: true })
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

  useEffect(() => {
    if (inputRefs.current[0] && otp.every(digit => digit === "")) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [otp])

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")
    if (value && index < 3) inputRefs.current[index + 1]?.focus()
    if (!showNameInput && newOtp.every((digit) => digit !== "") && newOtp.length === 4) {
      handleVerify(newOtp.join(""))
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
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => { if (i < 4) newOtp[i] = digit })
    setOtp(newOtp)
    if (!showNameInput && digits.length === 4) handleVerify(newOtp.join(""))
    else inputRefs.current[digits.length]?.focus()
  }

  const handleVerify = async (otpValue = null) => {
    if (showNameInput) return
    const code = otpValue || otp.join("")
    if (code.length !== 4) return
    setIsLoading(true)
    setError("")
    try {
      const phone = authData?.phone
      const purpose = authData?.purpose || "login"
      let fcmToken = null;
      let platform = "web";
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            const hN = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"];
            for (const n of hN) {
              try {
                const t = await window.flutter_inappwebview.callHandler(n, { module: "delivery" });
                if (t?.length > 20) { fcmToken = t.trim(); break; }
              } catch (e) {}
            }
          } else { fcmToken = localStorage.getItem("fcm_web_registered_token_delivery") || null; }
        }
      } catch (e) {}
      setDeviceToken(fcmToken);
      setActivePlatform(platform);

      const response = await deliveryAPI.verifyOTP(phone, code, purpose, null, fcmToken, platform)
      const data = response?.data?.data || response?.data || {}
      if (data.pendingApproval === true) {
        setIsLoading(false); setPendingMessage(data.message); setIsRejected(data.isRejected || false); setRejectionReason(data.rejectionReason || "");
        return
      }
      if (data.needsRegistration === true) {
        sessionStorage.removeItem("deliveryAuthData")
        sessionStorage.setItem("deliveryNeedsRegistration", "true")
        sessionStorage.setItem("deliverySignupDetails", JSON.stringify({ name: "", phone: phone.replace(/\D/g, "").slice(-10), countryCode: "+91" }))
        setIsLoading(false); navigate("/food/delivery/signup/details", { replace: true });
        return
      }
      const { accessToken, refreshToken, user } = data
      if (accessToken && user) {
        storeAuthData("delivery", accessToken, user, refreshToken)
        window.dispatchEvent(new Event("deliveryAuthChanged"))
        setTimeout(() => navigate("/food/delivery", { replace: true }), 500)
      }
    } catch (err) { setError(err?.response?.data?.message || "Invalid OTP."); setIsLoading(false); }
  }

  const handleSubmitName = async () => {
    if (!name.trim()) { setNameError("Name required"); return; }
    setIsLoading(true); setError(""); try {
      const response = await deliveryAPI.verifyOTP(authData?.phone, verifiedOtp, authData?.purpose || "login", name.trim(), deviceToken, activePlatform)
      const { accessToken, refreshToken, user } = response?.data?.data || response?.data || {}
      if (accessToken && user) {
        storeAuthData("delivery", accessToken, user, refreshToken)
        window.dispatchEvent(new Event("deliveryAuthChanged"))
        navigate("/food/delivery", { replace: true })
      }
    } catch (err) { setError("Failed to complete setup."); } finally { setIsLoading(false); }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setIsLoading(true); setError("")
    try { await deliveryAPI.sendOTP(authData?.phone, authData?.purpose || "login"); setResendTimer(60); }
    catch (err) { setError("Resend failed."); } finally { setIsLoading(false); }
    setOtp(["", "", "", ""]); setShowNameInput(false); setName(""); setVerifiedOtp("")
  }

  if (!authData) return null

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[60%] h-[60%] rounded-full bg-[#00B761]/5 blur-[120px]" />
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
            onClick={() => navigate("/food/delivery/login")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5 text-[#00B761]" />
          </button>
          <span className="ml-3 font-black text-[10px] uppercase tracking-[0.3em] text-zinc-900 dark:text-white pt-0.5">
            Fleet Access Gate
          </span>
        </div>

        <div className="p-8 sm:p-10 space-y-8">
          <AnimatePresence mode="wait">
            {!pendingMessage ? (
              <motion.div 
                key="otp-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight italic uppercase">
                    {showNameInput ? "One Last Step" : "Ride Check"}
                  </h2>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
                    {showNameInput ? "Enter your name to initialize profile" : <>A passcode was sent to <span className="text-[#00B761] font-black">{authData.phone}</span></>}
                  </p>
                </div>

                {!showNameInput ? (
                  <div className="space-y-8">
                    <div className="flex justify-center gap-3 sm:gap-4">
                      {otp.map((digit, index) => (
                        <input
                          key={index} ref={(el) => (inputRefs.current[index] = el)}
                          type="text" inputMode="numeric" maxLength={1} value={digit}
                          onChange={(e) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          onFocus={() => setFocusedIndex(index)}
                          className={`w-14 h-16 bg-zinc-100/50 dark:bg-zinc-800/80 border-2 rounded-2xl text-center text-3xl font-black text-zinc-900 dark:text-white transition-all duration-300 ${
                            error ? "border-red-500 bg-red-50/50" : focusedIndex === index ? "border-[#00B761] ring-4 ring-[#00B761]/10 shadow-lg" : "border-zinc-100 dark:border-zinc-800"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex justify-center">
                      {resendTimer > 0 ? (
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <Timer className="w-4 h-4 text-[#00B761]" />
                          RE-PULSE IN <span className="text-[#00B761]">{resendTimer}S</span>
                        </div>
                      ) : (
                        <button onClick={handleResend} className="flex items-center gap-2 text-[#00B761] font-black text-[10px] tracking-widest uppercase hover:underline">
                          <RefreshCw className="w-4 h-4" /> RESEND PIN
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#00B761] transition-colors" />
                        <Input
                          type="text" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }}
                          placeholder="Your Full Name"
                          className="h-16 pl-12 pr-6 bg-zinc-100/50 dark:bg-zinc-800/80 border-0 rounded-2xl text-lg font-bold placeholder:text-zinc-400 focus:ring-4 focus:ring-[#00B761]/10"
                        />
                     </div>
                     {nameError && <p className="text-[11px] font-black text-red-500 uppercase tracking-widest ml-4 italic">{nameError}</p>}
                     <Button onClick={handleSubmitName} disabled={isLoading} className="w-full h-16 rounded-2xl font-black text-base bg-[#00B761] hover:bg-[#009049] text-white shadow-[0_12px_32px_rgba(0,183,97,0.3)] active:scale-95">
                        Initialize Start
                     </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="pending-step" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isRejected ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"}`}>
                   {isRejected ? <AlertCircle size={40} /> : <ShieldCheck size={40} />}
                </div>
                <div className="space-y-2">
                   <h3 className={`text-xl font-black italic uppercase ${isRejected ? "text-red-600" : "text-amber-600"}`}>
                      {isRejected ? "Application Denied" : "Verification in Progress"}
                   </h3>
                   <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {pendingMessage}
                   </p>
                </div>
                {isRejected && rejectionReason && (
                   <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Feedback</p>
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium italic">"{rejectionReason}"</p>
                   </div>
                )}
                <div className="pt-4 flex flex-col gap-3">
                   {isRejected && (
                      <Button onClick={() => navigate("/food/delivery/signup/details")} className="w-full h-14 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white">RE-APPLY NOW</Button>
                   )}
                   <button onClick={() => navigate("/food/delivery/login")} className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] hover:text-[#00B761] transition-colors">BACK TO LOGIN</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-[11px] font-black text-[#00B761] bg-[#00B761]/5 py-3 px-4 rounded-xl border border-[#00B761]/10 uppercase tracking-widest italic"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}

          {isLoading && !showNameInput && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 text-[#00B761] animate-spin" />
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 tracking-[0.4em] uppercase">
            SECURE FLEET AUTHENTICATION &bull; {companyName.toUpperCase()}
          </p>
        </div>
      </motion.div>
    </div>
  )
}


