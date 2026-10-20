import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search } from 'lucide-react';
import { WImageLoader } from '../motion/WImageLoader';
import { resolveProductImage } from '../../utils/imageHelpers';

export const SmartProductCard = ({ 
  product, 
  variant, // Ignored, unified design system enforced
  onAddToCart,
  onQuickView
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  // Fallbacks if data is missing
  const name = product?.title || product?.name || 'Unnamed Product';
  const price = product?.price || 0;
  
  const image = resolveProductImage(product, name, product?.category);
  const nameInitials = name.slice(0, 2).toUpperCase();

  const formatPrice = (p) => `\u20A6${Number(p).toLocaleString()}`;

  return (
    <div 
      className="relative rounded-lg overflow-hidden shadow-2xl aspect-[2/3] flex flex-col group cursor-pointer transform transition-transform duration-500 hover:-translate-y-2 hover:shadow-3xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/product/${product?.id}`)}
      style={{
        boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.2)'
      }}
    >
      {/* Spine (Left edge like a book or thick card) */}
      <div className="absolute top-0 bottom-0 left-0 w-3 md:w-4 bg-gradient-to-r from-[#111] via-[#222] to-[#333] shadow-[inset_-2px_0_4px_rgba(0,0,0,0.8)] z-20" />
      
      {/* Metallic Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#555b61] via-[#e2e8f0] to-[#555b61] z-0 pl-3 md:pl-4 opacity-90" />
      <div className="absolute inset-0 bg-black/10 mix-blend-multiply z-0 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 pl-6 pr-4 py-4 h-full flex flex-col">
        
        {/* Center Product Image */}
        <div className="flex-1 flex items-center justify-center relative w-full h-full">
          <WImageLoader 
            layoutId={`product-image-${product?.id}`} 
            src={image} 
            alt={name} 
            objectFit="contain"
            className="w-[95%] h-[95%] drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-out group-hover:scale-110" 
          />
          
          {/* Quick View Hover Action */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-white hover:text-black transition-colors text-white"
                 onClick={(e) => { if(onQuickView) { e.preventDefault(); e.stopPropagation(); onQuickView(product); } }}>
              <Search size={20} />
            </div>
          </div>
        </div>

        {/* Footer: Avatar + Name + Price */}
        <div className="mt-auto flex items-end justify-between pb-2">
          
          <div className="flex items-center gap-2">
            {/* Initials Circle */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6b7280] to-[#4b5563] border border-[#9ca3af] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_2px_4px_rgba(0,0,0,0.5)] flex-shrink-0">
               <span className="text-[10px] text-gray-200 font-bold tracking-wider">{nameInitials}</span>
            </div>
            {/* Product Name */}
            <div className="text-gray-100 font-bold text-[11px] md:text-xs tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] max-w-[100px] md:max-w-[120px] truncate">
               {name}
            </div>
          </div>

          {/* Action / Price */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
             <span className="text-white font-black text-sm md:text-base tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
               {formatPrice(price)}
             </span>
             <button 
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart && onAddToCart(product); }}
               className="text-gray-200 hover:text-white transition-colors drop-shadow-md mt-1"
             >
               <ShoppingBag size={18} />
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};
