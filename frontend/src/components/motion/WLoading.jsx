import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionPresets } from './MotionPresets';
import { WSpinner } from './WSpinner';

export const WLoading = ({ 
  text = 'Preparing your experience...', 
  subtext = '',
  fullscreen = false,
  blur = true 
}) => {
  const presets = useMotionPresets();

  const containerClasses = fullscreen 
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center'
    : 'w-full h-full min-h-[200px] flex flex-col items-center justify-center p-8';

  const bgClasses = fullscreen && blur
    ? 'bg-[var(--bg-primary)]/80 backdrop-blur-xl'
    : '';

  return (
    <AnimatePresence>
      <motion.div
        className={`${containerClasses} ${bgClasses}`}
        {...presets.fadeIn}
      >
        <WSpinner size={48} className="mb-6" />
        
        <motion.div 
          className="flex flex-col items-center text-center gap-2"
          {...presets.fadeUp}
        >
          <div className="flex items-center gap-1 text-[var(--text-main)] font-medium text-lg">
            <span>{text}</span>
            <span className="flex">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </div>
          {subtext && (
            <span className="text-sm text-[var(--text-muted)] max-w-md">
              {subtext}
            </span>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
