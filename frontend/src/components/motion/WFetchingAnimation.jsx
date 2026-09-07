import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadCloud } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WFetchingAnimation = ({ message = 'Fetching data...', submessage = '' }) => {
  const presets = useMotionPresets();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-8 w-full"
      {...presets.fadeIn}
    >
      <div className="relative mb-6">
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden relative z-10"
        >
          <DownloadCloud size={24} className="text-[var(--text-main)] relative z-10" />
          
          <motion.div 
            className="absolute bottom-0 left-0 right-0 bg-[var(--accent-gray)]/20"
            initial={{ height: "0%" }}
            animate={{ height: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        
        {/* Connection line */}
        <motion.div
          className="absolute -top-10 left-1/2 w-[2px] h-10 bg-gradient-to-b from-transparent to-[var(--accent-gray)] -translate-x-1/2"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex flex-col items-center"
        >
          <p className="text-[var(--text-main)] font-medium mb-1">{message}</p>
          {submessage && (
            <span className="text-sm text-[var(--text-muted)]">{submessage}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
