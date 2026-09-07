import React from 'react';
import { motion } from 'framer-motion';

export const HeroFastFood = ({ store, motionVariants, onCheckout }) => {
  return (
    <motion.div 
      variants={motionVariants.page} 
      initial="initial" animate="animate" exit="exit"
      className="w-full bg-[var(--store-bg)] flex flex-col items-center pt-24 pb-16 px-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--store-primary)] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div variants={motionVariants.cardEntrance} className="inline-block px-4 py-2 bg-[var(--store-primary)] text-white font-bold text-sm tracking-wider uppercase rounded-full mb-6">
            Trending Deal 🔥
          </motion.div>
          
          <motion.h1 variants={motionVariants.cardEntrance} className="text-6xl md:text-8xl font-black mb-4 leading-none tracking-tighter" style={{ color: 'var(--store-primary)' }}>
            CRAVE.<br/>
            BITE.<br/>
            REPEAT.
          </motion.h1>
          
          <motion.p variants={motionVariants.cardEntrance} className="text-xl text-[var(--store-text)] opacity-80 mb-8 font-medium">
            Hot, fresh, and delivered in minutes. Get 20% off your first combo order today.
          </motion.p>
          
          <motion.div variants={motionVariants.cardEntrance} className="flex gap-4">
            <motion.button 
              whileHover={motionVariants.hover}
              whileTap={motionVariants.tap}
              onClick={onCheckout}
              className="px-8 py-5 font-black text-xl shadow-2xl"
              style={{ backgroundColor: 'var(--store-primary)', color: '#FFF', borderRadius: 'var(--store-radius)' }}
            >
              ORDER NOW
            </motion.button>
            <motion.button 
              whileHover={motionVariants.hover}
              whileTap={motionVariants.tap}
              className="px-8 py-5 font-bold text-xl border-4"
              style={{ borderColor: 'var(--store-primary)', color: 'var(--store-primary)', borderRadius: 'var(--store-radius)' }}
            >
              VIEW MENU
            </motion.button>
          </motion.div>
        </div>
        
        <motion.div variants={motionVariants.cardEntrance} className="relative">
           {store.preview.hero ? (
             <img src={store.preview.hero} alt="Delicious Burger" className="w-full h-auto object-cover rounded-3xl shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-300" />
           ) : (
             <div className="w-full aspect-square bg-gray-200 rounded-3xl"></div>
           )}
           <motion.div 
             animate={{ y: [0, -10, 0] }} 
             transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
             className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
           >
             <div className="text-4xl">🍔</div>
             <div>
               <div className="font-black text-gray-900">Spicy Double</div>
               <div className="text-[var(--store-primary)] font-bold">$8.99</div>
             </div>
           </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
