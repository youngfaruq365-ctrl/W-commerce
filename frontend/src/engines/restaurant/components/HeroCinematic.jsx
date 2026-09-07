import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';

export const HeroCinematic = ({ store, motionVariants, onCheckout }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <motion.div 
      variants={motionVariants.page} 
      initial="initial" animate="animate" exit="exit"
      className="w-full h-screen min-h-[700px] flex flex-col justify-center items-center text-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--store-bg)', color: 'var(--store-text)' }}
    >
      <motion.div style={{ y: y1 }} className="absolute inset-0 z-0">
        <img 
          src={store.preview.hero} 
          alt={store.name} 
          className="w-full h-full object-cover opacity-70 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </motion.div>

      <motion.div 
        style={{ opacity }}
        className="relative z-10 flex flex-col items-center justify-center max-w-4xl px-6"
      >
        <motion.div variants={motionVariants.cardEntrance} className="mb-8 overflow-hidden rounded-full border border-white/20 p-2 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 pr-6 pl-2">
            <div className="w-10 h-10 rounded-full bg-[var(--store-primary)] flex items-center justify-center text-black">
              <Play size={16} fill="black" />
            </div>
            <span className="text-sm font-medium tracking-widest uppercase">The Experience</span>
          </div>
        </motion.div>

        <motion.h1 
          variants={motionVariants.cardEntrance} 
          className="text-6xl md:text-8xl lg:text-9xl mb-6 font-light leading-none tracking-tight"
          style={{ fontFamily: 'var(--store-font)' }}
        >
          {store.name}
        </motion.h1>

        <motion.div variants={motionVariants.cardEntrance} className="w-24 h-px bg-[var(--store-primary)] mb-8"></motion.div>

        <motion.p variants={motionVariants.cardEntrance} className="text-xl md:text-2xl font-light text-white/80 max-w-2xl mb-12">
          {store.description}
        </motion.p>

        <motion.button 
          variants={motionVariants.cardEntrance}
          whileHover={motionVariants.hover}
          whileTap={motionVariants.tap}
          onClick={onCheckout}
          className="px-10 py-5 text-sm tracking-[0.2em] uppercase transition-all"
          style={{ 
            backgroundColor: 'transparent', 
            color: 'var(--store-primary)', 
            border: '1px solid var(--store-primary)',
            borderRadius: 'var(--store-radius)'
          }}
        >
          Reserve a Table
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
