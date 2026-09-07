import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionPresets } from './MotionPresets';
import { Check, CircleDashed } from 'lucide-react';

export const WProgressSteps = ({ 
  steps = [], 
  currentStepId = null,
  className = ''
}) => {
  const presets = useMotionPresets();

  const currentStepIndex = steps.findIndex(s => s.id === currentStepId);

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = currentStepIndex > index;
        const isCurrent = currentStepIndex === index;
        const isWaiting = currentStepIndex < index;

        return (
          <motion.div 
            key={step.id}
            className={`flex items-center gap-4 p-3 rounded-xl border ${
              isCurrent 
                ? 'bg-[var(--accent-gray)]/10 border-[var(--accent-gray)]/30' 
                : 'border-transparent'
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="relative flex items-center justify-center w-6 h-6">
              <AnimatePresence mode="wait">
                {isCompleted && (
                  <motion.div
                    key="completed"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-green-500"
                  >
                    <Check size={20} strokeWidth={3} />
                  </motion.div>
                )}
                {isCurrent && (
                  <motion.div
                    key="current"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-[var(--accent-gray)]"
                  >
                    <CircleDashed size={20} className="animate-spin-slow" />
                  </motion.div>
                )}
                {isWaiting && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-2 h-2 rounded-full bg-[var(--border-color)]"
                  />
                )}
              </AnimatePresence>
            </div>
            <span className={`text-sm font-medium transition-colors duration-300 ${
              isCurrent ? 'text-[var(--text-main)]' : 
              isCompleted ? 'text-[var(--text-muted)]' : 
              'text-[var(--text-muted)] opacity-50'
            }`}>
              {step.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
