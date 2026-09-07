import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMotionVariants } from './registries/MotionRegistry';
import { getThemeTokens } from './registries/ThemeRegistry';
import { triggerCelebration } from './registries/CelebrationEngine';
import { PageRegistry } from './registries/PageRegistry';

// Stub components (these would normally be dynamically imported based on config.pages)
const HeroComponent = ({ store, motionVariants, onCheckout }) => {
  return (
    <motion.div 
      variants={motionVariants.page} 
      initial="initial" animate="animate" exit="exit"
      className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--store-bg)', color: 'var(--store-text)' }}
    >
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      <img src={store.preview.hero} alt={store.name} className="absolute inset-0 w-full h-full object-cover z-0" />
      
      <div className="relative z-20 max-w-2xl">
        <motion.h1 variants={motionVariants.cardEntrance} className="text-5xl md:text-7xl font-bold mb-6 text-white" style={{ fontFamily: 'var(--store-font)' }}>
          {store.name}
        </motion.h1>
        <motion.p variants={motionVariants.cardEntrance} className="text-xl text-white/90 mb-8">
          {store.description}
        </motion.p>
        <motion.button 
          variants={motionVariants.cardEntrance}
          whileHover={motionVariants.hover}
          whileTap={motionVariants.tap}
          onClick={onCheckout}
          className="px-8 py-4 rounded-full font-bold text-lg shadow-xl"
          style={{ backgroundColor: 'var(--store-primary)', color: '#FFF' }}
        >
          {store.tier === 'signature' ? 'Reserve a Table' : 'Order Now'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export const StoreExperience = ({ storeConfig }) => {
  if (!storeConfig) return null;

  const tokens = getThemeTokens(storeConfig.design || {});
  const motionVariants = getMotionVariants(storeConfig.motion?.level || 1);

  const handleMockCheckout = () => {
    triggerCelebration(storeConfig.motion?.level || 1);
  };

  return (
    <div 
      className="store-engine-root w-full min-h-screen relative flex flex-col"
      style={{
        '--store-font': tokens.fontFamily,
        '--store-primary': tokens.primaryColor,
        '--store-bg': tokens.backgroundColor,
        '--store-text': tokens.textColor,
        '--store-radius': tokens.borderRadius,
        backgroundColor: 'var(--store-bg)',
        fontFamily: 'var(--store-font)'
      }}
    >
      <AnimatePresence mode="wait">
        {storeConfig.modules?.map((moduleName, index) => {
          const ModuleComponent = PageRegistry[moduleName];
          if (!ModuleComponent) {
            return (
              <div key={index} className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">
                Unknown Module: {moduleName}
              </div>
            );
          }
          return (
            <ModuleComponent 
              key={index} 
              store={storeConfig} 
              motionVariants={motionVariants} 
              onCheckout={handleMockCheckout} 
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};
