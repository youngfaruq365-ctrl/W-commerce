import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState } from 'react';
import { X, Check, ShoppingCart, Star } from 'lucide-react';
import { celebrate } from '../components/visual/CelebrationController';

const ProductCompareModal = ({ products = [], onClose, onAddToCart }) => {
  const [loadingProductId, setLoadingProductId] = useState(null);

  if (products.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="modal-panel bg-[var(--bg-secondary,white)] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-500">
        
        <div className="sticky top-0 bg-[var(--bg-secondary,white)]/90 backdrop-blur-md z-20 px-8 py-6 border-b border-[var(--border-color,#eee)] flex justify-between items-center rounded-t-[2rem]">
          <h2 className="text-3xl font-black text-[var(--text-main,#111)] uppercase tracking-tight">
            Compare Premium Products
          </h2>
          <button onClick={onClose} className="p-3 bg-[var(--bg-primary,#f9f9f9)] rounded-full hover:bg-[var(--border-color,#eee)] transition-colors text-[var(--text-main,#111)] shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex flex-row overflow-x-auto gap-8 pb-4 hide-scrollbar">
            {products.map((product) => (
              <div key={product.id} className="min-w-[300px] flex-1 bg-[var(--bg-primary,#f9f9f9)] p-6 rounded-[2rem] border border-[var(--border-color,#eee)] shadow-sm flex flex-col group relative">
                
                {product.badge && (
                  <div className="absolute top-4 left-4 bg-[var(--accent-color,#dc2626)] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10">
                    {product.badge}
                  </div>
                )}
                
                <div className="aspect-square bg-white rounded-xl mb-6 p-4 flex items-center justify-center shadow-inner overflow-hidden">
                  <img 
                    src={product.images && product.images.length > 0 && product.images[0].url ? (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/') ? product.images[0].url : `/${product.images[0].url}`) : PLACEHOLDER_IMAGE} 
                    alt={product.title} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-[var(--text-muted,#888)] text-[10px] font-black uppercase tracking-widest mb-2">{product.category || 'General'}</p>
                  <h3 className="text-xl font-black text-[var(--text-main,#111)] mb-3 leading-tight line-clamp-2 min-h-[3rem]">{product.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm font-black text-[var(--text-main,#111)] mb-6">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" /> 5.0
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border-color,#eee)]">
                      <span className="text-[var(--text-muted,#888)] font-bold text-sm">Price</span>
                      <span className="font-black text-lg text-[var(--text-main,#111)]">₦{product.price}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border-color,#eee)]">
                      <span className="text-[var(--text-muted,#888)] font-bold text-sm">Stock</span>
                      <span className="font-black text-[var(--text-main,#111)]">In Stock</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border-color,#eee)]">
                      <span className="text-[var(--text-muted,#888)] font-bold text-sm">Authenticity</span>
                      <span className="font-black text-gray-700 500 flex items-center gap-1"><Check size={16}/> Verified</span>
                    </div>
                    <div className="flex flex-col gap-2 py-2">
                      <span className="text-[var(--text-muted,#888)] font-bold text-sm">Key Features</span>
                      <p className="text-sm text-[var(--text-main,#111)] font-medium leading-relaxed line-clamp-3">
                        {product.description || 'Premium build quality with unmatched durability and comfort.'}
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async (e) => { 
                    try {
                      setLoadingProductId(product.id);
                      if (onAddToCart) await onAddToCart(e, product.id);
                      celebrate('standard', e);
                    } finally {
                      setLoadingProductId(null);
                    }
                  }}
                  disabled={loadingProductId === product.id}
                  className="w-full py-4 mt-auto rounded-xl bg-[var(--text-main,#111)] text-[var(--bg-primary,white)] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} /> {loadingProductId === product.id ? 'Adding...' : 'Add to Bag'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCompareModal;
