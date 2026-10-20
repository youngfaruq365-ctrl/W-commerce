import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveProductImage, isVideoUrl } from '../../utils/imageHelpers';

export const WImageLoader = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc,
  objectFit = 'object-cover',
  layoutId,
  controls = false
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setHasError(false);
    setAttemptedFallback(false);
  }, [src]);

  const handleError = () => {
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      const fallback = fallbackSrc || resolveProductImage({ title: alt }, alt || '');
      if (fallback && fallback !== currentSrc) {
        setCurrentSrc(fallback);
        setIsLoaded(false);
        return;
      }
    }
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[var(--bg-secondary)] flex items-center justify-center z-10"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ translateX: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 transition-all duration-700">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
           <span className="text-xs mt-2 font-medium">No Image</span>
        </div>
      ) : isVideoUrl(currentSrc) ? (
        <video
          key={currentSrc}
          src={currentSrc}
          controls={controls}
          autoPlay={controls}
          className={`absolute inset-0 w-full h-full ${objectFit} transition-all duration-700`}
          muted={!controls}
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          onError={handleError}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSrc}
            layoutId={layoutId}
            src={currentSrc}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 w-full h-full ${objectFit} transition-all duration-700 ${
              isLoaded ? 'blur-0 scale-100 opacity-100' : 'blur-xl scale-105 opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
          />
        </AnimatePresence>
      )}
    </div>
  );
};
