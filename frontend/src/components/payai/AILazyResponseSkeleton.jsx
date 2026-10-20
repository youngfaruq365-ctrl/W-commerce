import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, ShieldCheck, Zap } from 'lucide-react';

const LOADING_STAGES = [
  { text: 'Scanning verified seller catalogs & inventories...', sub: 'PayAI Multi-Store Search' },
  { text: 'Validating real-time escrow & currency conversion...', sub: 'Escrow Protection Engine' },
  { text: 'Assembling tailored product deals & discounts...', sub: 'Finalizing Recommendations' }
];

export default function AILazyResponseSkeleton() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const currentStage = LOADING_STAGES[stageIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="flex gap-3.5 justify-start max-w-full w-full"
    >
      {/* AI Sparkles Avatar with Gemini Rainbow 🌈 Aura Glow */}
      <div className="relative shrink-0 mt-0.5">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] opacity-60 blur-md animate-pulse" />
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-[2px] bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] relative z-10 flex items-center justify-center shadow-md">
          <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#181818] flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            >
              <Sparkles size={16} className="text-[#006cff]" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Lazy Loading Bubble */}
      <div className="flex-1 min-w-0 max-w-3xl">
        <div className="neu-card p-4 sm:p-5 rounded-3xl rounded-tl-lg text-[var(--text-main)] w-full border border-white/60 dark:border-white/[0.06] relative overflow-hidden shadow-sm">
          {/* Continuous Diagonal Shimmer Sweep Light Wave */}
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-blue-500/10 via-purple-500/10 dark:via-white/[0.08] to-transparent skew-x-12 z-10"
          />

          {/* AI Header Chip with Stage Progress */}
          <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006cff] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006cff]" />
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentStage.text}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs font-bold text-[#006cff] tracking-tight"
                >
                  {currentStage.text}
                </motion.span>
              </AnimatePresence>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/20 flex items-center gap-1">
              <Zap size={10} className="animate-bounce" />
              <span>{currentStage.sub}</span>
            </span>
          </div>

          {/* Shimmering Text Skeleton Lines */}
          <div className="space-y-2.5 mb-4">
            <div className="h-3.5 w-11/12 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-700/60 dark:to-zinc-800 animate-pulse" />
            <div className="h-3.5 w-4/5 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-700/60 dark:to-zinc-800 animate-pulse delay-75" />
            <div className="h-3.5 w-3/5 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-700/60 dark:to-zinc-800 animate-pulse delay-150" />
          </div>

          {/* Shimmering Product Cards Skeleton Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[1, 2].map((k) => (
              <div
                key={k}
                className="rounded-2xl p-3 border border-slate-200/70 dark:border-white/5 bg-slate-50/60 dark:bg-zinc-800/40 relative overflow-hidden"
              >
                {/* Internal card shimmer line */}
                <motion.div
                  animate={{ x: ['-150%', '250%'] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: k * 0.3, ease: 'linear' }}
                  className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent skew-x-12"
                />

                <div className="w-full h-28 rounded-xl bg-slate-200/80 dark:bg-zinc-800 animate-pulse mb-2.5 flex items-center justify-center">
                  <ShoppingBag size={20} className="text-slate-300 dark:text-zinc-600 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-4/5 rounded bg-slate-200/80 dark:bg-zinc-800 animate-pulse" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-3.5 w-1/3 rounded bg-[#006cff]/20 animate-pulse" />
                    <div className="h-6 w-16 rounded-xl bg-slate-200/80 dark:bg-zinc-800 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gemini Rainbow Bottom Light Border */}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#4285F4] via-[#9B72CB] via-[#D96570] to-transparent opacity-80" />
        </div>
      </div>
    </motion.div>
  );
}
