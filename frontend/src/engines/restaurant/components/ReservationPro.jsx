import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const ReservationPro = ({ store, motionVariants }) => {
  return (
    <div className="py-24 px-6 relative" style={{ backgroundColor: '#050505', color: 'var(--store-text)' }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
        <motion.div variants={motionVariants.cardEntrance} className="flex flex-col justify-center">
          <h2 className="text-sm tracking-[0.3em] uppercase mb-4 text-[var(--store-primary)]">Exclusive Access</h2>
          <h3 className="text-4xl md:text-5xl font-light font-serif mb-8">Reserve Your Table</h3>
          <p className="text-white/60 font-light leading-relaxed mb-12">
            Reservations are highly recommended. For parties of 6 or more, or to book our Private Chef's Room, please contact our concierge directly.
          </p>
          <div className="flex items-center gap-4 text-sm tracking-widest uppercase text-white/40">
            <span>Valet Parking</span>
            <span>•</span>
            <span>Dress Code: Elegant</span>
          </div>
        </motion.div>
        
        <motion.div variants={motionVariants.cardEntrance} className="bg-white/5 border border-white/10 p-10 backdrop-blur-sm">
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Date</label>
                <input type="date" className="w-full bg-transparent border-b border-white/20 pb-2 text-white outline-none focus:border-[var(--store-primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Time</label>
                <select className="w-full bg-transparent border-b border-white/20 pb-2 text-white outline-none focus:border-[var(--store-primary)] transition-colors appearance-none">
                  <option className="bg-[#111]">19:00</option>
                  <option className="bg-[#111]">19:30</option>
                  <option className="bg-[#111]">20:00</option>
                  <option className="bg-[#111]">20:30</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Guests</label>
              <select className="w-full bg-transparent border-b border-white/20 pb-2 text-white outline-none focus:border-[var(--store-primary)] transition-colors appearance-none">
                <option className="bg-[#111]">2 Guests</option>
                <option className="bg-[#111]">3 Guests</option>
                <option className="bg-[#111]">4 Guests</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Special Requests (Dietary)</label>
              <input type="text" className="w-full bg-transparent border-b border-white/20 pb-2 text-white outline-none focus:border-[var(--store-primary)] transition-colors" placeholder="e.g. Gluten-free, Anniversary..." />
            </div>
            
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="mt-8 w-full py-4 text-sm tracking-[0.2em] uppercase bg-[var(--store-primary)] text-black font-medium hover:bg-white transition-colors">
              Request Booking
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
