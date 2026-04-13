import { useState, useEffect, useRef } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { AlertCircle, Loader2 } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { authAPI } from "@food/api"
import loginBanner from "@food/assets/loginbanner.png"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91", // required; default +91 for India
  })

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("userAuthData")
    if (!stored) return

    try {
      const data = JSON.parse(stored)
      const fullPhone = String(data.phone || "").trim()
      const phoneDigits = fullPhone.replace(/^\+91\s*/, "").replace(/\D/g, "").slice(0, 10)

      setFormData((prev) => ({
        ...prev,
        phone: phoneDigits || prev.phone,
      }))
    } catch (err) {
      debugError("Error parsing stored auth data:", err)
    }
  }, [])

  const validatePhone = (phone) => {
    if (!phone.trim()) return "Phone number is required"
    const cleanPhone = phone.replace(/\D/g, "")
    if (!/^\d{10}$/.test(cleanPhone)) return "Phone number must be exactly 10 digits"
    return ""
  }

  const handleChange = (e) => {
    const { name } = e.target
    let { value } = e.target

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10)
      setError(validatePhone(value))
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phoneError = validatePhone(formData.phone)
    setError(phoneError)
    if (phoneError) return
    if (submittingRef.current) return
    submittingRef.current = true
    setIsLoading(true)
    setError("")

    try {
      const countryCode = formData.countryCode?.trim() || "+91"
      const phoneDigits = String(formData.phone ?? "").replace(/\D/g, "").slice(0, 10)
      if (phoneDigits.length !== 10) {
        setError("Phone number must be exactly 10 digits")
        setIsLoading(false)
        submittingRef.current = false
        return
      }
      const fullPhone = `${countryCode} ${phoneDigits}`
      await authAPI.sendOTP(fullPhone, "login", null)

      const ref = String(searchParams.get("ref") || "").trim()
      const authData = {
        method: "phone",
        phone: fullPhone,
        email: null,
        name: null,
        referralCode: ref || null,
        isSignUp: false,
        module: "user",
      }

      sessionStorage.setItem("userAuthData", JSON.stringify(authData))
      navigate("/food/user/auth/otp")
    } catch (apiError) {
      const message =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Antigravity Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#FA0272]/10 blur-[120px]"
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#FA0272]/5 blur-[100px]"
        />
      </div>

      {/* Desktop Banner Background */}
      <div className="fixed inset-0 z-0 hidden lg:block opacity-20 pointer-events-none">
        <img src={loginBanner} alt="" className="w-full h-full object-cover blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/40 to-white/10 dark:from-black dark:via-black/60 dark:to-transparent" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden border border-white/50 dark:border-white/5"
      >
        {/* Banner Section (Visual Header) */}
        <div className="w-full h-[140px] relative overflow-hidden">
          <img src={loginBanner} alt="Food Banner" className="w-full h-full object-cover scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-zinc-900/80 via-white/20 dark:via-zinc-900/20 to-transparent" />
          
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
              <span className="text-[#FA0272] font-black text-xl italic leading-none">S</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Signin with your phone to start ordering
            </p>
          </div>

          <form id="user-signin-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">
                Mobile Number
              </label>
              <div className="relative group transition-all duration-300">
                <div className="flex items-center gap-0 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-[18px] focus-within:border-[#FA0272]/40 focus-within:ring-4 focus-within:ring-[#FA0272]/10 transition-all overflow-hidden">
                  <div className="flex items-center px-4 h-14 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white font-bold text-lg">
                    <span>+91</span>
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="00000 00000"
                    value={formData.phone}
                    onChange={handleChange}
                    className="flex-1 h-14 text-lg bg-transparent text-zinc-900 dark:text-white border-0 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-700 tracking-[0.1em] px-5"
                    aria-invalid={error ? "true" : "false"}
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#FA0272] pl-2 mt-1"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              form="user-signin-form"
              className="w-full h-14 bg-[#FA0272] hover:bg-[#D40261] text-white font-black text-base uppercase tracking-widest rounded-[18px] transition-all duration-300 shadow-[0_8px_20px_rgba(250,2,114,0.3)] hover:shadow-[0_12px_28px_rgba(250,2,114,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sending OTP...</span>
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {/* Social login separator */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-100 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.3em]">
              <span className="bg-white/0 px-4 text-zinc-400 dark:text-zinc-500">
                Secure Options
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              className="flex items-center justify-center gap-3 w-full h-14 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-[18px] group transition-all duration-300 hover:border-[#FA0272]/30"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.14-4.53z"
                />
              </svg>
              <span className="text-zinc-600 dark:text-zinc-300 font-bold text-sm tracking-tight text-zinc-900 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Continue with Google</span>
            </motion.button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              By continuing, you agree to our
              <br className="sm:hidden" />
              <div className="flex justify-center gap-1.5 mt-1">
                <Link to="/profile/terms" className="text-[#FA0272] hover:underline font-bold">Terms</Link>
                <span className="opacity-20">•</span>
                <Link to="/profile/privacy" className="text-[#FA0272] hover:underline font-bold">Privacy</Link>
                <span className="opacity-20">•</span>
                <Link to="/profile/refund" className="text-[#FA0272] hover:underline font-bold">Policy</Link>
              </div>
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatedPage>
  )
}

