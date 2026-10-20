import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Sparkles, WifiOff } from 'lucide-react';
import SearchBar from './SearchBar';
import MegaMenu from './MegaMenu';
import NotificationBell from './NotificationBell';
import MobileDrawer from './MobileDrawer';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../constants/routes';
import { useOffline } from '../../offline/useOffline';

const Navbar = ({ onSearch, onCategorySelect }) => {
  const { cartItems } = useCartStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, pendingCount } = useOffline();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  
  
  const handleSearch = (q) => {
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`/?search=${encodeURIComponent(q)}`);
    }
  };

  const handleCategorySelect = (cat, sub) => {
    if (onCategorySelect) {
      onCategorySelect(cat, sub);
    } else {
      navigate(`/?category=${encodeURIComponent(cat.toLowerCase())}`);
    }
  };

  const getDashboardRoute = () => {
    if (!user) return ROUTES.LOGIN;
    const role = user.role?.toUpperCase();
    switch(role) {
      case 'ADMIN': return ROUTES.ADMIN_DASHBOARD;
      case 'SELLER': return ROUTES.SELLER_DASHBOARD;
      case 'BUYER':
      case 'USER':
      default: return ROUTES.BUYER_DASHBOARD;
    }
  };

  return (
    <>
    <nav 
      className="fixed top-[4px] left-[4px] right-[4px] z-[60] neu-panel !rounded-none transition-all duration-300 overflow-hidden sm:overflow-visible !border-b-[3px] !border-solid !border-white dark:!border-white"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-1 sm:gap-4">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-2 sm:gap-6 flex-1">
          <button 
            className="lg:hidden p-2 text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            onClick={() => setIsMobileDrawerOpen(true)}
          >
            <Menu size={24} />
          </button>
          <Link to="/" className="inline-flex items-center gap-2 group shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--text-main)] to-[var(--accent-gray)] flex items-center justify-center font-black text-[var(--bg-primary)] shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
              X
            </span>
            <span className="text-xl font-black tracking-tighter text-[var(--text-main)] transition-colors hidden sm:block uppercase">
              Global<span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-gray)] to-gray-400">X</span>
            </span>
          </Link>
        </div>

        {/* Center: Search & Filter Menu */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-1 sm:gap-4 mx-1 sm:mx-4">
          <SearchBar onSearch={handleSearch} />
          <MegaMenu onCategorySelect={handleCategorySelect} />
        </div>

        {/* Right Side: Icons & Auth */}
        <div className="flex gap-2 sm:gap-3 shrink-0 items-center justify-end flex-1">
          <Link
            to={ROUTES.PAYAI}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm transition-all duration-200 shrink-0"
            title="PayAI Cross-Border International Shopping"
          >
            <Sparkles size={14} className="text-indigo-500 animate-pulse shrink-0" />
            <span className="tracking-tight">PayAI Global</span>
            <span className="text-[9px] uppercase px-1 py-0.2 bg-blue-600 text-white rounded font-extrabold">NEW</span>
          </Link>

          {!isOnline && (
            <Link
              to="/offline"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 transition-all shrink-0"
              title="Working Offline — Click to open Offline Hub"
            >
              <WifiOff size={14} className="animate-pulse" />
              <span className="hidden md:inline">Offline</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}

          <button 
            onClick={toggleTheme} 
            className="neu-button w-10 h-10 shrink-0 flex items-center justify-center rounded-xl"
          >
            {isDarkMode ? <span className="text-lg drop-shadow-md">☀️</span> : <span className="text-lg drop-shadow-md">🌙</span>}
          </button>
          
          <div className="shrink-0 w-10 h-10">
            <NotificationBell />
          </div>

          <Link to="/cart" className="hidden sm:flex relative neu-button w-10 h-10 hover:text-[var(--text-main)] shrink-0 items-center justify-center group rounded-xl text-[var(--text-main)]">
            <ShoppingCart size={20} className="transition-transform duration-300 group-hover:scale-110 text-[var(--text-main)] dark:text-white" />
            {cartItems?.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md border border-white dark:border-gray-800 animate-pulse">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>
          
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={getDashboardRoute()} className="flex neu-button-primary px-4 sm:px-6 py-2.5 items-center gap-2 shrink-0">
                <User size={18} /> <span className="hidden lg:inline tracking-tight">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="text-sm font-bold text-[var(--text-muted)] hover:text-[#006cff] transition-colors">
                  Login
                </Link>
                <Link to={ROUTES.SIGNUP} className="flex neu-button-primary px-4 sm:px-6 py-2.5 items-center gap-2 shrink-0">
                  <User size={18} /> <span className="hidden lg:inline tracking-tight">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    <MobileDrawer 
      isOpen={isMobileDrawerOpen} 
      onClose={() => setIsMobileDrawerOpen(false)} 
      isAuthenticated={isAuthenticated} 
      user={user} 
      cartItemsCount={cartItems?.length ? cartItems.reduce((acc, item) => acc + item.quantity, 0) : 0} 
    />
    </>
  );
};

export default Navbar;

