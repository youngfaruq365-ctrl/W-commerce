import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

export const AnimatedList = ({ children, className = '', as = 'div', ...rest }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const AnimatedItem = ({ children, className = '', as = 'div', ...rest }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component
      variants={itemVariants}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
};
