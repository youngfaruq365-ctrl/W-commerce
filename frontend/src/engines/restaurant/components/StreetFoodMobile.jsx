import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSellerData } from '../context/SellerDataContext';
import { MapPin, Navigation } from 'lucide-react';

export const StreetFoodMobile = ({ store, motionVariants, onCheckout }) => {
  const { products } = useSellerData();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative pb-24" style={{ backgroundColor: 'var(--store-bg)', color: 'var(--store-text)' }}>
      {/* App Header */}
      <motion.div variants={motionVariants.page} className="pt-12 pb-6 px-6 bg-[var(--store-primary)] text-black rounded-b-3xl shadow-lg sticky top-0 z-50">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 leading-none">{store.name}</h1>
        <div className="flex items-center gap-2 text-sm font-bold opacity-80">
          <MapPin size={16} /> Central Square Park (Open till 11PM)
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-4 pt-6 flex flex-col gap-4">
        {products.map((p, i) => (
          <motion.div 
            key={p.id}
            variants={motionVariants.cardEntrance}
            whileTap={motionVariants.tap}
            className="bg-white/10 p-4 flex gap-4 rounded-2xl items-center"
          >
            <img src={p.image} alt={p.title} className="w-24 h-24 rounded-xl object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight mb-1">{p.title}</h3>
              <p className="text-xs text-white/50 line-clamp-2 mb-2">{p.description}</p>
              <div className="font-black text-[var(--store-primary)]">₦{p.price.toFixed(2)}</div>
            </div>
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-10 h-10 shrink-0 bg-[var(--store-primary)] text-black rounded-full flex items-center justify-center font-bold text-xl">+</button>
          </motion.div>
        ))}
      </div>

      {/* Mobile Bottom Navigation & Quick Order */}
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={onCheckout}
            className="w-full py-5 bg-[var(--store-primary)] text-black font-black text-xl tracking-wide rounded-2xl shadow-[0_10px_40px_rgba(255,215,0,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <Navigation size={24} fill="black" />
            ORDER FOR PICKUP
          </button>
        </div>
      </motion.div>
    </div>
  );
};
