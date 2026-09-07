import React from 'react';
import { motion } from 'framer-motion';

export const WSpinner = ({ size = 24, className = '', color = 'var(--accent-gray)' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <motion.div
        className="absolute w-full h-full rounded-full border-2 border-transparent"
        style={{ borderTopColor: color, borderRightColor: color }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[70%] h-[70%] rounded-full border-2 border-transparent opacity-60"
        style={{ borderBottomColor: color, borderLeftColor: color }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[30%] h-[30%] rounded-full opacity-30"
        style={{ backgroundColor: color }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};
