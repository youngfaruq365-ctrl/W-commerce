import React from 'react';
import { Sparkles, Star, Download, Play, Settings, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const TemplateCard = ({ template, ownedRecord, onPreview, onCustomize }) => {
  const isOwned = !!ownedRecord;
  const isApplied = ownedRecord?.status === 'APPLIED';

  // Determine Tier Badge based on price
  let tierBadge = { text: 'RATED', color: 'bg-gray-800 text-white' };
  if (template.price >= 2500) {
    tierBadge = { text: 'PRO', color: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' };
  } else if (template.price >= 1500) {
    tierBadge = { text: 'PLUS', color: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' };
  }

  // Determine thumbnail image
  const thumbnailUrl = template.thumbnail || `https://picsum.photos/seed/${template.slug || template.id}/400/300`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--border-color)] rounded-2xl overflow-hidden group hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail Area */}
      <div className="relative h-48 bg-gray-100 overflow-hidden flex items-center justify-center">
        <img 
          src={thumbnailUrl} 
          alt={template.name} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
          <button 
            onClick={onPreview}
            className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Play size={16} fill="currentColor" /> Live Preview
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <div className={`${tierBadge.color} text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 uppercase tracking-wider`}>
            {tierBadge.text === 'PRO' && <Sparkles size={12} className="text-white" />}
            {tierBadge.text === 'PLUS' && <Star size={12} className="text-white" />}
            {tierBadge.text}
          </div>
          {template.isFeatured && (
            <div className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <Sparkles size={12} className="text-yellow-400" /> FEATURED
            </div>
          )}
        </div>
        
        {isOwned && (
          <div className="absolute top-3 right-3 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            ✓ OWNED
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-extrabold text-black text-lg leading-tight line-clamp-1">{template.name}</h3>
          {!isOwned && (
            <div className="font-bold text-black text-sm whitespace-nowrap">
              {template.isFree ? 'Free' : `₦${Number(template.price).toLocaleString()}`}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
          {template.description}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
          {isApplied ? (
            <>
              <button 
                onClick={onCustomize}
                className="flex-1 bg-[var(--accent-gray)]/10 text-black border border-[var(--border-color)] hover:bg-gray-50 font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={16} /> Manage
              </button>
              <div className="flex-1 text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded-xl border border-green-100">
                Active on Store
              </div>
            </>
          ) : isOwned ? (
            <>
              <button 
                onClick={onPreview}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-black font-bold py-2 rounded-xl text-sm transition-colors"
              >
                Preview
              </button>
              <button 
                onClick={onCustomize}
                className="flex-1 bg-black hover:bg-gray-900 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={16} /> Customize
              </button>
            </>
          ) : (
            <button 
              onClick={onPreview}
              className="w-full bg-black hover:bg-gray-900 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} /> Get Template
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TemplateCard;
