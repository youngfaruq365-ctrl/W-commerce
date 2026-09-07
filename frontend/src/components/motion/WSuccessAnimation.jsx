import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { fireSuccessConfetti, fireMiniConfetti } from './WConfetti';

export const WSuccessAnimation = ({ 
  message = 'Success!', 
  submessage = '',
  mini = false 
}) => {
  useEffect(() => {
    if (mini) {
      fireMiniConfetti();
    } else {
      fireSuccessConfetti();
    }
  }, [mini]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <motion.div 
        className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 relative"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <motion.div
          className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.5 }}
          transition={{ delay: 0.2, duration: 1 }}
        />
        <Check size={40} strokeWidth={3} />
      </motion.div>
      <motion.h3 
        className="text-2xl font-bold text-[var(--text-main)] mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.h3>
      {submessage && (
        <motion.p 
          className="text-[var(--text-muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {submessage}
        </motion.p>
      )}
    </div>
  );
};
