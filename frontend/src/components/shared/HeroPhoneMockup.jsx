import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PLACEHOLDER_IMAGE, PLACEHOLDER_BANNER, PLACEHOLDER_MAP } from '@/constants/placeholders';
import { MapPin, ShoppingBag, Star, Package, ChevronRight, Heart } from 'lucide-react';

const slides = [
  {
    id: 'store',
    content: (
      <div className="w-full h-full flex flex-col bg-[var(--bg-primary)]">
        <div className="h-40 bg-gray-200 dark:bg-gray-800 relative shrink-0">
          <img src={PLACEHOLDER_BANNER} alt="Store banner" className="w-full h-full object-cover" />
          <div className="absolute -bottom-6 left-4 w-16 h-16 bg-white dark:bg-[#0a0a0a] rounded-xl shadow-lg border-4 border-[var(--bg-primary)] flex items-center justify-center font-bold text-xl text-black dark:text-white">
            NE
          </div>
        </div>
        <div className="pt-8 px-4 shrink-0">
          <h3 className="font-bold text-xl leading-tight">Nova Essentials</h3>
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-1 mt-1">
            <MapPin size={12} /> Fashion &bull; Lagos
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6 px-4 flex-1 min-h-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden aspect-square">
              <img src={PLACEHOLDER_IMAGE} className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="bg-[var(--text-main)] rounded-xl flex items-center justify-center text-[var(--bg-primary)] aspect-square shadow-inner">
            <span className="font-bold text-2xl">+12</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'product',
    content: (
      <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] relative">
        <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800 shrink-0 relative">
          <img src={PLACEHOLDER_IMAGE} className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <Heart size={20} />
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-2xl leading-tight">Premium Leather Sneakers</h3>
          </div>
          <div className="text-lg font-black mt-2 text-[#006cff]">₦45,000</div>
          <div className="flex items-center gap-1 text-sm font-bold text-[var(--text-muted)] mt-2">
            <Star size={14} className="fill-yellow-400 text-yellow-400" /> 4.9 (128 reviews)
          </div>
          
          <div className="mt-auto pt-4">
            <button className="w-full py-4 rounded-2xl bg-[var(--text-main)] text-[var(--bg-primary)] font-bold shadow-lg flex items-center justify-center gap-2">
              <ShoppingBag size={18} /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'tracking',
    content: (
      <div className="w-full h-full flex flex-col bg-[var(--bg-primary)]">
        <div className="h-1/2 bg-gray-100 dark:bg-gray-800 relative shrink-0">
          <img src={PLACEHOLDER_MAP} className="w-full h-full object-cover" />
          
          {/* Mock tracking path overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 20 80 Q 50 60 80 20" fill="none" stroke="#006cff" strokeWidth="3" strokeDasharray="6 6" className="animate-pulse" />
            <circle cx="20" cy="80" r="4" fill="#006cff" />
            <circle cx="80" cy="20" r="4" fill="#ef4444" />
          </svg>
          
          <div className="absolute top-4 left-4 bg-white dark:bg-[#0a0a0a] px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Courier assigned
          </div>
        </div>
        <div className="flex-1 p-5 flex flex-col">
          <h3 className="font-bold text-xl mb-4">Delivery Status</h3>
          
          <div className="flex flex-col gap-0 relative">
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
            
            <div className="flex gap-4 relative z-10 mb-6">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 border-4 border-[var(--bg-primary)]">
                <Package size={10} />
              </div>
              <div>
                <div className="font-bold text-sm">Package Picked Up</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">10:24 AM - Store Location</div>
              </div>
            </div>
            
            <div className="flex gap-4 relative z-10 mb-6">
              <div className="w-6 h-6 rounded-full bg-[#006cff] text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,108,255,0.4)] border-4 border-[var(--bg-primary)]">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
              <div>
                <div className="font-bold text-sm">On the way</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Estimated arrival: 12:45 PM</div>
              </div>
            </div>
            
            <div className="flex gap-4 relative z-10">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 border-4 border-[var(--bg-primary)] shrink-0"></div>
              <div>
                <div className="font-bold text-sm text-[var(--text-muted)]">Delivery</div>
                <div className="text-xs text-[var(--text-muted)]/50 mt-0.5">Your address</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

const HeroPhoneMockup = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000); // Swipe every 4 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full aspect-[1/2] max-h-[600px] bg-black rounded-[44px] md:rounded-[50px] border-[10px] md:border-[14px] border-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden ring-1 ring-white/10 mx-auto max-w-[300px] md:max-w-none">
      
      {/* iPhone Dynamic Island */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 md:w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0f0f12] flex items-center justify-center">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-900/50"></div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24]"></div>
      </div>

      {/* Screen Content Wrapper */}
      <div className="flex-1 bg-[var(--bg-primary)] relative overflow-hidden rounded-[34px] md:rounded-[36px]">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 w-full h-full"
          >
            {slides[currentIndex].content}
          </motion.div>
        </AnimatePresence>

        {/* Swipe Indicators (Dots) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`w-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'h-4 bg-[var(--text-main)] shadow-[0_0_8px_var(--text-main)]' : 'h-1.5 bg-[var(--text-muted)]/40'
              }`} 
            />
          ))}
        </div>
        
        {/* Overlay gradient to make it look like a screen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-[34px] md:rounded-[36px]" />
      </div>
      
      {/* Home Indicator bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-[var(--text-main)] rounded-full z-50 opacity-50"></div>
    </div>
  );
};

export default HeroPhoneMockup;
