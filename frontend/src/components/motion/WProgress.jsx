import React from 'react';
import { motion } from 'framer-motion';

export const WProgress = ({ 
  progress = 0, 
  estimatedRemaining = null,
  showPercentage = true,
  className = ''
}) => {
  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div className="h-1.5 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-[var(--text-muted)] h-4">
        <div>
          {estimatedRemaining ? (
            <span>About {estimatedRemaining} remaining</span>
          ) : progress > 0 && progress < 100 ? (
            <span className="flex items-center gap-1">
              Working
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >...</motion.span>
            </span>
          ) : (
            <span />
          )}
        </div>
        {showPercentage && progress > 0 && (
          <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
};
