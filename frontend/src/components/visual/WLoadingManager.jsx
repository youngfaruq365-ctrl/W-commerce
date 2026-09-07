import React from 'react';
import { motion } from 'framer-motion';

export const WLoadingManager = ({ type = 'spinner', text = 'Loading...', className = '' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={`flex flex-col items-center justify-center p-8 ${className}`}
    >
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
      <span className="text-theme-text opacity-70">{text}</span>
    </motion.div>
  );
};
export default WLoadingManager;
