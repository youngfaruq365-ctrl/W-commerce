import React from 'react';
import { motion } from 'framer-motion';
import { useAnimationLevel } from '../../context/AnimationContext';

/**
 * SVGAnimator
 * Wrapper to easily animate SVG strokes (drawing effect) using framer-motion.
 */
const SVGAnimator = ({ 
  children, 
  className = "", 
  duration = 1.5,
  delay = 0,
  strokeWidth = 2,
  strokeColor = "currentColor"
}) => {
  const { level } = useAnimationLevel();

  // If minimal motion, just show the SVG instantly
  if (level === 'Minimal') {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  // Animation variants for SVG paths
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        pathLength: { duration, ease: "easeInOut", delay },
        opacity: { duration: 0.2, delay }
      }
    }
  };

  // We need to clone the SVG children and inject motion properties
  // This is a simplified approach. In a real scenario, you'd pass the actual <motion.path> directly.
  // For standard usage, wrap your <svg> tags inside this, and ensure paths use motion.path.
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
      }}
    >
      {/* We use Context or cloneElement to pass variants to children if needed, 
          but usually the consumer will provide <motion.path variants={pathVariants}> inside. */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // If it's an SVG, we can inject default styles
          return React.cloneElement(child, {
            strokeWidth,
            stroke: strokeColor,
          });
        }
        return child;
      })}
    </motion.div>
  );
};

export const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom = { duration: 1, delay: 0 }) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", duration: custom.duration, bounce: 0, delay: custom.delay },
      opacity: { duration: 0.1, delay: custom.delay }
    }
  })
};

export default SVGAnimator;
