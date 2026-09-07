import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Heart, ShoppingCart, Share2, ShieldCheck, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// ─── Floating Heart ───────────────────────────────────────────────────────────
const FloatingHeart = ({ x, y, onDone }) => (
  <motion.div
    className="fixed pointer-events-none z-[9999] text-red-500"
    style={{ left: x - 12, top: y - 12 }}
    initial={{ opacity: 1, scale: 0.5, y: 0 }}
    animate={{ opacity: 0, scale: 1.8, y: -100 }}
    transition={{ duration: 0.9, ease: 'easeOut' }}
    onAnimationComplete={onDone}
  >
    <Heart size={24} className="fill-red-500" />
  </motion.div>
);

const DoubleTapHeart = ({ show, x, y }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="fixed pointer-events-none z-[9999] text-red-500"
        style={{ left: x - 50, top: y - 50 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.3, 1.1, 0.9] }}
        transition={{ duration: 0.7 }}
      >
        <Heart size={100} className="fill-red-500 drop-shadow-2xl" />
      </motion.div>
    )}
  </AnimatePresence>
);

const ActionBtn = ({ icon: Icon, onClick, active = false, activeClass = '' }) => (
  <motion.button whileTap={{ scale: 0.82 }} onClick={onClick} className="flex flex-col items-center gap-1.5 z-10">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-colors
      ${active ? activeClass : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
      <Icon size={18} className={active ? '' : 'text-gray-700'} />
    </div>
  </motion.button>
);

const FeedCard = ({ post, onAddToCart, onClick }) => {
  const product = post.originalProduct;
  const imageUrl = post.image || '/assets/splash_3d_box_1781971684931.png';
  const price = product?.price;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [showDoubleTap, setShowDoubleTap] = useState(false);
  const [doubleTapPos, setDoubleTapPos] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  
  const controls = useAnimation();

  const spawnHeart = useCallback((x, y) => {
    const id = `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFloatingHearts(prev => [...prev, { id, x, y }]);
  }, []);

  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);
    
    await controls.start({
      scale: [1, 1.7, 0.85, 1.15, 1],
      rotate: [0, -12, 8, -4, 0],
      transition: { duration: 0.45 }
    });

    if (product?.id) {
      axios.post(`/api/v1/products/${product.id}/interaction`, { type: 'LIKE' }).catch(() => {});
    }
  }, [liked, spawnHeart, product, controls]);

  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      e.stopPropagation();
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? window.innerWidth / 2;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? window.innerHeight / 2;
      setDoubleTapPos({ x, y });
      setShowDoubleTap(true);
      setTimeout(() => setShowDoubleTap(false), 750);
      if (!liked) {
        setLiked(true);
        setLikeCount(c => c + 1);
        spawnHeart(x, y);
        if (product?.id) {
          axios.post(`/api/v1/products/${product.id}/interaction`, { type: 'LIKE' }).catch(() => {});
        }
      }
    } else {
      if (now - lastTapRef.current >= 320) {
        setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 320) {
             onClick && onClick(post);
          }
        }, 320);
      }
    }
    lastTapRef.current = now;
  }, [liked, spawnHeart, product, onClick, post]);

  const handleCart = (e) => {
    e.stopPropagation();
    if (product?.id) {
      onAddToCart?.(product, e);
      axios.post(`/api/v1/products/${product.id}/interaction`, { type: 'CART_ADD' }).catch(() => {});
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors shadow-sm hover:shadow-md group cursor-pointer" 
      onClick={() => onClick && onClick(post)}
    >
      {floatingHearts.map(h => (
        <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => setFloatingHearts(p => p.filter(fh => fh.id !== h.id))} />
      ))}
      <DoubleTapHeart show={showDoubleTap} x={doubleTapPos.x} y={doubleTapPos.y} />

      <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden" onClick={handleDoubleTap}>
        <img
          src={imageUrl}
          alt={post.seller}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={e => { e.target.src = '/assets/splash_3d_box_1781971684931.png'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        <div className="absolute right-3 bottom-4 flex flex-col gap-3 z-20 pointer-events-auto">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <motion.div animate={controls} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-colors ${liked ? 'bg-red-50 border-red-200' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
              <Heart size={18} className={`transition-all ${liked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
            </motion.div>
            <span className="text-white text-[10px] font-bold drop-shadow-md">{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}</span>
          </button>
          <ActionBtn icon={ShoppingCart} onClick={handleCart} />
          <ActionBtn icon={MoreHorizontal} onClick={(e) => { e.stopPropagation(); }} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          {post.sellerId ? (
            <Link to={`/seller/${post.sellerId}`} onClick={e => e.stopPropagation()} className="pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-black/60 transition-colors">
              <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
                {post.avatar}
              </div>
              <span className="truncate max-w-[140px] text-white text-xs font-semibold">{post.seller}</span>
              <ShieldCheck size={14} className="text-blue-400 fill-blue-900 flex-shrink-0" />
            </Link>
          ) : (
             <div className="flex items-center gap-1.5 text-gray-900 font-bold text-sm">
              <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
                {post.avatar}
              </div>
              <span className="truncate max-w-[140px]">{post.seller}</span>
              <ShieldCheck size={14} className="text-blue-500 fill-blue-50 flex-shrink-0" />
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 leading-snug h-10">
          {post.text}
        </p>

        {price && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-900 font-black text-lg tracking-tight">₦{Number(price).toLocaleString()}</span>
            <div className="flex gap-2">
               {post.originalProduct?.id && (
                  <Link 
                    to={`/product/${post.originalProduct.id}`} 
                    onClick={e => e.stopPropagation()}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                  >
                    View
                  </Link>
               )}
               <button 
                 onClick={handleCart}
                 className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
               >
                 Add Cart
               </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FeedCard;
