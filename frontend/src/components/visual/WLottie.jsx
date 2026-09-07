import React, { Suspense, useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { AnimationRegistry } from './AnimationRegistry';

export const WLottie = ({ name, className = '', loop = true, autoplay = true, ...props }) => {
  const [animationData, setAnimationData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const importFn = AnimationRegistry[name];
        if (!importFn) {
            throw new Error(`Animation "${name}" not found in AnimationRegistry.`);
        }
        const module = await importFn();
        setAnimationData(module.default || module);
      } catch (err) {
        setError(true);
      }
    };
    loadAnimation();
  }, [name]);

  if (error) return <div className={`w-16 h-16 bg-red-100 flex items-center justify-center text-red-500 ${className}`}>Error</div>;
  if (!animationData) return <div className={`w-16 h-16 animate-pulse bg-gray-200 rounded-lg ${className}`} />;

  return (
    <div className={className}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} {...props} />
    </div>
  );
};

export default WLottie;
