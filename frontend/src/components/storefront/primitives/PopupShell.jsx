import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PopupShell = ({ 
  isVisible, 
  onClose, 
  variants, 
  duration, 
  theme, 
  shape = 'rounded-2xl',
  width = 'max-w-md',
  position = 'center',
  children 
}) => {
  // Determine positioning classes
  let posClasses = "fixed inset-0 z-50 flex p-4 ";
  if (position === 'center') posClasses += "items-center justify-center";
  if (position === 'bottom') posClasses += "items-end justify-center";
  if (position === 'side') posClasses += "items-end justify-end";

  // Determine shape classes
  let shapeClasses = "";
  if (shape === 'rounded-2xl') shapeClasses = "rounded-2xl";
  if (shape === 'pill') shapeClasses = "rounded-[2rem]";
  if (shape === 'circle') shapeClasses = "rounded-full aspect-square";
  if (shape === 'ticket') shapeClasses = "rounded-sm";

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={posClasses}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ duration, type: 'spring', bounce: 0.3 }}
            style={{
              backgroundColor: theme?.background || '#ffffff',
              color: theme?.text || '#111111',
              boxShadow: theme?.shadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none'
            }}
            className={`relative w-full ${width} ${shapeClasses} shadow-2xl overflow-hidden border border-white/10`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PopupShell;
