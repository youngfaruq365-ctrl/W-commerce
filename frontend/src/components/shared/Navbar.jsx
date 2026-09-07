import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu } from 'lucide-react';
import SearchBar from './SearchBar';
import MegaMenu from './MegaMenu';
import NotificationBell from './NotificationBell';
import MobileDrawer from './MobileDrawer';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';

const Navbar = ({ onSearch, onCategorySelect }) => {
  const { cartItems } = useCartStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

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
    <nav className="fixed top-0 w-full z-40 glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            className="lg:hidden p-2 -ml-2 text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
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

        <div className="flex gap-3 sm:gap-5 shrink-0 items-center justify-end flex-1">
          <SearchBar onSearch={handleSearch} />
          
          <MegaMenu onCategorySelect={handleCategorySelect} />

          <button 
            onClick={toggleTheme} 
            className="icon-3d-glass-box w-10 h-10 shrink-0 flex items-center justify-center"
          >
            {isDarkMode ? <span className="text-lg drop-shadow-md">☀️</span> : <span className="text-lg drop-shadow-md">🌙</span>}
          </button>
          
          <div className="shrink-0 w-10 h-10">
            <NotificationBell />
          </div>

          <Link to="/cart" className="relative icon-3d-glass-box w-10 h-10 hover:text-[var(--text-main)] shrink-0 flex items-center justify-center group">
            <ShoppingBag size={20} className="text-[var(--text-main)] transition-transform duration-300 group-hover:scale-110" />
            {cartItems?.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md border border-white dark:border-gray-800 animate-pulse">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>
          
          {isAuthenticated ? (
            <Link to={getDashboardRoute()} className="flex bg-[var(--text-main)] text-[var(--bg-primary)] px-4 sm:px-6 py-2.5 rounded-full font-bold items-center gap-2 hover:bg-[var(--accent-gray)] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 shrink-0">
              <User size={18} /> <span className="hidden lg:inline tracking-tight">Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to={ROUTES.LOGIN} className="hidden sm:flex text-sm font-bold hover:text-[var(--accent-gray)] transition-colors">
                Login
              </Link>
              <Link to={ROUTES.SIGNUP} className="flex bg-[var(--text-main)] text-[var(--bg-primary)] px-4 sm:px-6 py-2.5 rounded-full font-bold items-center gap-2 hover:bg-[var(--accent-gray)] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 shrink-0">
                <User size={18} /> <span className="hidden lg:inline tracking-tight">Sign Up</span>
              </Link>
            </div>
          )}
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

