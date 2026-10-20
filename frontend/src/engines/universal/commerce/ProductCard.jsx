import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreview } from './PreviewContext';
import { Heart, ShoppingCart, Star, Eye, ChevronLeft, ChevronRight, ZoomIn, Box } from 'lucide-react';
import { SpatialViewer } from '../components/SpatialViewer';
import { WImageLoader } from '../../../components/motion/WImageLoader';

// ─── Tier-gated product cards ──────────────────────────────────────────────────

// Essential: clean image + info
export const ProductCardEssential = ({ product }) => {
  const { addToCart, addToWishlist, wishlist, setActivePage, setActiveProduct } = usePreview();
  const isWishlisted = wishlist.some(w => w.id === product.id);
  return (
    <div className="group cursor-pointer" onClick={() => { setActiveProduct(product); setActivePage('product'); }}>
      <div className="relative aspect-square bg-gray-100 rounded-[var(--s-radius,8px)] overflow-hidden mb-3">
        <WImageLoader src={product.image} alt={product.name} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500" />
        {product.badge && <div className="absolute top-2 left-2 bg-black text-white text-xs font-bold px-2 py-0.5 rounded">{product.badge}</div>}
      </div>
      <div className="font-bold text-sm mb-1 truncate">{product.name}</div>
      <div className="font-black">₦{product.price}</div>
    </div>
  );
};

// Plus: quick-view overlay on hover
export const ProductCardPlus = ({ product }) => {
  const { addToCart, addToWishlist, wishlist, setActivePage, setActiveProduct } = usePreview();
  const isWishlisted = wishlist.some(w => w.id === product.id);
  return (
    <div className="group cursor-pointer neu-card p-2" onClick={() => { setActiveProduct(product); setActivePage('product'); }}>
      <div className="relative aspect-square rounded-[var(--s-radius,8px)] overflow-hidden mb-3">
        <WImageLoader src={product.image} alt={product.name} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-700" />
        {product.badge && <div className="absolute top-2 left-2 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] text-xs font-bold px-2 py-0.5 rounded-full">{product.badge}</div>}
        {/* Quick add on hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <button onClick={e => { e.stopPropagation(); addToCart(product); }} className="flex-1 neu-button-primary text-xs py-2">
            Quick Add
          </button>
          <button onClick={e => { e.stopPropagation(); addToWishlist(product); }} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold text-sm truncate">{product.name}</div>
        <div className="font-black flex-shrink-0">₦{product.price}</div>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <Star size={11} className="fill-amber-400 text-amber-400" />
        <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
      </div>
    </div>
  );
};

// Pro: gallery + zoom + variant preview
export const ProductCardPro = ({ product }) => {
  const { addToCart, addToWishlist, wishlist, setActivePage, setActiveProduct } = usePreview();
  const [hovered, setHovered] = useState(false);
  const isWishlisted = wishlist.some(w => w.id === product.id);
  return (
    <div className="group cursor-pointer" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => { setActiveProduct(product); setActivePage('product'); }}>
      <div className="relative aspect-[3/4] bg-gray-100 rounded-[var(--s-radius,8px)] overflow-hidden mb-4">
        <AnimatePresence mode="wait">
          <motion.div key={hovered ? 'alt' : 'main'}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 w-full h-full"
          >
            <WImageLoader src={hovered && product.images?.length > 1 ? product.images[1] : product.image} alt={product.name} className="w-full h-full" />
          </motion.div>
        </AnimatePresence>
        {product.badge && <div className="absolute top-3 left-3 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] text-xs font-bold px-3 py-1 rounded-full">{product.badge}</div>}
        <button onClick={e => { e.stopPropagation(); addToWishlist(product); }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 text-black'}`}>
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
        {/* Color swatches */}
        <div className="absolute bottom-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {product.colors.slice(0,4).map((c,i) => <div key={i} className="w-5 h-5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: c }} />)}
        </div>
        <button onClick={e => { e.stopPropagation(); addToCart(product); }}
          className="absolute bottom-3 right-3 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          + Cart
        </button>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold mb-1 truncate">{product.name}</div>
          <div className="flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400" /><span className="text-xs opacity-50">{product.rating}</span></div>
        </div>
        <div className="text-right">
          <div className="font-black">₦{product.price}</div>
          {product.originalPrice > product.price && <div className="text-xs line-through opacity-40">₦{product.originalPrice}</div>}
        </div>
      </div>
    </div>
  );
};

// Studio: editorial reveal animation
export const ProductCardStudio = ({ product }) => {
  const { addToCart, addToWishlist, wishlist, setActivePage, setActiveProduct } = usePreview();
  const isWishlisted = wishlist.some(w => w.id === product.id);
  return (
    <motion.div whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group cursor-pointer" onClick={() => { setActiveProduct(product); setActivePage('product'); }}>
      <div className="relative aspect-[2/3] bg-gray-900 rounded-[var(--s-radius,8px)] overflow-hidden mb-4">
        <motion.div className="absolute inset-0 w-full h-full opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700">
          <WImageLoader src={product.image} alt={product.name} className="w-full h-full" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <div className="text-white font-bold truncate mb-1">{product.name}</div>
            <div className="text-white/60 text-sm">₦{product.price}</div>
          </motion.div>
        </div>
        <button onClick={e => { e.stopPropagation(); addToWishlist(product); }}
          className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}>
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.div>
  );
};

// Signature: immersive cinematic
export const ProductCardSignature = ({ product }) => {
  const { addToCart, addToWishlist, wishlist, setActivePage, setActiveProduct } = usePreview();
  const [is3DOpen, setIs3DOpen] = useState(false);
  const isWishlisted = wishlist.some(w => w.id === product.id);
  return (
    <>
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400 }}
      className="group cursor-pointer relative overflow-hidden rounded-[var(--s-radius,8px)]"
      onClick={() => { setActiveProduct(product); setActivePage('product'); }}>
      <div className="aspect-[3/4] relative">
        <WImageLoader src={product.image} alt={product.name} className="absolute inset-0 w-full h-full" />
        <motion.div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <motion.div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
          <div className="text-white font-black text-xl mb-2">{product.name}</div>
          <div className="flex gap-3">
            <button onClick={product.stock <= 0 ? null : e => { e.stopPropagation(); addToCart(product); }}
              className={`flex-1 font-bold py-3 rounded-xl transition-all ${
                product.stock <= 0 
                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-70' 
                  : 'bg-white text-black hover:bg-opacity-90'
              }`}>
              {product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
            </button>
            <button onClick={e => { e.stopPropagation(); addToWishlist(product); }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/20 text-white border border-white/30'}`}>
              <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>
        </motion.div>
        {product.badge && <div className="absolute top-4 left-4 bg-white text-black text-xs font-black px-3 py-1 rounded-full">{product.badge}</div>}
        
        {/* 3D Viewer Button */}
        <button onClick={(e) => { e.stopPropagation(); setIs3DOpen(true); }}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/60">
          <Box size={18} />
        </button>
      </div>
    </motion.div>
    <SpatialViewer product={product} isOpen={is3DOpen} onClose={() => setIs3DOpen(false)} />
    </>
  );
};

// Unified ProductCard selector by tier
export const ProductCard = ({ product, tier = 'essential' }) => {
  if (!product) return null;
  switch (tier) {
    case 'plus':      return <ProductCardPlus      product={product} />;
    case 'pro':       return <ProductCardPro       product={product} />;
    case 'studio':    return <ProductCardStudio    product={product} />;
    case 'signature': return <ProductCardSignature product={product} />;
    default:          return <ProductCardEssential product={product} />;
  }
};
