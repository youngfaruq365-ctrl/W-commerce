import React, { useState } from 'react';
import { X, ShoppingCart, ShieldCheck, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProductPreviewModal = ({ isOpen, onClose, product, handleAddToCart }) => {
  if (!isOpen || !product) return null;

  const [selectedImage, setSelectedImage] = useState(
    product.images?.[0]?.url 
      ? (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/') ? product.images[0].url : `/${product.images[0].url}`)
      : '/assets/splash_3d_box_1781971684931.png'
  );

  const discountPercentage = Number(product.discountPercentage) || 0;
  const currentPrice = Number(product.price) || 0;
  
  // Calculate original price on the fly
  let originalPrice = null;
  if (discountPercentage > 0) {
    originalPrice = currentPrice / (1 - (discountPercentage / 100));
  }

  const shippingFee = Number(product.shippingFee) || 0;
  const isFreeShipping = shippingFee === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-white/90 backdrop-blur-md" onClick={onClose}>
      <div 
        className="relative max-w-5xl w-full bg-gray-100 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.3)] rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/60 text-black flex items-center justify-center hover:bg-[var(--accent-gray)] hover:text-black border border-gray-600 transition-all"
        >
          <X size={20} />
        </button>

        {/* Left Column: Images */}
        <div className="w-full md:w-1/2 bg-gray-200/50 p-6 flex flex-col items-center justify-center border-r border-white/20 overflow-y-auto">
          <div className="w-full aspect-square relative flex items-center justify-center mb-4 rounded-xl overflow-hidden bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/30">
            <img 
              src={selectedImage} 
              alt={product.title} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
              {product.images.map((img, idx) => {
                const imgUrl = img.url.startsWith('http') || img.url.startsWith('/') ? img.url : `/${img.url}`;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedImage === imgUrl ? 'border-[var(--accent-gray)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={imgUrl} alt={`${product.title} ${idx}`} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto bg-gradient-to-b from-transparent to-black/40">
          <div className="flex items-center gap-2 mb-3">
             <span className="bg-[#ff6b00]/20 text-[#ff6b00] border border-[#ff6b00]/30 text-xs font-black uppercase px-2 py-1 rounded">
               🔥 BEST-SELLING ITEM
             </span>
             {discountPercentage > 0 && (
                <span className="bg-[var(--accent-gray)] text-black text-xs font-black uppercase px-2 py-1 rounded">
                  {discountPercentage}% OFF
                </span>
             )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-black leading-tight">{product.title}</h2>
          
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-1 text-[#ff6b00] font-bold">
               <span>★</span> {Number(product.rating || 5).toFixed(1)}
            </div>
            <span>|</span>
            <span>{product.soldCount >= 1000 ? (product.soldCount / 1000).toFixed(1) + 'K+' : product.soldCount} sold</span>
            {product.store && (
              <>
                <span>|</span>
                <span className="flex items-center gap-1 text-gray-800">
                  <ShieldCheck size={14} className="text-[#f5d0a9]" /> {product.store.storeName}
                </span>
              </>
            )}
          </div>

          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-900/20 to-black/40 border border-gray-400 900/30">
            <div className="flex items-end gap-3 flex-wrap mb-1">
              <span className="text-4xl font-extrabold text-black">₦{currentPrice.toFixed(2)}</span>
              {originalPrice && (
                <span className="text-lg text-gray-500 line-through mb-1">₦{originalPrice.toFixed(2)}</span>
              )}
            </div>
            <div className="text-xs font-bold text-gray-700 mt-2 uppercase tracking-wider flex items-center gap-2">
              <Package size={14} />
              {isFreeShipping ? (
                <span className="text-gray-700 400">FREE SHIPPING</span>
              ) : (
                <span>SHIPPING: ₦{shippingFee.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Options / Variants */}
          {product.options && product.options.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Specifications</h4>
              <div className="flex flex-wrap gap-2">
                {product.options.map((opt, idx) => (
                  <div key={idx} className="border border-gray-700 bg-gray-50/50 px-3 py-1.5 rounded-lg text-sm text-gray-800 flex items-center gap-2">
                    <span className="font-bold text-gray-700">{opt.name}:</span> {opt.value}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-700 text-sm line-clamp-3 mb-8">{product.description}</p>

          <div className="mt-auto flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => { handleAddToCart(product.id); onClose(); }} 
              className="w-full sm:w-auto flex-1 bg-white text-black font-extrabold py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 text-lg hover:scale-[1.02]"
            >
              <ShoppingCart size={20} /> 
              {discountPercentage > 0 ? `${discountPercentage}% NOW! ADD TO CART` : 'ADD TO CART'}
            </button>
            <Link 
              to={`/product/${product.id}`} 
              onClick={onClose}
              className="w-full sm:w-auto text-center bg-transparent border border-gray-600 hover:border-white text-gray-800 hover:text-black font-bold py-4 px-8 rounded-xl transition-all"
            >
              All details &gt;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;

