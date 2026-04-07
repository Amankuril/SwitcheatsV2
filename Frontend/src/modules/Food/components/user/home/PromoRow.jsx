import React from 'react';
import { motion } from 'framer-motion';
import discountPromoIcon from "@food/assets/category-icons/discount_promo.png";
import vegPromoIcon from "@food/assets/category-icons/veg_promo.png";
import pricePromoIcon from "@food/assets/category-icons/price_promo.png";
import comboPromoIcon from "@food/assets/category-icons/combo_promo.png";

export default function PromoRow({ handleVegModeChange, navigate, isVegMode, toggleRef }) {
  const promoCardsData = [
    {
      id: 'offers',
      title: "Hot Deals",
      value: "Offers",
      icon: discountPromoIcon,
      bgColor: "bg-rose-500/10",
      glowColor: "bg-rose-500/20",
      borderColor: "border-rose-500/20",
      textColor: "text-rose-600"
    },
    {
      id: 'pure-veg',
      title: "Diet Prefer",
      value: "Pure Veg",
      icon: vegPromoIcon,
      bgColor: "bg-emerald-500/10",
      glowColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/20",
      textColor: "text-emerald-700"
    },
    {
      id: 'under-250',
      title: "Daily Bites",
      value: "Under ₹250",
      icon: pricePromoIcon,
      bgColor: "bg-amber-500/10",
      glowColor: "bg-amber-500/20",
      borderColor: "border-amber-500/20",
      textColor: "text-amber-700"
    },
    {
      id: 'combos',
      title: "Best Value",
      value: "Combos",
      icon: comboPromoIcon,
      bgColor: "bg-sky-500/10",
      glowColor: "bg-sky-500/20",
      borderColor: "border-sky-500/20",
      textColor: "text-sky-700"
    },
  ];

  return (
    <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-4 py-8 bg-white dark:bg-[#0a0a0a]">
      {promoCardsData.map((promo, idx) => (
        <motion.div
          key={idx}
          ref={promo.id === 'pure-veg' ? toggleRef : null}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.96 }}
          className="flex-shrink-0 flex flex-col items-center gap-3 group cursor-pointer"
          onClick={() => {
            if (promo.id === 'pure-veg') handleVegModeChange(!isVegMode);
            else if (promo.id === 'offers') navigate('/food/user/offers');
            else if (promo.id === 'under-250') navigate('/food/user/under-250');
            else if (promo.id === 'combos') navigate('/food/user/combos');
          }}
        >
          {/* Spatial Glass Pill Container */}
          <div className={`relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-[2rem] ${promo.bgColor} backdrop-blur-md border ${promo.borderColor} shadow-sm flex items-center justify-center p-3.5 overflow-hidden transition-all duration-500 ${
            promo.id === 'pure-veg' && isVegMode ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-[#0a0a0a]' : ''
          }`}>
            {/* Background Glow */}
            <div className={`absolute inset-0 ${promo.glowColor} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            {/* Glossy Reflective Sweep */}
            <motion.div 
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 + idx }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] w-[150%] h-full z-10"
            />

            <img
              src={promo.icon}
              alt={promo.value}
              className="w-full h-full object-contain relative z-20 drop-shadow-md group-hover:scale-110 transition-transform duration-500"
            />
            
            {/* Active Indicator Refined */}
            {promo.id === 'pure-veg' && isVegMode && (
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)] z-30" />
            )}
          </div>

          {/* Premium Typography */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-0.5">
              {promo.title}
            </span>
            <span className={`text-[12px] font-black ${promo.textColor} tracking-tight leading-tight`}>
              {promo.value}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
