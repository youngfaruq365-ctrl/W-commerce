import React, { useEffect } from 'react';
import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/shared/Navbar';
import BottomNav from '../components/shared/BottomNav';
import OfflineBanner from '../components/shared/OfflineBanner';
import QlooAssistPopup from '../components/shared/QlooAssistPopup';
import { WPageTransition } from '../components/motion/WPageTransition';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

/**
 * Universal App Shell for W-Commerce.
 * Provides consistent theme background, text colors, and page transitions.
 */
export const AppShell = ({ children, className = '' }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const outlet = useOutlet();

  useEffect(() => {
    // Initialize OneSignal when the app loads
    notificationService.init();
  }, []);

  useEffect(() => {
    // Log in to OneSignal when user is authenticated, otherwise log out
    if (user && user.id) {
      notificationService.loginUser(user.id);
    } else {
      notificationService.logoutUser();
    }
  }, [user]);

  return (
    <div className={`min-h-screen border-[4px] border-white bg-[var(--bg-primary)] text-[var(--text-main)] transition-colors duration-300 flex flex-col box-border ${location.pathname.startsWith('/payai') ? 'overflow-hidden hide-scrollbar' : ''} ${className}`}>
      <Navbar />
      <OfflineBanner />
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className={`flex-grow flex flex-col w-full min-h-0 relative overflow-x-hidden pt-16 ${location.pathname.startsWith('/payai') ? 'pb-0 overflow-hidden hide-scrollbar' : 'pb-28 sm:pb-0'}`}
        >
          {children ? children : (outlet ? React.cloneElement(outlet, { key: location.pathname }) : null)}
        </motion.div>
      </AnimatePresence>
      <BottomNav />
      <QlooAssistPopup />
    </div>
  );
};
export default AppShell;
