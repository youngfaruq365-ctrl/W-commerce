import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperationStore } from '../../store/operationStore';
import { WProgressSteps } from './WProgressSteps';
import { WProgress } from './WProgress';
import { WSpinner } from './WSpinner';
import { WSuccessAnimation } from './WSuccessAnimation';
import { WErrorState } from './WErrorState';
import { X } from 'lucide-react';
import { useMotionPresets } from './MotionPresets';

export const WGenerationExperience = ({ 
  steps = [],
  onCancel,
  onFinish
}) => {
  const { status, step, progress, message, estimatedRemaining, cancel, reset } = useOperationStore();
  const presets = useMotionPresets();
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        setShowPreview(true);
      }, 3000); // Wait for success animation and confetti
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleCancel = () => {
    cancel('Generation cancelled by user');
    if (onCancel) onCancel();
  };

  const handleFinish = () => {
    reset();
    if (onFinish) onFinish();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-primary)]/90 backdrop-blur-2xl">
      <AnimatePresence mode="wait">
        {status === 'error' ? (
          <WErrorState key="error" message={useOperationStore.getState().error} onRetry={handleFinish} />
        ) : status === 'success' ? (
          <motion.div 
            key="success"
            className="flex flex-col items-center max-w-md w-full p-8"
            {...presets.fadeIn}
          >
            <WSuccessAnimation message={message || 'Your store is ready!'} />
            
            <AnimatePresence>
              {showPreview && (
                <motion.div 
                  className="mt-12 flex flex-col gap-4 w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button onClick={handleFinish} className="w-full py-4 bg-[var(--accent-gray)] text-black rounded-xl font-bold hover:scale-[1.02] transition-transform">
                    View Store
                  </button>
                  <button onClick={handleFinish} className="w-full py-4 border border-[var(--border-color)] text-[var(--text-main)] rounded-xl font-bold hover:bg-[var(--bg-secondary)] transition-colors">
                    Customize Store
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key="generating"
            className="flex flex-col max-w-md w-full p-8 relative"
            {...presets.fadeUp}
          >
            <button 
              onClick={handleCancel}
              className="absolute -top-12 right-0 p-2 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center mb-12">
              <div className="relative mb-8">
                <WSpinner size={80} color="var(--accent-gray)" />
                <div className="absolute inset-0 flex items-center justify-center shadow-[0_0_50px_var(--accent-gray)] rounded-full opacity-20 blur-xl" />
              </div>
              <h2 className="text-2xl font-bold text-center text-[var(--text-main)] mb-2">
                {message || 'Generating...'}
              </h2>
            </div>

            <WProgressSteps 
              steps={steps} 
              currentStepId={step} 
              className="mb-8"
            />

            <WProgress 
              progress={progress} 
              estimatedRemaining={estimatedRemaining} 
            />
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
