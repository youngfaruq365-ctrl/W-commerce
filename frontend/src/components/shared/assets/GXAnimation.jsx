import React, { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import { apiClient as axios } from '@/utils/apiClient';
import AssetRegistry from '../../../assets/AssetRegistry';
import useAssetStore from '../../../store/assetStore';

const fallbackUrls = {
  'seller.wallet': 'https://assets2.lottiefiles.com/packages/lf20_q5pk6p1k.json',
  'seller.verification': 'https://assets5.lottiefiles.com/packages/lf20_xyadoh9h.json',
  'shared.bell': 'https://assets9.lottiefiles.com/packages/lf20_xjxzy1p2.json',
  'hero': 'https://assets4.lottiefiles.com/packages/lf20_ujxkchwv.json',
  'empty': 'https://assets8.lottiefiles.com/private_files/lf30_cgfdhxgx.json',
  'default': 'https://assets8.lottiefiles.com/private_files/lf30_cgfdhxgx.json'
};

const GXAnimation = ({ name, className = '', style = {}, loop = true, autoplay = true, themeOverride = null }) => {
  const { theme } = useAssetStore();
  const activeTheme = themeOverride || theme;
  const initialData = AssetRegistry.getAnimation(name, activeTheme);
  
  const [animationData, setAnimationData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (initialData && typeof initialData === 'object') {
      setAnimationData(initialData);
    } else {
      const url = fallbackUrls[name] || fallbackUrls['default'];
      axios.get(url).then(res => setAnimationData(res.data)).catch(err => console.warn('[GXAnimation] Lottie animation failed to load for:', name, err?.message || err));
    }
  }, [initialData, name]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
    };
  }, []);

  if (!animationData) {
    return (
      <div 
        className={`gx-anim-placeholder animate-pulse ${className}`} 
        style={{ ...style, minWidth: 24, minHeight: 24, backgroundColor: '#222', borderRadius: 8 }}
      />
    );
  }

  return (
    <div ref={containerRef} className={`gx-animation ${className}`} style={style}>
      {isVisible ? (
        <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
      ) : (
        <div style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
};

export default GXAnimation;
