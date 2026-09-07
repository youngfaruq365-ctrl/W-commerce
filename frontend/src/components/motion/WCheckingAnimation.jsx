import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WCheckingAnimation = ({ message = 'Checking...' }) => {
  const presets = useMotionPresets();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-8"
      {...presets.fadeIn}
    >
      <div className="relative mb-6">
        <motion.div 
          className="w-16 h-16 rounded-full border border-[var(--accent-gray)]/30 flex items-center justify-center bg-[var(--bg-secondary)]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Search size={24} className="text-[var(--accent-gray)]" />
        </motion.div>
        
        {/* Pulsing ring */}
        <motion.div 
          className="absolute inset-0 rounded-full border border-[var(--accent-gray)]"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        
        {/* Scanning line */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div 
            className="w-full h-[2px] bg-[var(--accent-gray)] opacity-50 shadow-[0_0_8px_var(--accent-gray)]"
            animate={{ y: [-10, 70] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
      
      <p className="text-[var(--text-main)] font-medium animate-pulse">{message}</p>
    </motion.div>
  );
};
