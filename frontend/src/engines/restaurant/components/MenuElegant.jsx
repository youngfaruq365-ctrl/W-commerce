import React from 'react';
import { motion } from 'framer-motion';
import { useSellerData } from '../context/SellerDataContext';

export const MenuElegant = ({ store, motionVariants }) => {
  const { products } = useSellerData();
  return (
    <div className="py-32 px-6 max-w-4xl mx-auto" style={{ backgroundColor: 'var(--store-bg)', color: 'var(--store-text)' }}>
      <motion.div variants={motionVariants.cardEntrance} className="text-center mb-24">
        <h2 className="text-sm tracking-[0.3em] uppercase mb-4 text-[var(--store-primary)]">Tasting Menu</h2>
        <h3 className="text-5xl font-light font-serif">A Culinary Journey</h3>
      </motion.div>
      
      <div className="flex flex-col gap-16 relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 hidden md:block"></div>
        
        {products.map((item, i) => (
          <motion.div 
            key={i} 
            variants={motionVariants.cardEntrance}
            className="flex flex-col md:flex-row gap-8 md:pl-16 relative group"
          >
            <div className="hidden md:block absolute left-[-4px] top-4 w-2 h-2 rounded-full bg-[var(--store-primary)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex-1">
              <h4 className="text-2xl font-serif mb-2 tracking-wide">{item.title}</h4>
              <p className="text-white/60 font-light italic mb-4">{item.description}</p>
            </div>
            
            <div className="md:w-64 border-l border-white/10 pl-6">
              <div className="text-xs uppercase tracking-widest text-[var(--store-primary)] mb-1">Sommelier Pairing</div>
              <div className="text-sm font-light text-white/80">{item.winePairing || 'House Selection'}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
