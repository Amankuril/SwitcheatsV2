import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { restaurantAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { motion, AnimatePresence } from "framer-motion"

const DEFAULT_COUNTRY_CODE = "+91"

export default function RestaurantLogin() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const phoneInputRef = useRef(null)
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("restaurantLoginPhone")
    return {
      phone: saved || "",
      countryCode: DEFAULT_COUNTRY_CODE,
    }
  })
  const [error, setError] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)

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

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: value }))
    sessionStorage.setItem("restaurantLoginPhone", value)
    if (error) setError(validatePhone(value))
  }

  const handleSendOTP = async () => {
    const phoneError = validatePhone(formData.phone)
    if (phoneError) {
      setError(phoneError)
      return
    }

    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      setIsSending(true)
      await restaurantAPI.sendOTP(fullPhone, "login")
      sessionStorage.setItem("restaurantAuthData", JSON.stringify({
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        module: "restaurant",
      }))
      navigate("/food/restaurant/otp")
    } catch (apiErr) {
      setError(apiErr?.response?.data?.message || "Failed to send OTP")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full bg-[#FA0272]/5 blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[10%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/5 blur-[100px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden border border-white/50 dark:border-white/5"
        style={{ marginBottom: keyboardInset ? `${keyboardInset}px` : 0 }}
      >
        {/* Visual Brand Header */}
        <div className="h-40 bg-gradient-to-br from-[#FA0272] to-[#D40261] relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-24 h-24 rounded-full bg-white -translate-x-12 -translate-y-12" />
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-white translate-x-16 translate-y-16" />
          </div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-white/20 transform rotate-12"
          >
            <ShieldCheck className="w-10 h-10 text-[#FA0272] -rotate-12" />
          </motion.div>
        </div>

        <div className="px-8 py-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight lowercase">
              {companyName} <span className="text-[#FA0272]">partner</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em]">
              Authorized Access Only
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ml-1">
                Link to your restaurant
              </label>
              
              <div className="flex items-center gap-0 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:border-[#FA0272]/40 focus-within:ring-4 focus-within:ring-[#FA0272]/10 transition-all overflow-hidden">
                <div className="flex items-center px-4 h-16 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white font-bold text-xl">
                  <span>+91</span>
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="Mobile number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="flex-1 h-16 bg-transparent border-0 outline-none ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 text-lg font-black tracking-[0.1em] px-5 text-zinc-900 dark:text-white"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#FA0272] pl-2"
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
              className="w-full h-16 rounded-2xl font-black text-base tracking-widest uppercase transition-all duration-300 bg-[#FA0272] hover:bg-[#D40261] text-white shadow-[0_12px_32px_rgba(250,2,114,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                "Continue Securely"
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              By entering, you confirm registration under
              <br />
              <button 
                onClick={() => navigate("/food/restaurant/terms")}
                className="text-[#FA0272] font-black hover:underline"
              >
                TERMS
              </button>
              {" & "}
              <button 
                onClick={() => navigate("/food/restaurant/privacy")}
                className="text-[#FA0272] font-black hover:underline"
              >
                PRIVACY POLICY
              </button>
            </p>
          </div>
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 tracking-[0.4em] uppercase">
            &copy; {new Date().getFullYear()} {companyName.toUpperCase()} PARTNER NETWORK
          </p>
        </div>
      </motion.div>
    </div>
  )
}
