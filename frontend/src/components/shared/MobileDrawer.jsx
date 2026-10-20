import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, User, ShoppingBag, Home, Search, Heart, Settings, MessageCircle, Sparkles } from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import './MobileDrawer.css';

const MobileDrawer = ({ isOpen, onClose, isAuthenticated, user, cartItemsCount }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-3/4 max-w-sm mobile-drawer-neumorphic z-[100] flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between mobile-drawer-header">
              <span className="text-2xl font-black tracking-tighter text-[#101827] uppercase">
                Global<span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-gray-400">X</span>
              </span>
              <button onClick={onClose} className="p-2.5 rounded-full neu-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mobile-drawer-content flex flex-col gap-4">
              <Link to="/" onClick={onClose} className="neu-link">
                <Home size={20} className="shrink-0" /> 
                <span className="flex-1">Home</span>
              </Link>
              <Link to="/search" onClick={onClose} className="neu-link">
                <Search size={20} className="shrink-0" /> 
                <span className="flex-1">Search</span>
              </Link>
              <Link to={ROUTES.PAYAI} onClick={onClose} className="neu-link text-indigo-600 dark:text-indigo-400 font-semibold">
                <Sparkles size={20} className="shrink-0 text-indigo-500 animate-pulse" /> 
                <span className="flex-1">PayAI Global</span>
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-inner">
                  AI
                </span>
              </Link>
              <Link to="/cart" onClick={onClose} className="neu-link">
                <ShoppingBag size={20} className="shrink-0" /> 
                <span className="flex-1">Cart</span>
                {cartItemsCount > 0 && (
                  <span className="bg-[#006cff] text-white text-xs font-bold px-2 py-1 rounded-full shadow-inner">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
              <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_DASHBOARD} onClick={onClose} className="neu-link">
                <Heart size={20} className="shrink-0" /> 
                <span className="flex-1">Wishlist</span>
              </Link>
              
              <div className="neu-divider" />
              
              {isAuthenticated ? (
                <>
                  <div className="px-2 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Account</div>
                  <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_DASHBOARD} onClick={onClose} className="neu-link">
                    <User size={20} className="shrink-0" /> Dashboard
                  </Link>
                  <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_PROFILE} onClick={onClose} className="neu-link">
                    <Settings size={20} className="shrink-0" /> Settings
                  </Link>
                  <Link to={ROUTES.MESSAGES} onClick={onClose} className="neu-link">
                    <MessageCircle size={20} className="shrink-0" /> Chat
                  </Link>
                </>
              ) : (
                <div className="mt-2 flex flex-col gap-4">
                  <Link to={ROUTES.LOGIN} onClick={onClose} className="neu-link justify-center text-center">
                    Login
                  </Link>
                  <Link to={ROUTES.SIGNUP} onClick={onClose} className="neu-link neu-link-primary justify-center text-center">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
