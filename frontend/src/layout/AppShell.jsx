import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/shared/Navbar';
import BottomNav from '../components/shared/BottomNav';
import { WPageTransition } from '../components/motion/WPageTransition';

/**
 * Universal App Shell for W-Commerce.
 * Provides consistent theme background, text colors, and page transitions.
 */
export const AppShell = ({ children, className = '' }) => {
  const location = useLocation();
  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text transition-colors duration-300 flex flex-col ${className}`}>
      <Navbar />
      <WPageTransition />
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="flex-grow flex flex-col w-full h-full pt-16 pb-28 sm:pb-0 relative overflow-hidden"
        >
          {children || <Outlet />}
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
};
export default AppShell;
