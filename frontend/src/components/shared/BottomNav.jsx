import React from 'react';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const BottomNav = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { cartItems } = useCartStore();

  const navItems = [
    { name: 'Home',    path: '/',       icon: Home },
    { name: 'Shop',    path: '/shop',   icon: Search },
    {
      name: 'Cart',
      path: '/cart',
      icon: ShoppingCart,
      badge: cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0,
    },
    {
      name: 'Profile',
      path: isAuthenticated
        ? user?.role?.toUpperCase() === 'SELLER' ? '/seller/dashboard' 
        : user?.role?.toUpperCase() === 'ADMIN' ? '/admin/dashboard'
        : '/buyer/dashboard'
        : '/login',
      icon: User,
    },
  ];

  if (['/login', '/signup', '/payai'].includes(location.pathname) || location.pathname.startsWith('/messages')) return null;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 md:hidden w-[92%] max-w-[400px] pointer-events-none animate-slide-up">
      <nav
        className="relative neu-panel rounded-full px-2 py-2 flex justify-around items-center pointer-events-auto"
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className="relative flex flex-col items-center justify-center p-2 group"
              aria-label={item.name}
            >
              {/* Active tab: filled pill */}
              {isActive ? (
                <div className="flex items-center justify-center neu-card-pressed text-[#006cff] px-4 py-2.5 rounded-full shadow-md transition-all duration-300">
                  <Icon size={20} strokeWidth={2.5} />
                  <span className="ml-2 text-xs font-bold tracking-wide hidden sm:block">{item.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 px-3 py-1 rounded-full transition-all duration-300">
                  <Icon
                    size={22}
                    strokeWidth={2}
                    className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors duration-300 group-hover:-translate-y-1"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -bottom-4 group-hover:bottom-0 group-hover:relative">
                    {item.name}
                  </span>
                </div>
              )}

              {/* Cart badge */}
              {item.badge > 0 && (
                <span className="absolute top-0 right-0 min-w-[20px] h-[20px] bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full text-[11px] font-bold flex items-center justify-center px-1 shadow-md border-2 border-[var(--bg-secondary)] dark:border-slate-800">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
