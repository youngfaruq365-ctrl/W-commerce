import React, { Suspense, lazy } from 'react';
import { useAnimationLevel } from '../../context/AnimationContext';

// We use React.lazy to avoid bundling all lottie files in the main chunk
// We are dynamically importing lottie-react and the json file
const Lottie = lazy(() => import('lottie-react'));

/**
 * LottieWrapper
 * A highly optimized wrapper that:
 * 1. Lazy loads lottie-react and the animation JSON
 * 2. Respects user's reduced-motion preferences
 * 3. Provides a fallback skeleton or static image while loading
 * 
 * @param {string} animationPath - Path to the local JSON file in public/animations or an import
 * @param {boolean} loop - Whether to loop the animation
 * @param {object} animationData - Pre-imported JSON data (if not using path)
 */
const LottieWrapper = ({ 
  animationData, 
  animationPath, 
  loop = true, 
  className = "", 
  fallback = null 
}) => {
  const { prefersReducedMotion } = useAnimationLevel();

  // If user prefers reduced motion, we should ideally show a static frame or stop looping
  const shouldLoop = prefersReducedMotion ? false : loop;

  // We need to fetch the animation data if a path is provided instead of raw data
  const [data, setData] = React.useState(animationData);

  React.useEffect(() => {
    if (animationPath && !data) {
      fetch(animationPath)
        .then(res => res.json())
    }
  }, [animationPath, data]);

  if (!data) return fallback || <div className={`animate-pulse bg-[var(--bg-tertiary)] rounded-xl ${className}`} />;

  return (
    <div className={className}>
      <Suspense fallback={fallback || <div className="w-full h-full animate-pulse bg-[var(--bg-tertiary)] rounded-xl" />}>
        <Lottie 
          animationData={data} 
          loop={shouldLoop} 
          autoplay={!prefersReducedMotion}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
    </div>
  );
};

export default LottieWrapper;
