import React from 'react';
import { motion } from 'framer-motion';

const GXCard = ({ children, className = '', title, action }) => {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`premium-glass p-6 rounded-2xl transition-all duration-300 ${className}`}
    >
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="font-bold text-lg text-[var(--text-main)]">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
};

export default GXCard;
