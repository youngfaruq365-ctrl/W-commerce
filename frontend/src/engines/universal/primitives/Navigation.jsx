import React, { useState } from 'react';
import { ShoppingCart, User, Search, Menu, X, ChevronRight } from 'lucide-react';
import { usePreview } from '../commerce/PreviewContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfilePanel } from './UserProfilePanel';

const Logo = ({ store, onClick }) => (
  <div onClick={onClick} className="font-black text-xl tracking-tighter uppercase cursor-pointer flex items-center gap-2" style={{ fontFamily: 'var(--s-font-heading)' }}>
    {store?.logo && <img src={store.logo} alt={store?.name} className="h-6 w-auto object-contain" />}
    <span>{store?.name}</span>
  </div>
);

const CartBtn = ({ cartCount, onClick }) => (
  <motion.button 
    onClick={onClick} 
    className="relative cursor-pointer opacity-90 hover:opacity-100 transition-all duration-300"
    whileHover={{ scale: 1.15, rotateY: 15, rotateX: -10, z: 20 }}
    whileTap={{ scale: 0.9 }}
    style={{ transformStyle: 'preserve-3d', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15)) drop-shadow(0 1px 2px rgba(255,255,255,0.1))' }}
  >
    <div style={{ transform: 'translateZ(10px)' }}>
      <ShoppingCart size={22} strokeWidth={2.5} />
    </div>
    {cartCount > 0 && (
      <span className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--s-primary)] text-[var(--s-bg)] rounded-full text-[10px] font-black flex items-center justify-center shadow-lg"
        style={{ transform: 'translateZ(20px)' }}>
        {cartCount}
      </span>
    )}
  </motion.button>
);

const SearchIcon3D = ({ onClick, className }) => (
  <motion.div 
    onClick={onClick} 
    className={`cursor-pointer opacity-90 hover:opacity-100 transition-all duration-300 ${className}`}
    whileHover={{ scale: 1.15, rotateY: 15, rotateX: -10, z: 20 }}
    whileTap={{ scale: 0.9 }}
    style={{ transformStyle: 'preserve-3d', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15)) drop-shadow(0 1px 2px rgba(255,255,255,0.1))' }}
  >
    <div style={{ transform: 'translateZ(10px)' }}>
      <Search size={22} strokeWidth={2.5} />
    </div>
  </motion.div>
);

const UserIcon3D = ({ onClick, className }) => (
  <motion.div 
    onClick={onClick} 
    className={`cursor-pointer opacity-90 hover:opacity-100 transition-all duration-300 ${className}`}
    whileHover={{ scale: 1.15, rotateY: 15, rotateX: -10, z: 20 }}
    whileTap={{ scale: 0.9 }}
    style={{ transformStyle: 'preserve-3d', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15)) drop-shadow(0 1px 2px rgba(255,255,255,0.1))' }}
  >
    <div style={{ transform: 'translateZ(10px)' }}>
      <User size={22} strokeWidth={2.5} />
    </div>
  </motion.div>
);

const NavLinks = ({ store, activePage, setActivePage, className = '' }) => (
  <div className={`flex gap-6 ${className}`}>
    {(store.pages || ['home']).map(page => (
      <span key={page} onClick={() => setActivePage(page)}
        className={`capitalize cursor-pointer text-sm font-bold transition-all pb-0.5 border-b-2 ${
          activePage === page ? 'border-[var(--s-primary)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
        }`}>
        {page}
      </span>
    ))}
  </div>
);

// Shared hook to manage profile panel state
const useProfilePanel = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return { isProfileOpen, openProfile: () => setIsProfileOpen(true), closeProfile: () => setIsProfileOpen(false) };
};

// ── Minimal Nav ───────────────────────────────────────────────────────────────
export const NavMinimal = ({ store, activePage, setActivePage, cartCount, onCartClick }) => {
  const { setIsSearchOpen } = usePreview();
  const { isProfileOpen, openProfile, closeProfile } = useProfilePanel();
  return (
    <>
      <nav className="w-full px-6 md:px-10 py-5 flex justify-between items-center bg-[var(--s-bg)] border-b border-[var(--s-border,transparent)] sticky top-0 z-40 backdrop-blur-sm bg-opacity-95">
        <Logo store={store} onClick={() => setActivePage('home')} />
        <NavLinks store={store} activePage={activePage} setActivePage={setActivePage} className="hidden md:flex" />
        <div className="flex items-center gap-5">
          <SearchIcon3D className="hidden md:block" onClick={() => setIsSearchOpen(true)} />
          <UserIcon3D className="hidden md:block" onClick={openProfile} />
          <CartBtn cartCount={cartCount} onClick={onCartClick} />
        </div>
      </nav>
      <UserProfilePanel isOpen={isProfileOpen} onClose={closeProfile} />
    </>
  );
};

// ── Floating Nav ──────────────────────────────────────────────────────────────
export const NavFloating = ({ store, activePage, setActivePage, cartCount, onCartClick }) => (
  <div className="w-full px-6 pt-6 absolute top-0 left-0 right-0 z-40 pointer-events-none">
    <nav className="mx-auto max-w-5xl bg-white/90 backdrop-blur-xl text-black rounded-full shadow-2xl border border-white/50 px-6 py-4 flex items-center justify-between pointer-events-auto">
      <Logo store={store} onClick={() => setActivePage('home')} />
      <NavLinks store={store} activePage={activePage} setActivePage={setActivePage} className="hidden md:flex" />
      <CartBtn cartCount={cartCount} onClick={onCartClick} />
    </nav>
  </div>
);

