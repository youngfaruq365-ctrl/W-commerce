import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { isVideoUrl, getImageUrl } from '@/utils/imageHelpers';
import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, ShieldCheck, Package, Sparkles, Eye, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/utils/apiClient';

const getInitialImage = (product) => {
  const url = product?.images?.[0]?.url || product?.imageUrl || product?.primaryImage;
  if (!url) return PLACEHOLDER_IMAGE;
  return getImageUrl(url);
};

const ProductPreviewModal = ({ isOpen, onClose, product, handleAddToCart }) => {
  const [currentProduct, setCurrentProduct] = useState(product);
  const [selectedImage, setSelectedImage] = useState(() => getInitialImage(product));
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product?.id]);

  useEffect(() => {
    setSelectedImage(getInitialImage(currentProduct));
  }, [currentProduct?.id]);

  // Fetch product recommendations
  useEffect(() => {
    if (!isOpen || !currentProduct?.id) {
      setRecommendations([]);
      return;
    }

    let isSubscribed = true;
    setLoadingRecommendations(true);

    const fetchRecommendations = async () => {
      try {
        // 1. Try bundle endpoint
        try {
          const bundleRes = await apiClient.get(`/api/v1/products/${currentProduct.id}/bundle`);
          if (bundleRes.data?.success && bundleRes.data?.bundle) {
            const b = bundleRes.data.bundle;
            const combined = [
              ...(b.recommended || []),
              ...(b.similar || []),
              ...(b.peopleAlsoBought || []),
              ...(b.alternatives || [])
            ].filter(p => p.id !== currentProduct.id);

            const unique = [];
            const seen = new Set();
            for (const p of combined) {
              if (p.id && !seen.has(p.id)) {
                seen.add(p.id);
                unique.push(p);
              }
            }

            if (unique.length > 0 && isSubscribed) {
              setRecommendations(unique.slice(0, 4));
              setLoadingRecommendations(false);
              return;
            }
          }
        } catch (e) {
          // Continue to recommendations endpoint
        }

        // 2. Fetch general recommendations
        const recRes = await apiClient.get('/api/v1/products/recommendations?limit=6');
        if (recRes.data?.success && Array.isArray(recRes.data?.recommendations) && recRes.data.recommendations.length > 0) {
          const filtered = recRes.data.recommendations.filter(p => p.id !== currentProduct.id);
          if (isSubscribed) {
            setRecommendations(filtered.slice(0, 4));
            setLoadingRecommendations(false);
            return;
          }
        }

        if (isSubscribed) {
          setRecommendations([]);
          setLoadingRecommendations(false);
        }
      } catch (err) {
        console.warn('Error fetching preview modal recommendations:', err);
        if (isSubscribed) {
          setLoadingRecommendations(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, currentProduct?.id]);

  if (!isOpen || !currentProduct) return null;

  const discountPercentage = Number(currentProduct.discountPercentage) || 0;
  const basePrice = Number(currentProduct.price) || 0;
  const hasDiscount = discountPercentage > 0;
  const currentPrice = hasDiscount
    ? Number((basePrice * (1 - (discountPercentage / 100))).toFixed(2))
    : basePrice;
  const originalPrice = hasDiscount ? basePrice : null;

  const shippingFee = Number(currentProduct.shippingFee) || 0;
  const isFreeShipping = shippingFee === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div 
        className="modal-panel relative max-w-5xl w-full bg-[var(--bg-main,#111827)] text-[var(--text-main,#f9fafb)] border border-[var(--border-subtle,#374151)] shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row max-h-[92vh]" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-gray-300 hover:text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Left Column: Images */}
        <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--border-subtle,#374151)] overflow-y-auto bg-black/20">
          <div className="w-full aspect-square relative flex items-center justify-center mb-4 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-lg">
            {isVideoUrl(selectedImage) ? (
              <video 
                src={selectedImage} 
                controls 
                autoPlay 
                muted 
                playsInline 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img 
                src={selectedImage} 
                alt={currentProduct.title} 
                className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-105"
              />
            )}
          </div>
          {/* Thumbnails */}
          {currentProduct.images && currentProduct.images.length > 1 && (
            <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
              {currentProduct.images.map((img, idx) => {
                const imgUrl = getImageUrl(img?.url || img);
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative ${selectedImage === imgUrl ? 'border-[#006cff] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    {isVideoUrl(imgUrl) ? (
                      <>
                        <video src={imgUrl} className="w-full h-full object-cover" muted preload="metadata" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center font-bold text-white">VIDEO</span>
                      </>
                    ) : (
                      <img src={imgUrl} alt={`${currentProduct.title} ${idx}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Details & Recommendations */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
             <span className="bg-[#ff6b00]/20 text-[#ff6b00] border border-[#ff6b00]/30 text-xs font-black uppercase px-2.5 py-1 rounded-lg">
               🔥 BEST-SELLING ITEM
             </span>
             {discountPercentage > 0 && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                  {discountPercentage}% OFF
                </span>
             )}
          </div>
          
          <h2 className="text-xl md:text-2xl font-extrabold mb-2 leading-tight">{currentProduct.title}</h2>
          
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[var(--text-muted,#9ca3af)]">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
               <span>★</span> {Number(currentProduct.rating || 5).toFixed(1)}
            </div>
            <span>•</span>
            <span>{currentProduct.soldCount >= 1000 ? (currentProduct.soldCount / 1000).toFixed(1) + 'K+' : (currentProduct.soldCount || 12)} sold</span>
            {currentProduct.store && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <ShieldCheck size={13} /> {currentProduct.store.storeName}
                </span>
              </>
            )}
          </div>

          <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-end gap-3 flex-wrap mb-1">
              <span className="text-3xl font-black">₦{currentPrice.toLocaleString()}</span>
              {originalPrice && (
                <span className="text-base text-gray-400 line-through mb-0.5">₦{originalPrice.toLocaleString()}</span>
              )}
            </div>
            <div className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider flex items-center gap-2">
              <Package size={14} className="text-blue-400" />
              {isFreeShipping ? (
                <span className="text-emerald-400">FREE SHIPPING</span>
              ) : (
                <span>SHIPPING: ₦{shippingFee.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Options / Variants */}
          {currentProduct.options && currentProduct.options.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Specifications</h4>
              <div className="flex flex-wrap gap-2">
                {currentProduct.options.map((opt, idx) => (
                  <div key={idx} className="border border-white/10 bg-white/5 px-3 py-1 rounded-lg text-xs flex items-center gap-1.5">
                    <span className="font-semibold text-gray-300">{opt.name}:</span>
                    <span className="text-gray-400">{opt.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted,#9ca3af)] line-clamp-2 mb-5 leading-relaxed">{currentProduct.description}</p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <button 
              onClick={currentProduct.stock <= 0 ? null : () => { handleAddToCart(currentProduct.id); onClose(); }} 
              className={`w-full sm:w-auto flex-1 font-extrabold py-3 px-5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer ${
                currentProduct.stock <= 0
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-70'
                  : 'bg-[#006cff] hover:bg-[#0057d9] text-white hover:scale-[1.01]'
              }`}
            >
              {currentProduct.stock <= 0 ? (
                'SOLD OUT'
              ) : (
                <><ShoppingCart size={16} /> {discountPercentage > 0 ? `${discountPercentage}% OFF • ADD TO CART` : 'ADD TO CART'}</>
              )}
            </button>
            <Link 
              to={`/product/${currentProduct.id}`} 
              onClick={onClose}
              className="w-full sm:w-auto text-center bg-white/5 border border-white/10 hover:border-white/30 text-gray-200 hover:text-white font-bold py-3 px-5 rounded-xl transition-all text-xs flex items-center justify-center gap-1"
            >
              <span>Full Details</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Recommended Products Strip */}
          <div className="pt-4 border-t border-[var(--border-subtle,#374151)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  Recommended For You
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold">
                Similar Picks
              </span>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {recommendations.map((rec) => {
                  const recImg = getInitialImage(rec);
                  const recPrice = Number(rec.displayPrice || rec.price || 0);

                  return (
                    <div
                      key={rec.id}
                      onClick={() => setCurrentProduct(rec)}
                      className="group p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#006cff]/40 transition-all cursor-pointer flex items-center gap-2.5"
                    >
                      <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <img src={recImg} alt={rec.title} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[11px] font-bold truncate group-hover:text-[#006cff] transition-colors">
                          {rec.title}
                        </h5>
                        <p className="text-xs font-black text-white">
                          ₦{recPrice.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(rec.id);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-[#006cff] text-white flex items-center justify-center transition-colors shrink-0"
                        title="Add to Cart"
                      >
                        <ShoppingCart size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic">No recommendations available for this product.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;

