import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart, Search } from 'lucide-react';
import { WImageLoader } from '../motion/WImageLoader';

export const SmartProductCard = ({ 
  product, 
  variant, // Ignored, unified design system enforced
  onAddToCart,
  onQuickView
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // Fallbacks if data is missing
  const name = product?.title || product?.name || 'Unnamed Product';
  const price = product?.price || 0;
  
  const productImages = product?.images?.length > 0 
    ? product.images.map(img => {
        const url = img.url || img;
        return (typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))) ? url : `/${url}`;
      })
    : [product?.imageUrl || '/assets/splash_3d_box_1781971684931.png'];

  const image = productImages[0]; // Simplified for clean look
  const rating = product?.rating || 4.5;
  const reviewsCount = product?.reviewCount || product?.reviewsCount || 120;
  const seller = product?.store?.storeName || product?.store?.name || 'Verified Seller';

  const formatPrice = (p) => `₦${Number(p).toLocaleString()}`;

  return (
    <div 
      className="premium-glass rounded-3xl overflow-hidden group relative flex flex-col transition-all duration-500 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Wishlist */}
      <button 
        onClick={(e) => { e.preventDefault(); setIsWishlisted(!isWishlisted); }}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-black/5 hover:border-black/20 hover:scale-105 transition-all z-20"
      >
        <Heart size={16} fill={isWishlisted ? '#000' : 'none'} className={isWishlisted ? 'text-black' : 'text-gray-400'} />
      </button>

      {/* Image Area */}
      <Link to={`/product/${product?.id}`} className="relative aspect-square overflow-hidden bg-white flex items-center justify-center p-6">
        <WImageLoader 
          layoutId={`product-image-${product?.id}`} 
          src={image} 
          alt={name} 
          objectFit="contain"
          className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 mix-blend-multiply" 
        />
        
        {/* Quick Actions Hover */}
        <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
           <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-black hover:text-white transition-colors"
                onClick={(e) => { e.preventDefault(); if(onQuickView) onQuickView(product); }}>
             <Search size={20} />
           </div>
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col bg-white/40">
        <div className="mb-auto">
           <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">{seller}</p>
           <Link to={`/product/${product?.id}`}>
             <h3 className="font-semibold text-black line-clamp-2 text-sm leading-relaxed hover:opacity-70 transition-opacity">{name}</h3>
           </Link>
        </div>
        
        <div className="flex items-center gap-1 mt-3 mb-4">
          <Star size={12} className="text-black" fill="currentColor" />
          <span className="text-xs font-medium text-black">{rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({reviewsCount})</span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-black tracking-tight">{formatPrice(price)}</span>
          <button 
            onClick={(e) => { e.preventDefault(); onAddToCart && onAddToCart(product); }}
            className="btn-premium rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
