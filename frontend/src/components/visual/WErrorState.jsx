import React from 'react';
import { motion } from 'framer-motion';
import WAnimation from './WAnimation';

export const WErrorState = ({ title, description, animationType = 'serverError', actionButton, className = '' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
    >
      <WAnimation type={animationType} className="w-48 h-48 mb-6" />
      <h3 className="text-2xl font-bold text-red-500 mb-2">{title}</h3>
      <p className="text-theme-muted mb-6 max-w-md">{description}</p>
      {actionButton}
    </motion.div>
  );
};
export default WErrorState;
