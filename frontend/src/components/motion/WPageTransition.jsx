import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const WPageTransition = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsNavigating(true);
    
    // Simulate navigation loading time (would typically tie to actual data fetching)
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-[var(--bg-secondary)] overflow-hidden"
        >
          <motion.div
            className="h-full bg-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray)]"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "70%", "100%"] }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
