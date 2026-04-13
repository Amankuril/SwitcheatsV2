import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { deliveryAPI } from "@food/api"
import { clearModuleAuth } from "@food/utils/auth"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { motion, AnimatePresence } from "framer-motion"
import { Bike, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@food/components/ui/button"

export default function DeliverySignIn() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const phoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91",
  })
  const [error, setError] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)

  useEffect(() => {
    const stored = sessionStorage.getItem("deliveryAuthData")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.phone) {
          const phoneDigits = data.phone.replace("+91", "").trim()
          setFormData(prev => ({ ...prev, phone: phoneDigits }))
        }
      } catch (err) {}
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return undefined
    const updateKeyboardInset = () => {
      const viewport = window.visualViewport
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardInset(inset > 0 ? inset : 0)
    }
    updateKeyboardInset()
    window.visualViewport.addEventListener("resize", updateKeyboardInset)
    window.visualViewport.addEventListener("scroll", updateKeyboardInset)
    return () => {
      window.visualViewport.removeEventListener("resize", updateKeyboardInset)
      window.visualViewport.removeEventListener("scroll", updateKeyboardInset)
    }
  }, [])

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === "") return "Phone number required"
    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length !== 10) return "Must be 10 digits"
    if (!["6", "7", "8", "9"].includes(digitsOnly[0])) return "Invalid number"
    return ""
  }

  const handleSendOTP = async () => {
    setError("")
    const phoneError = validatePhone(formData.phone)
    if (phoneError) {
      setError(phoneError)
      return
    }

    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      setIsSending(true)
      clearModuleAuth("delivery")
      await deliveryAPI.sendOTP(fullPhone, "login")
      sessionStorage.setItem("deliveryAuthData", JSON.stringify({
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        purpose: "login",
        module: "delivery",
      }))
      navigate("/food/delivery/otp")
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send OTP")
    } finally {
      setIsSending(false)
    }
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setFormData(prev => ({ ...prev, phone: value }))
    if (error) setError(validatePhone(value))
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[15%] -left-[10%] w-[90%] h-[90%] rounded-full bg-[#00B761]/5 blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[15%] -right-[10%] w-[80%] h-[80%] rounded-full bg-blue-500/5 blur-[100px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden border border-white/50 dark:border-white/5"
        style={{ marginBottom: keyboardInset ? `${keyboardInset}px` : 0 }}
      >
        {/* Delivery Brand Header */}
        <div className="h-44 bg-gradient-to-br from-[#00B761] to-[#009049] relative flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 50 Q 25 25 50 50 T 100 50" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M0 70 Q 25 45 50 70 T 100 70" fill="none" stroke="white" strokeWidth="0.5" />
            </svg>
          </div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-20 h-20 bg-white rounded-[24px] shadow-2xl flex items-center justify-center mb-3 transform -rotate-12 border-4 border-white/50"
          >
            <Bike className="w-10 h-10 text-[#00B761] rotate-12" />
          </motion.div>
          <div className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Delivery Executive</span>
          </div>
        </div>

        <div className="px-8 py-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none italic">
              {companyName} <span className="text-[#00B761]">ride</span>
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em]">
              Start your shift now
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ml-1">
                Identity Verification
              </label>
              
              <div className="flex items-center gap-0 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:border-[#00B761]/40 focus-within:ring-4 focus-within:ring-[#00B761]/10 transition-all overflow-hidden h-16">
                <div className="px-5 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white font-black text-lg h-full flex items-center">
                  +91
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="Linked Mobile"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="flex-1 bg-transparent border-0 outline-none ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 text-lg font-black tracking-widest px-5 text-zinc-900 dark:text-white h-full"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#00B761] pl-2"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={handleSendOTP}
              disabled={isSending || formData.phone.length !== 10}
              className="w-full h-16 rounded-2xl font-black text-base tracking-widest uppercase transition-all duration-300 bg-[#00B761] hover:bg-[#009049] text-white shadow-[0_12px_32px_rgba(0,183,97,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Checking...</span>
                </div>
              ) : (
                "Go Online"
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              Acceptance of delivery protocols required.
              <br />
              <Link to="/food/delivery/terms" className="text-[#00B761] font-black hover:underline tracking-widest">
                VIEW CHARTER
              </Link>
            </p>
          </div>
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 tracking-[0.4em] uppercase">
            &copy; {new Date().getFullYear()} {companyName.toUpperCase()} FLEET OPERATOR
          </p>
        </div>
      </motion.div>
    </div>
  )
}
