import { useReducedMotion } from 'framer-motion';

// Shared animation durations
export const durations = {
  micro: 0.2, // 150-250ms
  normal: 0.3, // 250-400ms
  major: 0.5, // 400-700ms
  generation: 0.8, // 700-1200ms
};

// Shared easing curves
export const easings = {
  default: [0.25, 0.1, 0.25, 1.0],
  bounce: [0.175, 0.885, 0.32, 1.275],
  smooth: [0.4, 0, 0.2, 1],
  spring: { type: 'spring', stiffness: 400, damping: 25 },
};

// Static presets for components that don't need hooks
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.normal, ease: easings.smooth }
};

export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: durations.normal, ease: easings.bounce }
};

export const fadeDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: durations.normal, ease: easings.bounce }
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: durations.normal, ease: easings.smooth }
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: durations.normal, ease: easings.smooth }
};

export const pop = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: easings.spring
};

export const bounce = {
  initial: { y: 0 },
  animate: { 
    y: [0, -15, 0],
    transition: { duration: 1, ease: 'easeInOut', repeat: Infinity }
  }
};

export const pulse = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, ease: 'easeInOut', repeat: Infinity }
  }
};

export const motionMap = {
  fadeIn, fadeUp, fadeDown, slideLeft, slideRight, pop, bounce, pulse
};

// Presets generator to respect reduced motion
export const useMotionPresets = () => {
  const prefersReduced = useReducedMotion();

  return {
    fadeIn: {
      ...fadeIn,
      transition: { duration: durations.normal, ease: easings.smooth }
    },
    fadeUp: {
      initial: { opacity: 0, y: prefersReduced ? 0 : 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: prefersReduced ? 0 : 20 },
      transition: { duration: durations.normal, ease: easings.bounce }
    },
    fadeDown: {
      initial: { opacity: 0, y: prefersReduced ? 0 : -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: prefersReduced ? 0 : -20 },
      transition: { duration: durations.normal, ease: easings.bounce }
    },
    scaleIn: {
      initial: { opacity: 0, scale: prefersReduced ? 1 : 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: prefersReduced ? 1 : 0.95 },
      transition: { duration: durations.normal, ease: easings.bounce }
    },
    successPop: {
      initial: { opacity: 0, scale: prefersReduced ? 1 : 0.5 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: prefersReduced ? 1 : 0.8 },
      transition: { type: prefersReduced ? 'tween' : 'spring', stiffness: 200, damping: 15 }
    },
    shake: {
      animate: prefersReduced ? { opacity: 1 } : { x: [0, -10, 10, -10, 10, 0] },
      transition: { duration: durations.major, ease: easings.default }
    },
    staggerChildren: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.1
        }
      }
    },
    staggerItem: {
      initial: { opacity: 0, y: prefersReduced ? 0 : 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: durations.normal, ease: easings.smooth }
    }
  };
};
