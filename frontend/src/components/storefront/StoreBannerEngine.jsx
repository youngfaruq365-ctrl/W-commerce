import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PLACEHOLDER_BANNER } from '@/constants/placeholders';

import { clipPaths } from '../../config/bannerStyles';

const StoreBannerEngine = ({ template }) => {
  const navigate = useNavigate();
  const {
    style = 'slant',
    bgImage = PLACEHOLDER_BANNER,
    title = 'Welcome to Our Store',
    subtitle = 'Discover our latest premium collection',
    overlayColor = 'rgba(15, 23, 42, 0.5)',
    themeColor = '#000000'
  } = template || {};

  const currentClipPath = clipPaths[style] || clipPaths.slant;

  // Determine specific animations based on style
  let motionProps = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  if (style === 'zoom') {
    motionProps = {
      initial: { scale: 1.1, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 1.2, ease: "easeOut" }
    };
  }

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden bg-slate-900 group">
      <motion.div
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          clipPath: currentClipPath,
        }}
        {...motionProps}
      >
        <div 
          className="absolute inset-0 transition-all duration-500"
          style={{ backgroundColor: overlayColor }}
        />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-4 drop-shadow-lg"
            style={{ color: themeColor }}
          >
            {title}
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-2xl font-light font-sans max-w-2xl drop-shadow-md"
            style={{ color: themeColor, opacity: 0.9 }}
          >
            {subtitle}
          </motion.p>
          
          <motion.button
            onClick={() => navigate('/collection')}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8 px-8 py-3 bg-white/20 backdrop-blur-md border border-white/40 text-white rounded-full font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white/30"
            style={{ color: themeColor }}
          >
            Shop Now
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default StoreBannerEngine;
