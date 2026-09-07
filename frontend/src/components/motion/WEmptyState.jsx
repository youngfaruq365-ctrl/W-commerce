import React from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WEmptyState = ({ 
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message = 'It looks like this space is empty.',
  actionLabel,
  onAction 
}) => {
  const presets = useMotionPresets();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-12 text-center w-full h-full min-h-[300px]"
      {...presets.fadeUp}
    >
      <div className="w-20 h-20 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-full flex items-center justify-center mb-6">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
      <p className="text-[var(--text-muted)] max-w-sm mb-8">{message}</p>
      
      {onAction && actionLabel && (
        <button 
          onClick={onAction}
          className="px-6 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-full hover:bg-[var(--accent-gray)] hover:text-black hover:border-transparent transition-all font-medium"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};
