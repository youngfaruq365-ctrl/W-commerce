import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';

// --- Shared Motion Primitives ---

const TRANSITION_SPRING = { type: 'spring', damping: 25, stiffness: 300 };
const TRANSITION_SMOOTH = { type: 'tween', duration: 0.3, ease: 'easeOut' };
const TRANSITION_EMPHASIS = { type: 'spring', damping: 20, stiffness: 200 };

export const PageTransition = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={TRANSITION_SMOOTH}
    className={className}
    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
  >
    {children}
  </motion.div>
);

export const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ ...TRANSITION_SPRING, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export const InteractiveLift = ({ children, className = '', onClick }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.01 }}
    whileTap={{ y: 0, scale: 0.98 }}
    transition={TRANSITION_SPRING}
    className={className}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    {children}
  </motion.div>
);

export const InteractiveScale = ({ children, className = '', onClick }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={TRANSITION_SPRING}
    className={className}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    {children}
  </motion.div>
);

export const StaggerContainer = ({ children, className = '', staggerDelay = 0.05 }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
    initial="hidden"
    animate="show"
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = '' }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: TRANSITION_SPRING }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const SlideReveal = ({ children, isOpen, direction = 'right', className = '' }) => {
  const getInitial = () => {
    switch(direction) {
      case 'right': return { x: '100%', opacity: 0 };
      case 'left': return { x: '-100%', opacity: 0 };
      case 'up': return { y: '100%', opacity: 0 };
      case 'down': return { y: '-100%', opacity: 0 };
      default: return { opacity: 0 };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={getInitial()}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={getInitial()}
          transition={TRANSITION_SPRING}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ParallaxScroll = ({ children, offset = 50, className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 20 });
  
  return (
    <motion.div ref={ref} style={{ y: smoothY }} className={className}>
      {children}
    </motion.div>
  );
};

export const MagneticButton = ({ children, className = '', onClick }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;
  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {children}
    </motion.button>
  );
};

export const HoverScale = ({ children, className = '', scale = 1.05 }) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
    className={className}
  >
    {children}
  </motion.div>
);

export const PageReveal = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);
