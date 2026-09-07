import React, { useState, useEffect } from 'react';
import AssetRegistry from '../../../assets/AssetRegistry';
import useAssetStore from '../../../store/assetStore';

const fallbackImages = {
  'hero': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
  'empty.cart': 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80',
  'empty.orders': 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&q=80',
  'empty.inventory': 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
};

const GXIllustration = ({ name, className = '', style = {}, themeOverride = null }) => {
  const { theme } = useAssetStore();
  const activeTheme = themeOverride || theme;
  const initialPath = AssetRegistry.getIllustration(name, activeTheme);
  const [illustrationPath, setIllustrationPath] = useState(initialPath);

  useEffect(() => {
    if (!initialPath) {
      setIllustrationPath(fallbackImages[name] || fallbackImages['default']);
    } else {
      setIllustrationPath(initialPath);
    }
  }, [initialPath, name]);

  if (!illustrationPath) {
    return (
      <div 
        className={`gx-illustration-placeholder ${className}`} 
        style={{ ...style, minWidth: 100, minHeight: 100, backgroundColor: '#111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title={`Missing illustration: ${name}`}
      >
        <span style={{color: '#666', fontSize: 12}}>{name}</span>
      </div>
    );
  }

  return (
    <img 
      src={illustrationPath} 
      alt={`${name} illustration`} 
      className={`gx-illustration ${className}`} 
      style={style} 
    />
  );
};

export default GXIllustration;
