import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MagneticButton: A button that slightly attracts to the cursor when hovering.
 */
export const MagneticButton = ({ children, className = '', onClick, ...props }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={`anim-magnetic ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * SpringModal: A framer-motion modal with spring animation.
 */
export const SpringModal = ({ isOpen, onClose, children, className = '' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-backdrop-fade"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden ${className}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * RevealText: Progressively reveals text or content.
 */
export const RevealContent = ({ children, delay = 0, className = '', ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * HoverLiftCard: A card that lifts slightly and shows a shadow on hover.
 */
export const HoverLiftCard = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`rounded-2xl transition-all ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * SlideInToast: Wrapper for toast notifications.
 */
export const SlideInToast = ({ isVisible, children, className = '', onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`fixed right-4 top-4 z-50 ${className}`}
          onClick={onClose}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * RippleClick: A component that renders a ripple effect inside on click.
 */
export const RippleClick = ({ children, className = '', onClick, ...props }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);

    if (onClick) onClick(e);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <div 
      className={`anim-ripple relative overflow-hidden cursor-pointer ${className}`} 
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple-span"
          style={{
            left: r.x - 20,
            top: r.y - 20,
            width: 40,
            height: 40
          }}
        />
      ))}
    </div>
  );
};

/**
 * Interactive: Standardized hover and tap effects.
 */
export const Interactive = ({ children, className = '', scale = 0.95, hoverScale = 1.02, ...props }) => (
  <motion.div
    whileHover={{ scale: hoverScale }}
    whileTap={{ scale }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
    className={`cursor-pointer ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * HoverGlow: Adds a glowing shadow on hover.
 */
export const HoverGlow = ({ children, className = '', color = 'rgba(59, 130, 246, 0.4)', ...props }) => (
  <motion.div
    whileHover={{ boxShadow: `0 0 25px ${color}` }}
    transition={{ duration: 0.3 }}
    className={`rounded-2xl transition-shadow ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * ActivePress: Micro-interaction for a button press.
 */
export const ActivePress = ({ children, className = '', ...props }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95, opacity: 0.8 }}
    transition={{ type: "spring", stiffness: 500, damping: 20 }}
    className={`transition-all ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);
