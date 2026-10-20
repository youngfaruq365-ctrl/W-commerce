import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const WPageTransition = ({ children, className = '' }) => {
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

  const pageVariants = {
    initial: { opacity: 0, y: 15, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -15, scale: 0.99 }
  };

  return (
    <div className={`w-full ${className}`}>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-[var(--bg-secondary)] overflow-hidden pointer-events-none">
          <motion.div
            className="h-full bg-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray)]"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "70%", "100%"] }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      )}
      {children ? (
        <motion.div
          className="w-full h-full"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
};
