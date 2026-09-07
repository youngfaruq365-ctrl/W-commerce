import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStyleProfile } from './styles/ExperienceStyleGenerator';
import { PreviewContextProvider, usePreview } from './commerce/PreviewContext';
import { CartDrawer } from './commerce/CartDrawer';
import { CelebrationEngine } from './motion/CelebrationEngine';
import { PageRenderer } from './pages/PageRenderer';
import { ThemeCustomizer } from './styles/ThemeCustomizer';
import { AnalyticsOverlay } from './components/AnalyticsOverlay';
import { MagicFill } from './components/MagicFill';
import { VirtualConcierge } from './components/VirtualConcierge';
import { SearchOverlay } from './components/SearchOverlay';

// Navigation Primitives
import { NavFloating, NavMinimal, NavCentered, NavGlass, NavSidebar, NavMega, EditorialNav, PillNav, OverlayNav } from './primitives/Navigation';
// Hero Primitives
import { HeroFullscreen, HeroSplit, HeroMinimal, HeroEditorial, HeroVideo, HeroParallax, HeroBento, HeroProduct, HeroStory, HeroImmersive, HeroAsymmetric, HeroCentered } from './primitives/Heroes';
// Grid Primitives
import { GridStandard, GridMasonry, GridBento, GridHorizontal, GridAsymmetric, GridFeatured, GridEditorial } from './primitives/Grids';
import { FeatureHighlights } from './primitives/Features';

const NavRegistry = { NavFloating, NavMinimal, NavCentered, NavGlass, NavSidebar, NavMega, EditorialNav, PillNav, OverlayNav };
const HeroRegistry = { HeroFullscreen, HeroSplit, HeroMinimal, HeroEditorial, HeroVideo, HeroParallax, HeroBento, HeroProduct, HeroStory, HeroImmersive, HeroAsymmetric, HeroCentered };
const GridRegistry = { GridStandard, GridMasonry, GridBento, GridHorizontal, GridAsymmetric, GridFeatured, GridEditorial };

// Page transition variants keyed by transition name
const PAGE_TRANSITIONS = {
  FadeTransition:        { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.35 } },
  SlideTransition:       { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -30 }, transition: { duration: 0.35 } },
  HorizontalTransition:  { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -60 }, transition: { duration: 0.3 } },
  ScaleTransition:       { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.02 }, transition: { duration: 0.35 } },
  CinematicTransition:   { initial: { opacity: 0, scale: 1.04 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0 }, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } },
  EditorialTransition:   { initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -40 }, transition: { duration: 0.5 } },
  MorphTransition:       { initial: { opacity: 0, scale: 0.9, filter: 'blur(10px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' }, exit: { opacity: 0, scale: 1.05 }, transition: { duration: 0.5 } },
  ImmersiveTransition:   { initial: { opacity: 0, clipPath: 'inset(100% 0 0 0)' }, animate: { opacity: 1, clipPath: 'inset(0% 0 0 0)' }, exit: { opacity: 0 }, transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } },
};

// ── Inner renderer (consumes context) ─────────────────────────────────────────
const ExperienceInner = ({ store, styleProfile }) => {
  const { activePage, setActivePage, isCartOpen, setIsCartOpen, cartCount, setActivePage: navTo } = usePreview();
  const [customCss, setCustomCss] = useState({});
  
  const NavComponent   = NavRegistry[styleProfile.nav]   || NavMinimal;
  const HeroComponent  = HeroRegistry[styleProfile.hero] || HeroFullscreen;
  const GridComponent  = GridRegistry[styleProfile.grid] || GridStandard;
  
  const transitionVars = PAGE_TRANSITIONS[styleProfile.transition] || PAGE_TRANSITIONS.FadeTransition;
  const motionVariants = {
    item: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }
  };

  const isSidebar = styleProfile.nav === 'NavSidebar';

  return (
    <div className="relative w-full min-h-full flex" style={{ ...styleProfile.css, ...customCss, backgroundColor: customCss['--s-bg'] || 'var(--s-bg)', color: customCss['--s-text'] || 'var(--s-text)', fontFamily: customCss['--s-font-body'] || 'var(--s-font-body)' }}>
      {/* Sidebar Nav */}
      {isSidebar && <NavComponent store={store} activePage={activePage} setActivePage={setActivePage} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />}

      {/* Main scroll area */}
      <div className={`flex-1 flex flex-col min-w-0 ${isSidebar ? 'pl-64' : ''}`}>
        {/* Top Nav */}
        {!isSidebar && <NavComponent store={store} activePage={activePage} setActivePage={setActivePage} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />}

        {/* Page content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} {...transitionVars}>
              {activePage === 'home' ? (
                <>
                  <HeroComponent store={store} profile={styleProfile} motionVariants={motionVariants} setActivePage={setActivePage} />
                  <GridComponent store={store} profile={styleProfile} motionVariants={motionVariants} styleProfile={styleProfile} />
                  <FeatureHighlights store={store} motionVariants={motionVariants} />
                </>
              ) : (
                <PageRenderer store={store} styleProfile={styleProfile} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="px-8 py-12 text-center opacity-40 text-xs border-t border-[var(--s-border,transparent)]">
          © {new Date().getFullYear()} {store.name} · Powered by GLOBALX
        </footer>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <CartDrawer
            style={styleProfile.cartStyle}
            onClose={() => setIsCartOpen(false)}
            onCheckout={() => { setIsCartOpen(false); setActivePage('checkout'); }}
          />
        )}
      </AnimatePresence>

      {/* Celebration Engine */}
      <CelebrationEngine celebrationStyle={styleProfile.celebrationStyle} />

      {/* Theme Customizer for Studio/Signature */}
      <ThemeCustomizer store={store} customCss={customCss} setCustomCss={setCustomCss} />

      {/* AI Magic Fill for Signature */}
      <MagicFill store={store} />

      {/* Virtual Concierge for Pro+ */}
      <VirtualConcierge store={store} />

      {/* X-Ray Analytics for Pro+ */}
      <AnalyticsOverlay store={store} />

      {/* Global Search Overlay */}
      <SearchOverlay store={store} />
    </div>
  );
};

// ── Public ExperienceRenderer ──────────────────────────────────────────────────
export const ExperienceRenderer = ({ store, previewMode = true }) => {
  if (!store) return null;
  const styleProfile = generateStyleProfile(store, previewMode);

  return (
    <PreviewContextProvider store={store}>
      <ExperienceInner store={store} styleProfile={styleProfile} />
    </PreviewContextProvider>
  );
};
