import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import {
  ArrowRight, Search, ShoppingCart, Play, Apple,
  MapPin, Clock, Star, Facebook, Twitter, Instagram, Linkedin,
  Zap, Award, ShieldCheck, TrendingUp, ArrowUpRight, Map
} from "lucide-react";
import { APP_CONFIG } from "../config/constants"; // Adjust path if needed

// --- Animation Variants for Cinematic Reveals ---
const textReveal = {
  hidden: { y: "120%" },
  visible: (i) => ({
    y: 0,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }
  })
};

const imageReveal = {
  hidden: { scale: 1.1, opacity: 0, clipPath: "inset(100% 0% 0% 0% round 2rem)" },
  visible: {
    scale: 1,
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0% round 2rem)",
    transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }
  }
};

const gridVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 }
  })
};

export default function LandingPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      mouseMultiplier: 1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  // Global Scroll Progress Hook
  const { scrollYProgress } = useScroll({ target: containerRef });

  // Hero Parallax (Mapping to the top 15% of the page scroll)
  const heroY = useTransform(scrollYProgress, [0, 0.15], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const imageParallax = useTransform(scrollYProgress, [0, 0.15], ["0%", "20%"]);

  // Phone Mockup Parallax
  const scalePhone = useTransform(scrollYProgress, [0.2, 0.4], [0.85, 1]);
  const rotatePhone = useTransform(scrollYProgress, [0.2, 0.4], [10, 0]);

  return (
    <div ref={containerRef} className="bg-[#FCFBFA] min-h-screen w-full max-w-full text-slate-900 font-sans selection:bg-[#FA0272] selection:text-white overflow-x-hidden relative">

      {/* Refined, Subtler Lighting */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] bg-orange-400/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="absolute top-0 w-full z-50 px-6 py-8 md:px-12 lg:px-20 flex items-center justify-between bg-transparent">
        <div className="text-2xl font-black text-slate-900 tracking-tighter mix-blend-difference">
          {APP_CONFIG?.NAME || "BRAND"}
          <span className="text-[#FA0272]">.</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-bold tracking-wide uppercase text-slate-900 mix-blend-difference">
          <a href="/" className="hover:text-[#FA0272] transition-colors">Home</a>
          <a href="/menu" className="hover:text-[#FA0272] transition-colors">Menu</a>
          <a href="/partner" className="hover:text-[#FA0272] transition-colors">Partner</a>
        </nav>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#FA0272] transition-colors shadow-lg shadow-slate-900/20">
          Order Now
        </button>
      </header>

      {/* 1. AWARD-WINNING HERO SECTION */}
      <section className="relative z-10 h-screen min-h-[700px] flex items-center px-6 md:px-12 lg:px-20 max-w-[1800px] mx-auto">

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full h-full pt-20">

          {/* Left: Dramatic Typography */}
          <div className="col-span-1 flex flex-col justify-center z-20 h-full relative">

            <div className="overflow-hidden mb-6">
              <motion.div custom={0} initial="hidden" animate="visible" variants={textReveal} className="inline-flex items-center gap-2 text-[#FA0272] font-bold tracking-widest uppercase text-xs bg-[#FA0272]/10 px-4 py-2 rounded-full">
                <Award className="w-4 h-4" /> Michelin-Level Experience at Home
              </motion.div>
            </div>

            <h1 className="text-[12vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-slate-900 relative z-20">
              <div className="overflow-hidden pb-2">
                <motion.div custom={1} initial="hidden" animate="visible" variants={textReveal}>
                  TASTE
                </motion.div>
              </div>
              <div className="overflow-hidden pb-4">
                <motion.div custom={2} initial="hidden" animate="visible" variants={textReveal} className="flex items-center gap-4 lg:gap-8">
                  <span className="italic font-light text-slate-500">THE</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600">BEYOND.</span>
                </motion.div>
              </div>
            </h1>

            <div className="overflow-hidden mt-8 max-w-md">
              <motion.p custom={3} initial="hidden" animate="visible" variants={textReveal} className="text-lg text-slate-600 font-light leading-relaxed">
                Curated culinary masterpieces delivered with uncompromising precision. Fast, elegant, and perfectly plated.
              </motion.p>
            </div>

            <div className="overflow-hidden mt-12">
              <motion.div custom={4} initial="hidden" animate="visible" variants={textReveal} className="flex items-center gap-6">
                <button className="group flex items-center gap-3 bg-[#FA0272] text-white px-8 py-4 rounded-full font-bold hover:bg-slate-900 transition-all duration-500 text-sm shadow-xl shadow-[#FA0272]/20">
                  Explore Menu
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center gap-3 text-sm font-bold text-slate-900 hover:text-[#FA0272] transition-colors">
                  <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center">
                    <Play className="w-4 h-4 ml-1 text-[#FA0272]" />
                  </div>
                  Watch Film
                </button>
              </motion.div>
            </div>
          </div>

          {/* Right: The Cinematic Centerpiece */}
          <div className="hidden lg:flex col-span-1 h-full items-center justify-end">

            <motion.div
              initial="hidden"
              animate="visible"
              variants={imageReveal}
              style={{ y: imageParallax }}
              className="relative w-full h-[75vh] max-h-[750px] rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Overlay Gradient to blend with text on smaller screens */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />

              <img
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop"
                alt="Gourmet Plating"
                className="w-full h-full object-cover"
              />

              {/* Minimal Floating Element */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20 border border-white/50"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="pr-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Average Delivery</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">15 Mins</p>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 2. OUR STORY / ASYMMETRICAL LAYOUT */}
      <section className="relative z-10 py-32 px-6 md:px-16 lg:px-24 max-w-[1800px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          <div className="space-y-8">
            <span className="inline-block text-xs font-black tracking-[0.3em] text-[#FA0272] uppercase bg-pink-50 border border-pink-100 rounded-full px-3 py-1">
              Our Vision
            </span>
            <h3 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
              Curated for the <br /><span className="italic text-slate-500 font-light">connoisseur.</span>
            </h3>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-light max-w-lg">
              We believe food is art. Every restaurant on our platform is hand-picked to ensure your weekend feasts or sudden cravings are nothing short of spectacular.
            </p>
            <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
              <div>
                <p className="text-4xl font-black text-slate-950">500+</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Premium Partners</p>
              </div>
              <div>
                <p className="text-4xl font-black text-slate-950">&lt;25m</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Avg Delivery</p>
              </div>
            </div>
          </div>

          <div className="relative h-[400px] lg:h-[600px] rounded-[2.5rem] overflow-hidden group shadow-2xl border-4 border-white">
            <div className="absolute inset-0 bg-[#FA0272] mix-blend-overlay opacity-10 z-10 group-hover:opacity-0 transition-opacity duration-700" />
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1000&auto=format&fit=crop"
              alt="Chef working"
              className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
            />
          </div>
        </div>
      </section>

      {/* 3. MOBILE EXPERIENCE (Floating Phone Parallax) */}
      <section className="relative z-10 py-32 bg-slate-50/60 backdrop-blur-3xl border-y border-slate-100">
        <div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 flex flex-col lg:flex-row items-center gap-20">

          {/* Phone Mockup Column */}
          <div className="flex-1 lg:pl-20 order-2 lg:order-1">
            <motion.div style={{ scale: scalePhone, rotateZ: rotatePhone }} className="relative w-[290px] sm:w-[320px] h-[580px] sm:h-[640px] mx-auto perspective-1000">

              {/* 3D Phone CSS Mockup */}
              <div className="absolute inset-0 rounded-[3rem] bg-slate-900 p-2 shadow-[0_40px_80px_rgba(15,23,42,0.12)] border border-slate-800 transform-style-3d shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-b-2xl z-20" />
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative border border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"
                    className="w-full h-[55%] object-cover"
                    alt="App preview"
                  />
                  <div className="absolute bottom-0 w-full h-[50%] bg-gradient-to-t from-white via-white to-transparent p-6 flex flex-col justify-end">
                    <div className="w-12 h-1 bg-slate-200 rounded-full mb-6 mx-auto" />
                    <h4 className="text-2xl font-black text-slate-900 mb-1">Sushi Masterclass</h4>
                    <p className="text-slate-500 text-xs font-semibold mb-4">Japanese • 4.9 <Star className="inline w-3 h-3 text-[#FA0272] fill-[#FA0272] mb-0.5" /></p>
                    <button className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-[#FA0272] transition-colors duration-300 text-sm shadow-md">
                      Track Delivery
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating App Card */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 sm:-right-12 top-32 bg-white border border-slate-200/60 p-4 rounded-2xl shadow-xl flex items-center gap-3.5 z-20"
              >
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#FA0272]" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Arriving In</p>
                  <p className="text-base font-black text-slate-900">14 mins</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* App Info Column */}
          <div className="flex-1 space-y-8 order-1 lg:order-2">
            <span className="inline-block text-xs font-black tracking-[0.3em] text-[#FA0272] uppercase bg-pink-50 border border-pink-100 rounded-full px-3 py-1">
              Mobile Experience
            </span>
            <h3 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
              Flawless <br />from tap to table.
            </h3>
            <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-lg">
              Live tracking that actually updates. Beautifully designed interface. Zero friction. Download the app to experience food delivery designed for the modern era.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-[#FA0272] px-8 py-4 rounded-2xl font-bold transition-all duration-300 text-sm shadow-md shadow-slate-900/10">
                <Apple className="w-5 h-5" /> App Store
              </button>
              <button className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 px-8 py-4 rounded-2xl font-bold transition-all duration-300 text-sm shadow-sm">
                <Play className="w-5 h-5" /> Google Play
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LATE NIGHT CRAVINGS - Dark Theme Accent Section */}
      <section className="relative z-10 py-32 bg-[#0A0A0B] text-slate-100 overflow-hidden">

        {/* Glow behind the dark section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FA0272]/5 to-transparent pointer-events-none" />
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-[#FA0272] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        <div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-block text-xs font-black tracking-[0.3em] text-[#FA0272] uppercase bg-[#FA0272]/10 border border-[#FA0272]/20 rounded-full px-3 py-1 mb-4">
              Midnight Magic
            </span>
            <h3 className="text-5xl lg:text-7xl font-black tracking-tight text-white">
              Late Night <span className="italic text-slate-400 font-light">Cravings.</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Midnight Burger", time: "15-20 min", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop" },
              { title: "Spicy Ramen", time: "20-30 min", img: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?q=80&w=1000&auto=format&fit=crop" },
              { title: "Loaded Fries", time: "10-15 min", img: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?q=80&w=1000&auto=format&fit=crop" }
            ].map((item, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.8 }}
                key={i}
                className="group relative rounded-[2rem] overflow-hidden cursor-pointer h-[400px] border border-white/5 shadow-2xl"
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10" />
                <img src={item.img} className="absolute inset-0 w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-700 ease-out" alt={item.title} />
                <div className="absolute bottom-0 w-full p-8 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
                  <h4 className="text-2xl font-black text-white mb-2">{item.title}</h4>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#FA0272]" />
                    <span className="text-slate-300 font-bold text-sm">{item.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* 4.1 whats waiting for you section */}
      <section className="relative z-10 py-20 md:py-24 px-6 md:px-12 lg:px-20 max-w-[1800px] mx-auto bg-[#FCFBFA]">
        
        {/* Section Header */}
        <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="inline-block text-xs font-black tracking-[0.3em] text-[#FA0272] uppercase bg-[#FA0272]/10 border border-[#FA0272]/20 rounded-full px-4 py-1.5 mb-6">
              The Experience
            </span>
            <h2 className="text-4xl lg:text-6xl font-black leading-[0.95] tracking-tighter text-slate-900">
              What's Waiting <br />
              <span className="italic font-light text-slate-500">For You.</span>
            </h2>
          </div>
          <p className="text-base md:text-lg text-slate-600 font-light max-w-sm leading-relaxed pb-1">
            Beyond just food delivery. We are engineering a new standard for dining at home.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
          
          {/* Left Column - Card 1 */}
          <div className="md:col-span-8 h-full">
            {/* Card 1: Large Featured */}
            <motion.div 
              custom={0} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={gridVariants}
              className="group relative w-full h-full min-h-[350px] md:min-h-0 rounded-[2rem] overflow-hidden bg-slate-900 shadow-xl"
            >
              <img 
                src="https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=1200&auto=format&fit=crop" 
                alt="Chef preparing premium steak" 
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-90 transition-all duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute top-6 left-6 w-11 h-11 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <Award className="w-5 h-5 text-white" />
              </div>

              <div className="absolute bottom-0 w-full p-6 md:p-10">
                <h3 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">The Culinary Elite</h3>
                <p className="text-slate-300 text-sm md:text-base font-light max-w-md mb-5 leading-relaxed">
                  Exclusive access to menus from Michelin-starred kitchens and highly sought-after private chefs, unavailable anywhere else.
                </p>
                <button className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider group/btn">
                  Meet The Chefs <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Card 2 & Card 3 */}
          <div className="md:col-span-4 flex flex-col gap-6 h-full">
            {/* Card 2: Top Right */}
            <motion.div 
              custom={1} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={gridVariants}
              className="group relative flex-1 min-h-[250px] md:min-h-0 rounded-[2rem] overflow-hidden bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center border border-pink-100 group-hover:bg-[#FA0272] transition-colors duration-500">
                <Map className="w-5 h-5 text-[#FA0272] group-hover:text-white transition-colors duration-500" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 tracking-tight">Surgical Precision</h3>
                <p className="text-slate-600 font-light text-xs md:text-sm leading-relaxed">
                  Proprietary routing algorithms ensure your meal arrives at the exact optimum temperature. Watch it live, down to the exact intersection.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Bottom Right (Split into two on desktop) */}
            <motion.div 
              custom={2} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={gridVariants}
              className="flex-1 min-h-[250px] md:min-h-0 grid grid-cols-2 gap-6"
            >
              {/* Sub-card A */}
              <div className="col-span-1 rounded-[2rem] overflow-hidden relative group shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?q=80&w=800&auto=format&fit=crop" 
                  alt="Premium Packaging" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
                <div className="absolute bottom-5 left-5 right-5">
                  <h4 className="text-white font-bold text-base md:text-lg leading-tight">Bespoke<br/>Packaging</h4>
                </div>
              </div>

              {/* Sub-card B */}
              <div className="col-span-1 rounded-[2rem] bg-slate-900 p-5 md:p-6 flex flex-col justify-between border border-slate-800 group hover:bg-[#FA0272] transition-colors duration-500 shadow-lg">
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base md:text-lg leading-tight mb-1">Zero<br/>Compromise</h4>
                  <p className="text-slate-400 text-[10px] md:text-xs group-hover:text-white/80 transition-colors">Sealed, hygienic, and pristine.</p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* 5. FASTEST DELIVERY / GLOWING ROUTE */}
      <section className="relative z-10 py-32 px-6 md:px-16 lg:px-24 max-w-[1800px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-20">

          <div className="flex-1 space-y-8">
            <span className="inline-block text-xs font-black tracking-[0.3em] text-[#FA0272] uppercase bg-pink-50 border border-pink-100 rounded-full px-3 py-1">
              Precision
            </span>
            <h3 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
              Fastest <br /><span className="italic text-slate-500 font-light">Delivery Route.</span>
            </h3>
            <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-lg">
              Our advanced routing algorithm calculates the exact fastest path to your door, avoiding traffic and delays. Watch your order arrive in real-time.
            </p>
          </div>

          <div className="flex-1 w-full h-[400px] relative rounded-[2.5rem] border border-slate-100 bg-slate-50/50 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-xl">

            {/* Map Background Mock */}
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0F172A 1px, transparent 0)', backgroundSize: '32px 32px' }} />

            {/* Animated SVG Route */}
            <svg viewBox="0 0 400 300" className="w-full h-full max-w-[400px] relative z-10 p-6">
              <path d="M 50 250 Q 150 250, 200 150 T 350 50" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="4" strokeLinecap="round" />
              <motion.path
                d="M 50 250 Q 150 250, 200 150 T 350 50"
                fill="none"
                stroke="#FA0272"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: false, margin: "-100px" }}
                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
                style={{ filter: "drop-shadow(0px 0px 8px rgba(250,2,114,0.5))" }}
              />
              <circle cx="50" cy="250" r="8" fill="#FA0272" className="shadow-[0_0_10px_#FA0272]" />
              <circle cx="350" cy="50" r="8" fill="#0F172A" />
            </svg>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="relative z-10 bg-slate-50 pt-32 pb-10 px-6 md:px-16 lg:px-24 border-t border-slate-200/50 overflow-hidden text-slate-600">

        <div className="max-w-[1800px] mx-auto">
          <div className="grid lg:grid-cols-5 gap-16 mb-24 relative z-10">
            <div className="lg:col-span-2">
              <h2 className="text-5xl font-black tracking-tighter text-slate-950 mb-6">
                {APP_CONFIG?.NAME || "BRAND"}<span className="text-[#FA0272]">.</span>
              </h2>
              <p className="text-slate-500 text-lg font-light leading-relaxed max-w-sm mb-8">
                Elevating the dining experience. Premium food delivery for those who expect more.
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <div key={i} className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-[#FA0272] hover:border-[#FA0272] hover:text-white cursor-pointer transition-all duration-300 text-slate-700 bg-white shadow-sm">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5 text-sm font-medium">
              <h4 className="text-slate-900 font-bold tracking-widest text-xs uppercase mb-1">Legal</h4>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Compliance</a>
            </div>

            <div className="flex flex-col gap-5 text-sm font-medium">
              <h4 className="text-slate-900 font-bold tracking-widest text-xs uppercase mb-1">Company</h4>
              <a href="#" className="hover:text-[#FA0272] transition-colors">About Us</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Careers</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Press</a>
              <a href="#" className="hover:text-[#FA0272] transition-colors">Investors</a>
            </div>

            <div className="flex flex-col gap-5 text-sm font-medium">
              <h4 className="text-slate-900 font-bold tracking-widest text-xs uppercase mb-1">Contact</h4>
              <a href={`mailto:support@${APP_CONFIG?.NAME?.toLowerCase() || 'brand'}.com`} className="hover:text-[#FA0272] transition-colors">support@{APP_CONFIG?.NAME?.toLowerCase() || 'brand'}.com</a>
              <a href="tel:18001234567" className="hover:text-[#FA0272] transition-colors">1-800-123-4567</a>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">Available 24/7 for premium members.</p>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 text-xs font-semibold">
            <p className="text-slate-400">© 2026 {APP_CONFIG?.NAME || 'Brand'} Technologies Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <p className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">System Status: <span className="text-emerald-500">100% Operational</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}