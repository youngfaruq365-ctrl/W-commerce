import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Heart, Star, ArrowRight } from 'lucide-react';

const StoreCard = ({ store, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer flex flex-col h-full w-full bg-white rounded-xl overflow-hidden"
      onClick={() => onClick(store)}
    >
      {/* Massive 16/10 Image Preview */}
      <div className="relative w-full aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300">
        <img 
          src={store.preview.hero} 
          alt={store.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        
        {/* Heart Icon Top Right */}
        <button 
          onClick={(e) => { e.stopPropagation(); /* Add favorite logic */ }}
          className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-md hover:bg-white rounded-full text-gray-700 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Heart size={16} />
        </button>

        {/* Live / Popular Badge */}
        {store.popular && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-black shadow-sm">
            Popular
          </div>
        )}

        {/* Quick Preview Hover Overlay (Desktop Only) */}
        <div className="hidden lg:flex absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center backdrop-blur-[2px]">
           <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="bg-white text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-xl pointer-events-none">
             Try Preview
           </button>
        </div>
      </div>

      {/* Minimal Responsive Metadata */}
      <div className="flex flex-col flex-1 px-1 min-w-0">
        
        {/* Row 1: Name & Price */}
        <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
          <h3 className="font-extrabold text-black text-[18px] md:text-[20px] lg:text-[22px] leading-tight flex-1 min-w-[120px] break-words">
            {store.name}
          </h3>
          <div className="font-bold text-black text-[16px] md:text-[18px] whitespace-nowrap">
            ${store.price} <span className="text-xs text-gray-500 font-normal">/3mo</span>
          </div>
        </div>
        
        {/* Row 2: Engine & Tier */}
        <div className="text-xs md:text-sm text-gray-500 mb-2 capitalize flex items-center gap-1.5 flex-wrap">
          {store.engine} &middot; <span className="text-black font-semibold">{store.tier}</span>
        </div>

        {/* Row 3: Rating & Features */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-gray-600 mb-4 flex-1">
          <div className="flex items-center gap-1 text-black font-bold whitespace-nowrap">
            <Star size={14} className="fill-black" /> {store.rating}%
          </div>
          {store.aiFeatures && store.aiFeatures.length > 0 && (
             <div className="flex items-center gap-1 whitespace-nowrap">
               <span className="w-1 h-1 rounded-full bg-gray-300"></span>
               {store.aiFeatures[0]}
             </div>
          )}
        </div>

        {/* Bottom: Mobile View Details Button */}
        <div className="text-[13px] md:text-sm font-bold text-black flex items-center gap-1 group-hover:gap-2 transition-all mt-auto pt-2 border-t border-transparent lg:border-none">
          View Details <ArrowRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;
