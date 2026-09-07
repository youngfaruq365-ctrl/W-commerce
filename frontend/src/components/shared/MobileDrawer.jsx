import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, User, ShoppingBag, Home, Search, Heart, Settings, MessageCircle } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-[var(--bg-primary)] shadow-2xl z-50 flex flex-col lg:hidden border-r border-slate-200 dark:border-slate-800"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="text-xl font-black tracking-tighter text-[var(--text-main)] uppercase">
                Global<span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gray)] to-gray-400">X</span>
              </span>
              <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[var(--text-main)] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <Link to="/" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                <Home size={20} /> Home
              </Link>
              <Link to="/search" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                <Search size={20} /> Search
              </Link>
              <Link to="/cart" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)] justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} /> Cart
                </div>
                {cartItemsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
              <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_DASHBOARD} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                <Heart size={20} /> Wishlist
              </Link>
              
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
              
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</div>
                  <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_DASHBOARD} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                    <User size={20} /> Dashboard
                  </Link>
                  <Link to={user?.role === 'SELLER' ? ROUTES.SELLER_DASHBOARD : ROUTES.BUYER_PROFILE} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                    <Settings size={20} /> Settings
                  </Link>
                  <Link to={ROUTES.MESSAGES} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[var(--text-main)]">
                    <MessageCircle size={20} /> Chat
                  </Link>
                </>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <Link to={ROUTES.LOGIN} onClick={onClose} className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-bold text-[var(--text-main)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Login
                  </Link>
                  <Link to={ROUTES.SIGNUP} onClick={onClose} className="w-full py-3 rounded-xl bg-[var(--text-main)] text-[var(--bg-primary)] text-center font-bold hover:opacity-90 transition-opacity">
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
