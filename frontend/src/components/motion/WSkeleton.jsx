import React from 'react';
import { motion } from 'framer-motion';

export const WSkeleton = ({ 
  type = 'text', // 'text', 'circular', 'rectangular', 'card'
  width,
  height,
  className = ''
}) => {
  const baseClasses = "bg-[var(--bg-secondary)] overflow-hidden relative";
  
  let shapeClasses = "";
  switch (type) {
    case 'circular':
      shapeClasses = "rounded-full";
      break;
    case 'text':
      shapeClasses = "rounded-md h-4";
      break;
    case 'card':
      shapeClasses = "rounded-2xl";
      break;
    case 'rectangular':
    default:
      shapeClasses = "rounded-lg";
      break;
  }

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div className={`${baseClasses} ${shapeClasses} ${className}`} style={style}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ translateX: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};
