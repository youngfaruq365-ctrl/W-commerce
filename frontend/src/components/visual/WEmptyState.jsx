import React from 'react';
import { motion } from 'framer-motion';
import WAnimation from './WAnimation';

export const WEmptyState = ({ title, description, animationType = 'emptyCart', actionButton, className = '' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
    >
      <WAnimation type={animationType} className="w-48 h-48 mb-6" />
      <h3 className="text-xl font-bold text-theme-text mb-2">{title}</h3>
      <p className="text-theme-muted mb-6 max-w-md">{description}</p>
      {actionButton}
    </motion.div>
  );
};
export default WEmptyState;
