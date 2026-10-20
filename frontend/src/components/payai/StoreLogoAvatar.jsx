import React, { useState } from 'react';
import { Store } from 'lucide-react';

/**
 * Checks if a store logo URL is invalid, empty, or points to generic product image fallbacks
 * (such as the white smartwatch photo photo-1523275335684-37898b6baf30).
 */
export const isInvalidStoreLogo = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  const lower = url.toLowerCase();
  if (lower.includes('photo-1523275335684-37898b6baf30')) return true; // Smartwatch photo
  if (lower.includes('photo-1526170375885')) return true; // Generic item
  if (lower.includes('photo-1472851294608')) return true; // Stock storefront
  return false;
};

/**
 * Extracts a clean 2-character monogram from a store name
 * e.g. "afritrove.com Official Store" -> "AF", "Afritrove" -> "AF", "Gymshark" -> "GS"
 */
export const getStoreMonogram = (storeName = '') => {
  if (!storeName || typeof storeName !== 'string') return 'ST';
  const cleaned = storeName
    .replace(/\.com|\.ng|\.co|\.org|\.io|official|store|shop/gi, '')
    .trim();
  const words = (cleaned || storeName).split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const single = words[0] || 'ST';
  return single.slice(0, 2).toUpperCase();
};

/**
 * Generates a consistent, rich brand gradient palette based on store name
 */
export const getStoreBrandGradient = (storeName = '') => {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-500',
    'from-blue-600 via-indigo-600 to-cyan-500',
    'from-violet-600 via-purple-700 to-rose-500',
    'from-emerald-600 via-teal-600 to-cyan-600',
    'from-amber-600 via-orange-600 to-rose-600',
    'from-rose-600 via-pink-600 to-purple-600',
    'from-sky-600 via-blue-600 to-indigo-700'
  ];
  let hash = 0;
  for (let i = 0; i < storeName.length; i++) {
    hash = storeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

/**
 * Resolves relative and absolute logo URLs safely
 */
export const resolveStoreLogoUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  let clean = url.replace(/\\/g, '/');
  if (clean.startsWith('uploads/')) clean = '/' + clean;
  else if (!clean.startsWith('/')) clean = '/' + clean;
  return clean;
};

export default function StoreLogoAvatar({
  store,
  className = '',
  textClassName = 'text-xs sm:text-sm font-black',
  iconSize = 28
}) {
  const [imgError, setImgError] = useState(false);
  const storeName = store?.storeName || store?.name || 'Store';
  const logoUrl = store?.logoUrl || store?.logo;
  const hasValidLogo = !imgError && !isInvalidStoreLogo(logoUrl);

  if (hasValidLogo) {
    return (
      <img
        src={resolveStoreLogoUrl(logoUrl)}
        alt={storeName}
        className={`w-full h-full object-cover rounded-full ${className}`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  const monogram = getStoreMonogram(storeName);
  const gradient = getStoreBrandGradient(storeName);

  return (
    <div
      className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white relative select-none overflow-hidden shadow-inner ${className}`}
      title={storeName}
    >
      {/* Background store watermark icon */}
      <Store
        size={iconSize}
        className="absolute -bottom-1 -right-1 text-white/20 pointer-events-none"
      />
      {/* Monogram */}
      <span className={`tracking-wider font-black drop-shadow-md z-10 leading-none ${textClassName}`}>
        {monogram}
      </span>
    </div>
  );
}
