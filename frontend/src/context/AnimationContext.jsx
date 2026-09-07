import React, { createContext, useContext, useState, useEffect } from 'react';

// Levels: 'Minimal' (no motion), 'Normal' (standard fades), 'Rich' (springs & bounces), 'Ultra' (heavy effects)
const AnimationContext = createContext();

export const useAnimationLevel = () => useContext(AnimationContext);

export const AnimationProvider = ({ children }) => {
  const [level, setLevel] = useState('Rich'); // Default
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check OS preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    if (mediaQuery.matches) {
      setLevel('Minimal');
    }

    const handler = (e) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setLevel('Minimal');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const changeLevel = (newLevel) => {
    if (prefersReducedMotion && newLevel !== 'Minimal') {
      console.warn("OS prefers reduced motion. Overriding temporarily, but not recommended.");
    }
    setLevel(newLevel);
  };

  // Helper to get variants based on level
  const getVariant = (variantObj) => {
    if (level === 'Minimal') {
      // Return a stripped down version that only does opacity
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.1 } },
        exit: { opacity: 0, transition: { duration: 0.1 } }
      };
    }
    return variantObj;
  };

  return (
    <AnimationContext.Provider value={{ level, changeLevel, prefersReducedMotion, getVariant }}>
      {children}
    </AnimationContext.Provider>
  );
};