// ── Centered Nav ──────────────────────────────────────────────────────────────
export const NavCentered = ({ store, activePage, setActivePage, cartCount, onCartClick }) => {
  const { setIsSearchOpen } = usePreview();
  return (
    <nav className="w-full bg-[var(--s-bg)] border-b border-[var(--s-border,#f0f0f0)] sticky top-0 z-40">
      <div className="flex justify-between items-center px-8 py-4">
        <SearchIcon3D onClick={() => setIsSearchOpen(true)} />
        <Logo store={store} onClick={() => setActivePage('home')} />
        <CartBtn cartCount={cartCount} onClick={onCartClick} />
      </div>
      <div className="flex justify-center gap-8 pb-4">
        <NavLinks store={store} activePage={activePage} setActivePage={setActivePage} />
      </div>
    </nav>
  );
};

// ── Glass Nav ─────────────────────────────────────────────────────────────────
export const NavGlass = ({ store, activePage, setActivePage, cartCount, onCartClick }) => {
  const { setIsSearchOpen } = usePreview();
  return (
    <nav className="absolute top-0 left-0 right-0 px-8 py-5 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/10 text-white z-40">
      <Logo store={store} onClick={() => setActivePage('home')} />
      <NavLinks store={store} activePage={activePage} setActivePage={setActivePage} className="hidden md:flex gap-8 text-white" />
      <div className="flex items-center gap-5 text-white">
        <SearchIcon3D onClick={() => setIsSearchOpen(true)} />
        <CartBtn cartCount={cartCount} onClick={onCartClick} />
      </div>
    </nav>
  );
};

// ── Sidebar Nav ───────────────────────────────────────────────────────────────
export const NavSidebar = ({ store, activePage, setActivePage, cartCount, onCartClick }) => {
  const { isProfileOpen, openProfile, closeProfile } = useProfilePanel();
  return (
    <>
      <nav className="absolute top-0 left-0 bottom-0 w-64 border-r border-[var(--s-border,#f0f0f0)] bg-[var(--s-bg)] flex flex-col z-40 shadow-sm">
        <div className="p-8 border-b border-[var(--s-border,#f0f0f0)]"><Logo store={store} onClick={() => setActivePage('home')} /></div>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {(store.pages || ['home']).map(page => (
              <button key={page} onClick={() => setActivePage(page)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-bold capitalize transition-all ${
                  activePage === page ? 'bg-[var(--s-primary)] text-[var(--s-bg)]' : 'opacity-60 hover:opacity-100 hover:bg-[var(--s-surface)]'
                }`}>{page}</button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-[var(--s-border,#f0f0f0)] flex items-center justify-between">
          <UserIcon3D onClick={openProfile} />
          <CartBtn cartCount={cartCount} onClick={onCartClick} />
        </div>
      </nav>
      <UserProfilePanel isOpen={isProfileOpen} onClose={closeProfile} />
    </>
  );
};

// ── Pill Nav ──────────────────────────────────────────────────────────────────
export const PillNav = ({ store, activePage, setActivePage, cartCount, onCartClick }) => (
  <nav className="w-full px-6 py-4 flex justify-between items-center bg-[var(--s-bg)] sticky top-0 z-40">
    <Logo store={store} onClick={() => setActivePage('home')} />
    <div className="hidden md:flex bg-[var(--s-surface)] rounded-full p-1 gap-1">
      {(store.pages || ['home']).map(page => (
        <button key={page} onClick={() => setActivePage(page)}
          className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-all ${
            activePage === page ? 'bg-[var(--s-primary)] text-[var(--s-bg)] shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}>{page}</button>
      ))}
    </div>
    <CartBtn cartCount={cartCount} onClick={onCartClick} />
  </nav>
);

// ── Overlay Nav ───────────────────────────────────────────────────────────────
export const OverlayNav = ({ store, activePage, setActivePage, cartCount, onCartClick }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <nav className="absolute top-0 left-0 right-0 px-8 py-6 flex justify-between items-center text-white z-40">
        <Logo store={store} onClick={() => setActivePage('home')} />
        <div className="flex items-center gap-4">
          <CartBtn cartCount={cartCount} onClick={onCartClick} />
          <button onClick={() => setOpen(true)} className="opacity-80 hover:opacity-100"><Menu size={24} /></button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-center text-white">
            <button onClick={() => setOpen(false)} className="absolute top-8 right-8 opacity-60 hover:opacity-100"><X size={28} /></button>
            <div className="flex flex-col items-center gap-8">
              {(store.pages || ['home']).map(page => (
                <button key={page} onClick={() => { setActivePage(page); setOpen(false); }}
                  className={`text-4xl font-black capitalize tracking-tight transition-opacity ${activePage === page ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                  {page}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Editorial Nav ─────────────────────────────────────────────────────────────
export const EditorialNav = ({ store, activePage, setActivePage, cartCount, onCartClick }) => (
  <nav className="w-full px-10 py-6 flex justify-between items-center bg-[var(--s-bg)] border-b-2 border-[var(--s-text)] sticky top-0 z-40">
    <div className="flex gap-8 text-xs font-black uppercase tracking-widest">
      {(store.pages || ['home']).slice(0, 3).map(page => (
        <span key={page} onClick={() => setActivePage(page)}
          className={`cursor-pointer transition-opacity ${activePage === page ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>{page}</span>
      ))}
    </div>
    <Logo store={store} onClick={() => setActivePage('home')} />
    <div className="flex gap-8 text-xs font-black uppercase tracking-widest">
      {(store.pages || ['home']).slice(3).map(page => (
        <span key={page} onClick={() => setActivePage(page)}
          className={`cursor-pointer transition-opacity ${activePage === page ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>{page}</span>
      ))}
      <CartBtn cartCount={cartCount} onClick={onCartClick} />
    </div>
  </nav>
);

// ── Mega Nav ──────────────────────────────────────────────────────────────────
export const NavMega = NavMinimal;
