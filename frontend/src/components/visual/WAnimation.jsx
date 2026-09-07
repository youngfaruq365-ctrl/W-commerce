import React from 'react';
import WLottie from './WLottie';

/**
 * Universal Animation Entry Point.
 * Determines the best animation strategy (Lottie, SVG/CSS) based on the animation type.
 * Currently defaults to WLottie.
 */
export const WAnimation = ({ type, strategy = 'lottie', ...props }) => {
  if (strategy === 'lottie') {
    return <WLottie name={type} {...props} />;
  }
  
  // Future strategies (css, framer-motion presets) can be added here
  return <div>Unknown strategy</div>;
};

export default WAnimation;
