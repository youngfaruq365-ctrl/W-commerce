import React from 'react';
import { motion } from 'framer-motion';
import { pulse } from '../../utils/motionPresets';
import { useAnimationLevel } from '../../context/AnimationContext';

export const ProductGridSkeleton = ({ count = 6 }) => {
  const { getVariant } = useAnimationLevel();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} {...getVariant(pulse)} className="premium-glass rounded-xl overflow-hidden flex flex-col h-64">
          <div className="h-40 bg-[var(--bg-tertiary)] w-full"></div>
          <div className="p-4 flex flex-col gap-2 flex-1 justify-center">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4"></div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2"></div>
            <div className="mt-auto h-6 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const CategoryGridSkeleton = ({ count = 4 }) => {
  const { getVariant } = useAnimationLevel();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} {...getVariant(pulse)} className="premium-glass p-6 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)]"></div>
          <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16"></div>
        </motion.div>
      ))}
    </div>
  );
};

export const ListSkeleton = ({ count = 4 }) => {
  const { getVariant } = useAnimationLevel();
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} {...getVariant(pulse)} className="premium-glass p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0"></div>
          <div className="flex flex-col gap-2 w-full">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
          </div>
          <div className="h-8 bg-[var(--bg-tertiary)] rounded w-20 flex-shrink-0"></div>
        </motion.div>
      ))}
    </div>
  );
};

export const OrderSkeleton = ({ count = 2 }) => {
  const { getVariant } = useAnimationLevel();
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} {...getVariant(pulse)} className="premium-glass p-6 rounded-xl flex flex-col gap-4">
          <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-32"></div>
            <div className="h-6 bg-[var(--bg-tertiary)] rounded-full w-24"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)]"></div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2"></div>
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
            </div>
            <div className="h-5 bg-[var(--bg-tertiary)] rounded w-16"></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
