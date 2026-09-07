import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, CheckCircle2 } from 'lucide-react';

export const MagicFill = ({ store }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Available for Signature tier (price >= 21)
  if (!store || store.price < 21) return null;

  const handleMagicFill = () => {
    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setSuccess(true);
      
      // We would dispatch a state update to the store context here
      // For this demo, we just show the success toast.
      setTimeout(() => setSuccess(false), 3000);
    }, 2500);
  };

  return (
    <>
      <motion.button
        onClick={handleMagicFill}
        disabled={isGenerating || success}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 right-6 z-[100] w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50"
      >
        <Wand2 size={20} className={isGenerating ? "animate-pulse" : ""} />
      </motion.button>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-36 right-6 z-[100] bg-black text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl border border-white/10"
          >
            <Loader2 size={18} className="animate-spin text-purple-400" />
            <div className="text-sm font-medium">Re-imagining store layout...</div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-36 right-6 z-[100] bg-green-500 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 size={18} />
            <div className="text-sm font-bold">Magic Fill Complete!</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
