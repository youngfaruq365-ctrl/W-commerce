import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WErrorState = ({ 
  title = 'Something went wrong',
  message = 'An unexpected error interrupted the process.',
  onRetry 
}) => {
  const presets = useMotionPresets();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-8 text-center max-w-md w-full bg-[var(--bg-secondary)] border border-red-500/20 rounded-2xl"
      {...presets.shake}
    >
      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
      <p className="text-[var(--text-muted)] mb-8">{message}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-full hover:bg-[var(--accent-gray)] hover:text-black hover:border-transparent transition-all"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </motion.div>
  );
};
