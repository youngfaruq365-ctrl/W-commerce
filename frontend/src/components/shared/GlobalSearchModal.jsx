import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Globe, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { WReasoningAnimation } from '../motion/WReasoningAnimation';
import { WEmptyState } from '../motion/WEmptyState';
import { WImageLoader } from '../motion/WImageLoader';

const GlobalSearchModal = ({ 
  isOpen, 
  onClose, 
  searchQuery, 
  globalProducts = [], 
  loadingGlobal,
  primaryColor = '#d3d3d3'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--bg-primary)]/95 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] bg-[var(--bg-secondary)]/80 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20" style={{ color: primaryColor }}>
            <Globe className="animate-pulse" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest">GlobalX Network</h2>
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
              <Search size={14} /> Results for "<span className="font-bold text-[var(--text-main)]">{searchQuery}</span>"
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-3 bg-[var(--bg-secondary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-all hover:rotate-90 shadow-lg"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
        {loadingGlobal ? (
          <div className="py-20 flex justify-center">
            <WReasoningAnimation message="Scanning GlobalX..." />
          </div>
        ) : globalProducts.length === 0 ? (
          <div className="py-20 flex justify-center">
             <WEmptyState 
               icon={Search}
               title="No Results" 
               message={`We couldn't find any exact matches for "${searchQuery}" in the global network.`}
             />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center gap-3">
               <ShieldCheck style={{ color: primaryColor }} />
               <span className="font-bold text-[var(--text-muted)]">Verified external sellers from the GlobalX Network.</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {globalProducts.map(product => {
                const imageUrl = product.images?.[0]?.url 
                  ? (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/') 
                      ? product.images[0].url 
                      : `/${product.images[0].url}`) 
                  : PLACEHOLDER_IMAGE;
                  
                const storeName = product.store?.storeName || 'Verified Seller';
                const rating = product.store?.averageRating || 5.0;
                
                return (
                  <div key={product.id} className="group flex flex-col bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] hover:border-[var(--accent-color)] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-[slideInUp_0.5s_ease-out_both]" style={{ '--accent-color': primaryColor }}>
                    {/* Product Image */}
                    <div className="aspect-[4/3] bg-white/20 overflow-hidden relative p-4 flex items-center justify-center">
                       <WImageLoader src={imageUrl} alt={product.title} objectFit="object-contain" className="w-full h-full drop-shadow-2xl group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-700 ease-out" />
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                         <h3 className="text-xl font-black text-[var(--text-main)] line-clamp-2 leading-snug">{product.title}</h3>
                      </div>
                      
                      <div className="text-2xl font-black mb-6" style={{ color: primaryColor }}>
                        ₦{product.price}
                      </div>
                      
                      <div className="mt-auto border-t border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] pt-5">
                         <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black mb-2">Fulfilled By</p>
                         <div className="flex justify-between items-center mb-5">
                            <span className="font-bold text-[var(--text-main)] line-clamp-1">{storeName}</span>
                            <div className="flex items-center gap-1 text-sm font-bold premium-glass/40 px-2 py-1 rounded-3xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-[var(--text-main)]">
                               <Star size={14} className="text-yellow-400 fill-yellow-400" /> {rating.toFixed ? rating.toFixed(1) : '5.0'}
                            </div>
                         </div>
                         
                         <button 
                           onClick={() => navigate(`/store/${product.store?.portfolioSlug || product.storeId}`)}
                           className="w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg overflow-hidden relative"
                           style={{ backgroundColor: primaryColor, color: '#fff', boxShadow: `0 10px 25px ${primaryColor}50` }}
                         >
                           <span className="relative z-10 flex items-center gap-2">Enter Site <ArrowRight size={18} /></span>
                           {/* Shine Effect */}
                           <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchModal;
