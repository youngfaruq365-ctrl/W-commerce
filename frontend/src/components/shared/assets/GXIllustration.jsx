import React, { useState, useEffect } from 'react';
import AssetRegistry from '../../../assets/AssetRegistry';
import useAssetStore from '../../../store/assetStore';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';

const fallbackImages = {
  'hero': PLACEHOLDER_IMAGE,
  'empty.cart': PLACEHOLDER_IMAGE,
  'empty.orders': PLACEHOLDER_IMAGE,
  'empty.inventory': PLACEHOLDER_IMAGE,
  'default': PLACEHOLDER_IMAGE
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
