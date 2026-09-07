import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WReasoningAnimation = ({ message = 'Understanding your request...' }) => {
  const presets = useMotionPresets();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] relative overflow-hidden w-full"
      {...presets.fadeUp}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-gray)] to-transparent opacity-30" />
      
      <div className="flex items-center gap-6 mb-4 relative z-10">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          className="w-3 h-3 rounded-full bg-[var(--accent-gray)] shadow-[0_0_8px_var(--accent-gray)]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
          className="w-3 h-3 rounded-full bg-[var(--accent-gray)] shadow-[0_0_8px_var(--accent-gray)]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.8 }}
          className="w-3 h-3 rounded-full bg-[var(--accent-gray)] shadow-[0_0_8px_var(--accent-gray)]"
        />
        
        {/* Connecting lines */}
        <div className="absolute top-1/2 left-3 right-3 h-[1px] bg-[var(--border-color)] -z-10" />
      </div>
      
      <div className="flex items-center gap-2 text-[var(--accent-gray)] font-medium">
        <Sparkles size={16} className="animate-pulse" />
        <span className="text-[var(--text-main)] text-sm">{message}</span>
      </div>
    </motion.div>
  );
};
