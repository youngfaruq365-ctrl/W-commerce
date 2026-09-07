import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Heart, MessageCircle, Share2, ShoppingCart, Bookmark, ShieldCheck, ChevronUp, ChevronDown, X, Send, Flame, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// --- Immersive Utilities ---
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

const FlyToCartAnimation = ({ show, onDone, productImg }) => {
  if (!show) return null;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
  const destX = isDesktop ? (window.innerWidth / 2 - 60) : 0;
  const destY = isDesktop ? -(window.innerHeight / 2 - 40) : (window.innerHeight / 2 - 40);
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100000] pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-sm top-1/2 left-1/2"
            style={{ backgroundColor: ['#ff0055', '#00ffaa', '#ffaa00', '#00aaff', '#aa00ff'][i % 5] }}
            initial={{ scale: 0, x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ scale: [0, 1.5, 0], x: (Math.sin(i) * 100), y: (Math.cos(i) * 100), rotate: i * 30, opacity: [1, 1, 0] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
        <motion.img
          src={productImg}
          className="absolute z-10 w-24 h-24 object-cover rounded-xl shadow-2xl border border-white/20 top-1/2 left-1/2 -ml-12 -mt-12"
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: [0, 1.1, 0.15], rotate: [-20, 0, isDesktop ? 90 : 45], opacity: [0, 1, 0], x: [0, 0, destX], y: [0, -60, destY] }}
          transition={{ duration: 0.9, times: [0, 0.4, 1], ease: "easeInOut" }}
          onAnimationComplete={() => { setTimeout(onDone, 50); }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

const Toast = ({ show, message, icon: Icon, color = 'bg-[var(--text-main)] text-[var(--bg-primary)]', position = 'bottom' }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: position === 'bottom' ? 30 : -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: position === 'bottom' ? 30 : -30, scale: 0.9 }}
        className={`fixed ${position === 'bottom' ? 'bottom-24 left-1/2 -translate-x-1/2' : 'top-24 right-4 max-w-xs'} z-[9998] ${color} font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2`}
      >
        {Icon && <Icon size={16} />}
        <span>{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const LikeButton = ({ liked, count, onLike }) => {
  const controls = useAnimation();
  const handleClick = async (e) => {
    onLike(e);
    await controls.start({ scale: [1, 1.7, 0.85, 1.15, 1], rotate: [0, -12, 8, -4, 0], transition: { duration: 0.45 } });
  };
  return (
    <button onClick={handleClick} className="flex flex-col items-center gap-1.5 pointer-events-auto">
      <motion.div animate={controls} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-colors ${liked ? 'bg-red-500/20 border-red-500/40' : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] backdrop-blur-md'}`}>
        <Heart size={22} className={`transition-all ${liked ? 'fill-red-500 text-red-500' : 'text-[var(--text-main)]'}`} />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span key={count} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="text-[var(--text-main)] text-xs font-bold drop-shadow">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, active = false, activeClass = '' }) => (
  <motion.button whileTap={{ scale: 0.82 }} onClick={onClick} className="flex flex-col items-center gap-1.5 pointer-events-auto">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${active ? activeClass : 'bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] backdrop-blur-md'}`}>
      <Icon size={20} className={active ? '' : 'text-[var(--text-main)]'} />
    </div>
    <span className="text-[var(--text-main)] text-[11px] font-bold drop-shadow-md">{label}</span>
  </motion.button>
);

// --- Fullscreen Feed Card ---
const FullscreenFeedCard = ({ post, isActive, onAddToCart, onClose, asMainFeed }) => {
  const product = post.originalProduct;
  const targetProductId = product?.id || post?.id;
  const optimizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      if (!url.includes('q_auto') && !url.includes('f_auto')) {
        return url.replace('/upload/', '/upload/q_auto,f_auto/');
      }
    }
    return url;
  };

  const productImages = post.isFlashSale 
    ? [post.image] 
    : (product?.images?.length 
        ? product.images.map(img => optimizeImageUrl(img.url || img)) 
        : [optimizeImageUrl(post.image || '/assets/splash_3d_box_1781971684931.png')]);
  const price = product?.price;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [showDoubleTap, setShowDoubleTap] = useState(false);
  const [doubleTapPos, setDoubleTapPos] = useState({ x: 0, y: 0 });
  const [showComments, setShowComments] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [errorToast, setErrorToast] = useState({ show: false, msg: '' });
  const [cartAdded, setCartAdded] = useState(false);
  const [showPacking, setShowPacking] = useState(false);
  const [comment, setComment] = useState('');
  const [productComments, setProductComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (!isActive || productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % productImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, productImages.length]);

  useEffect(() => {
    if (showComments && targetProductId) {
      setLoadingComments(true);
      axios.get(`/api/v1/feed/${targetProductId}/comments`)
        .then(res => setProductComments(res.data.data || []))
        .catch(err => {
          // console.error('Error fetching comments:', err);
          setProductComments([]);
        })
        .finally(() => setLoadingComments(false));
    }
  }, [showComments, targetProductId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !targetProductId) return;
    try {
      const res = await axios.post(`/api/v1/feed/${targetProductId}/comments`, { postId: targetProductId, content: comment.trim() });
      if (res.data.success) {
        setProductComments(prev => [res.data.data, ...prev]);
        setComment('');
      }
    } catch (err) {
      setErrorToast({ show: true, msg: err.response?.data?.message || 'Failed to send comment' });
      setTimeout(() => setErrorToast({ show: false, msg: '' }), 3000);
    }
  };

  const spawnHeart = useCallback((x, y) => {
    const id = `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFloatingHearts(prev => [...prev, { id, x, y }]);
  }, []);

  const handleLike = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);
    if (targetProductId) axios.post(`/api/v1/products/${targetProductId}/interaction`, { type: 'LIKE' }).catch(() => {});
  }, [liked, spawnHeart, targetProductId]);

  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? window.innerWidth / 2;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? window.innerHeight / 2;
      setDoubleTapPos({ x, y });
      setShowDoubleTap(true);
      setTimeout(() => setShowDoubleTap(false), 750);
      if (!liked) {
        setLiked(true);
        setLikeCount(c => c + 1);
        spawnHeart(x, y);
        if (targetProductId) axios.post(`/api/v1/products/${targetProductId}/interaction`, { type: 'LIKE' }).catch(() => {});
      }
    }
    lastTapRef.current = now;
  }, [liked, spawnHeart, targetProductId]);

  const handleShare = async () => {
    const shareUrl = targetProductId ? `${window.location.origin}/product/${targetProductId}` : window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post.seller, text: post.text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2200);
      }
      if (targetProductId) axios.post(`/api/v1/products/${targetProductId}/interaction`, { type: 'SHARE' }).catch(() => {});
    } catch {}
  };

  const handleCart = async () => {
    if (!targetProductId) return;
    onAddToCart?.(product || post);
    setCartAdded(true);
    setShowPacking(true);
    setTimeout(() => setCartAdded(false), 3000);
    axios.post(`/api/v1/products/${targetProductId}/interaction`, { type: 'CART_ADD' }).catch(() => {});
  };

  const handleSave = async () => {
    const nowSaved = !saved;
    setSaved(nowSaved);
    if (targetProductId) {
      try {
        if (nowSaved) axios.post(`/api/v1/wishlist/${targetProductId}`).catch(() => {});
        else axios.delete(`/api/v1/wishlist/${targetProductId}`).catch(() => {});
      } catch (e) {};
    }
  };

  const animations = [
    { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: isActive ? 1 : 1.05 }, exit: { opacity: 0 }, transition: { duration: 0.8, ease: 'easeOut' } },
    { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0, scale: isActive ? 1 : 1.05 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.8, ease: 'easeOut' } },
    { initial: { opacity: 0, filter: 'blur(10px)', scale: 1.02 }, animate: { opacity: 1, filter: 'blur(0px)', scale: isActive ? 1 : 1.05 }, exit: { opacity: 0, filter: 'blur(10px)' }, transition: { duration: 0.9, ease: 'easeOut' } },
    { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0, scale: isActive ? 1 : 1.05 }, exit: { opacity: 0, y: -40 }, transition: { duration: 0.8, ease: 'easeOut' } }
  ];
  const currentAnim = animations[currentImageIndex % animations.length];

  return (
    <div className="relative w-full h-full bg-[var(--bg-primary)] select-none overflow-hidden">
      {floatingHearts.map(h => <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => setFloatingHearts(p => p.filter(fh => fh.id !== h.id))} />)}
      <DoubleTapHeart show={showDoubleTap} x={doubleTapPos.x} y={doubleTapPos.y} />
      <FlyToCartAnimation show={showPacking} onDone={() => setShowPacking(false)} productImg={productImages[currentImageIndex]} />
      <Toast show={showShareToast} message="Link copied!" icon={Share2} position="bottom" />
      <Toast show={errorToast.show} message={errorToast.msg} icon={X} position="bottom" color="bg-red-500 text-white" />

      <div className="absolute inset-0 cursor-pointer" onClick={handleDoubleTap}>
        <AnimatePresence mode="popLayout">
          {productImages[currentImageIndex] ? (
            <motion.img
              key={currentImageIndex}
              src={productImages[currentImageIndex]}
              alt={post.seller}
              className={`w-full h-full absolute inset-0 ${post.isFlashSale ? 'object-contain' : 'object-cover'}`}
              initial={currentAnim.initial}
              animate={currentAnim.animate}
              exit={currentAnim.exit}
              transition={currentAnim.transition}
              onError={e => { e.target.src = '/assets/splash_3d_box_1781971684931.png'; }}
            />
          ) : (
            <motion.div
              key="fallback"
              className="w-full h-full absolute inset-0 bg-gradient-to-br from-[#00b873] to-[#005a38] flex items-center justify-center p-8"
              initial={currentAnim.initial}
              animate={currentAnim.animate}
              exit={currentAnim.exit}
              transition={currentAnim.transition}
            >
              <span className="text-white font-black text-3xl text-center drop-shadow-xl">{post.promoTitle || 'Special Offer'}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Gradients removed as requested by user to clear up image background */}
      </div>

      {!asMainFeed && (
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors pointer-events-auto">
          <X size={20} className="text-[var(--text-main)]" />
        </button>
      )}

      {/* Right Action Bar */}
      {!post.isFlashSale && (
        <div className="absolute right-4 bottom-48 md:bottom-32 z-20 flex flex-col items-center gap-5 pointer-events-none">
          <LikeButton liked={liked} count={likeCount} onLike={handleLike} />
          <ActionBtn icon={MessageCircle} label={post.comments} onClick={() => setShowComments(true)} />
          <ActionBtn icon={Share2} label="Share" onClick={handleShare} />
          <ActionBtn icon={Bookmark} label="Save" onClick={handleSave} active={saved} activeClass="bg-yellow-500/25 border-yellow-400/40 text-yellow-500" />
          <ActionBtn icon={cartAdded ? Check : ShoppingCart} label="Cart" onClick={handleCart} active={true} activeClass="bg-[var(--text-main)] text-[var(--bg-primary)] border border-[var(--text-main)]" />
        </div>
      )}

      {/* Bottom Info */}
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: isActive ? 0 : 24, opacity: isActive ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="absolute pb-28 md:pb-8 bottom-0 left-0 right-20 p-5 z-20 pointer-events-none">
        <div className="flex items-center gap-3 mb-2">
          {post.sellerId ? (
            <Link to={`/seller/${post.sellerId}`} className={`pointer-events-auto w-10 h-10 rounded-full bg-[var(--text-main)]/10 border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] font-black text-base backdrop-blur-sm flex-shrink-0 transition-colors ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
              {post.avatar}
            </Link>
          ) : (
            <div className={`w-10 h-10 rounded-full bg-[var(--text-main)]/10 border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] font-black text-base backdrop-blur-sm flex-shrink-0 transition-colors ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
              {post.avatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {post.sellerId ? (
              <Link to={`/seller/${post.sellerId}`} className="pointer-events-auto text-[var(--text-main)] font-black text-sm flex items-center gap-1.5 leading-none hover:underline underline-offset-2">
                <span className="truncate">{post.seller}</span>
                <ShieldCheck size={14} className="text-[#1da1f2] dark:text-[#73ff00] fill-blue-500 dark:fill-[#73ff00] flex-shrink-0" />
              </Link>
            ) : (
              <div className="text-[var(--text-main)] font-black text-sm flex items-center gap-1.5 leading-none">
                <span className="truncate">{post.seller}</span>
                <ShieldCheck size={14} className="text-[#1da1f2] dark:text-[#73ff00] fill-blue-500 dark:fill-[#73ff00] flex-shrink-0" />
              </div>
            )}
            <div className="text-[var(--text-main)]/60 text-[10px] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
              {post.time.includes('🔥') ? (
                <><Flame size={12} className="text-orange-500 fill-orange-500" /> {post.time.replace('🔥', '').trim()}</>
              ) : post.time}
            </div>
          </div>
        </div>
        <p className="text-[var(--text-main)] text-[15px] leading-snug mb-5 pr-4 drop-shadow-md">{post.text}</p>
        
        {price && (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-3 pointer-events-auto mr-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl flex-shrink-0">
              <Flame size={14} className="text-orange-500 fill-orange-500" />
              <span className="text-[var(--text-main)] font-black text-[15px] tracking-tight">₦{Number(price).toLocaleString()}</span>
              {post.discount ? (
                <span className="text-[var(--text-main)]/50 text-xs line-through font-bold">₦{Math.round(Number(price) / (1 - post.discount/100)).toLocaleString()}</span>
              ) : (
                <span className="text-[var(--text-main)]/50 text-xs line-through font-bold">₦{Math.round(Number(price) * 1.2).toLocaleString()}</span>
              )}
            </div>
            {post.isFlashSale ? (
              <Link to={`/product/${targetProductId}`} className="flex-1">
                <motion.button whileTap={{ scale: 0.94 }} className="w-full bg-[#00b873] text-white font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-2xl hover:bg-[#005a38] border-none transition-all">
                  View Deal <ArrowRight size={16} />
                </motion.button>
              </Link>
            ) : (
              <motion.button whileTap={{ scale: 0.94 }} onClick={handleCart} className="flex-1 bg-[var(--text-main)] text-[var(--bg-primary)] font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-2xl hover:bg-[var(--bg-primary)] hover:text-[var(--text-main)] border hover:border-[var(--border-color)] transition-all">
                Buy Now <ArrowRight size={16} />
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Comment Drawer */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-[var(--bg-primary)]/50 backdrop-blur-sm pointer-events-auto" onClick={() => setShowComments(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="absolute bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] rounded-t-3xl p-5 pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]" style={{ maxHeight: '60%' }}>
              <div className="w-10 h-1 bg-[var(--border-color)] rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--text-main)] font-black">Comments ({post.comments})</h3>
                <button onClick={() => setShowComments(false)} className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center"><X size={16} className="text-[var(--text-main)]" /></button>
              </div>
              <div className="space-y-3 overflow-y-auto mb-4" style={{ maxHeight: '35vh' }}>
                {loadingComments ? <div className="text-[var(--text-main)]/50 text-center text-sm py-4">Loading comments...</div> : productComments.length === 0 ? <div className="text-[var(--text-main)]/50 text-center text-sm py-4">No comments yet.</div> : productComments.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden">
                      {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : (c.user?.fullName?.[0] || 'U')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[var(--text-main)] font-bold text-xs">{c.user?.fullName || 'User'}</span>
                        <span className="text-[var(--text-main)]/40 text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[var(--text-main)]/80 text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePostComment(e)} placeholder="Add a comment…" className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--text-main)]/30 placeholder-[var(--text-main)]/40" />
                <motion.button whileTap={{ scale: 0.9 }} onClick={handlePostComment} className="w-10 h-10 rounded-full bg-[var(--text-main)] flex items-center justify-center flex-shrink-0"><Send size={16} className="text-[var(--bg-primary)]" /></motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeedImmersiveViewer = ({ posts, initialIndex, onClose, onAddToCart, asMainFeed = false }) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0);
  const containerRef = useRef(null);

  const goNext = useCallback(() => setActiveIndex(i => Math.min(i + 1, posts.length - 1)), [posts.length]);
  const goPrev = useCallback(() => setActiveIndex(i => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'ArrowDown') goNext(); if (e.key === 'ArrowUp') goPrev(); if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    let last = 0;
    const onWheel = e => {
      e.preventDefault();
      const now = Date.now();
      if (now - last < 650) return;
      last = now;
      if (e.deltaY > 0) goNext(); else goPrev();
    };
    const el = containerRef.current;
    el?.addEventListener('wheel', onWheel, { passive: false });
    return () => el?.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev]);

  return (
    <motion.div 
      initial={asMainFeed ? false : { opacity: 0, y: 100, scale: 0.95 }}
      animate={asMainFeed ? false : { opacity: 1, y: 0, scale: 1 }}
      exit={asMainFeed ? false : { opacity: 0, y: 100, scale: 0.95 }}
      transition={asMainFeed ? {} : { type: 'spring', damping: 25, stiffness: 200 }}
      className={asMainFeed ? "w-full h-full relative bg-[var(--bg-primary)]" : "fixed inset-0 z-[9000] bg-[var(--bg-primary)]"}
    >
      <div ref={containerRef} className="w-full h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ y: '100%', opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0.7 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="absolute inset-0"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.06}
            onDragEnd={(_, info) => {
              if (info.offset.y < -55) goNext();
              else if (info.offset.y > 55) goPrev();
            }}
          >
            <FullscreenFeedCard post={posts[activeIndex]} isActive onAddToCart={onAddToCart} onClose={onClose} asMainFeed={asMainFeed} />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <AnimatePresence>
          {activeIndex > 0 && (
            <motion.button key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.9 }} onClick={goPrev} className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-10 h-10 rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] shadow-xl flex items-center justify-center text-[var(--text-main)] pointer-events-auto backdrop-blur-md hover:bg-[var(--bg-tertiary)] transition-colors">
              <ChevronUp size={18} />
            </motion.button>
          )}
          {activeIndex < posts.length - 1 && (
            <motion.button key="down" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.9 }} onClick={goNext} className="absolute bottom-[66px] left-1/2 -translate-x-1/2 z-30 w-10 h-10 rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] shadow-xl flex items-center justify-center text-[var(--text-main)] pointer-events-auto backdrop-blur-md hover:bg-[var(--bg-tertiary)] transition-colors">
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Progress dots */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pointer-events-none">
          {posts.slice(0, 12).map((_, i) => (
            <motion.button key={i} onClick={() => setActiveIndex(i)} animate={{ height: i === activeIndex ? 18 : 4, backgroundColor: i === activeIndex ? 'var(--text-main)' : 'var(--border-color)' }} transition={{ duration: 0.2 }} className="w-1 rounded-full pointer-events-auto" />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default FeedImmersiveViewer;
