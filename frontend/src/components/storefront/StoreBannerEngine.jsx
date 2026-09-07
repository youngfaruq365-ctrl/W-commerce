import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const clipPaths = {
  // Geometric (8)
  slant: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
  diagonalCut: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)',
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  chevron: 'polygon(100% 0, 100% 75%, 50% 100%, 0 75%, 0 0)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  zigzag: 'polygon(0 0, 100% 0, 100% 90%, 95% 100%, 90% 90%, 85% 100%, 80% 90%, 75% 100%, 70% 90%, 65% 100%, 60% 90%, 55% 100%, 50% 90%, 45% 100%, 40% 90%, 35% 100%, 30% 90%, 25% 100%, 20% 90%, 15% 100%, 10% 90%, 5% 100%, 0 90%)',
  stairs: 'polygon(0 0, 100% 0, 100% 20%, 80% 20%, 80% 40%, 60% 40%, 60% 60%, 40% 60%, 40% 80%, 20% 80%, 20% 100%, 0 100%)',
  
  // Organic (4)
  wave: 'polygon(0% 0%, 100% 0%, 100% 80%, 80% 100%, 50% 80%, 20% 100%, 0% 80%)',
  blob: 'ellipse(60% 50% at 50% 50%)',
  curve: 'ellipse(120% 100% at 50% 0%)',
  cloud: 'ellipse(70% 60% at 50% 40%)',
  
  // Premium (4)
  arch: 'ellipse(80% 100% at 50% 0%)',
  pillar: 'inset(5% 15% 5% 15% round 30px)',
  split: 'polygon(0 0, 48% 0, 48% 100%, 0 100%)',
  minimal: 'inset(4% round 12px)',
  
  // Product-focused (4)
  showcase: 'circle(45% at 50% 50%)',
  spotlight: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)',
  frame: 'inset(16px round 8px)',
  zoom: 'inset(0)'
};

const StoreBannerEngine = ({ template }) => {
  const navigate = useNavigate();
  const {
    style = 'slant',
    bgImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80',
    title = 'Welcome to Our Store',
    subtitle = 'Discover our latest premium collection',
    overlayColor = 'rgba(15, 23, 42, 0.5)',
    themeColor = '#ffffff'
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
