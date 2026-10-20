import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { isVideoUrl, getImageUrl } from '../../utils/imageHelpers';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Heart, MessageCircle, Share2, ShoppingCart, Bookmark, ShieldCheck, ChevronUp, ChevronDown, X, Send, Flame, ArrowRight, Check, Volume2, VolumeX, Timer, PartyPopper, Sunset } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';
import { useFeedAudio } from '../../hooks/useFeedAudio';
import confetti from 'canvas-confetti';

const RotatingText = () => {
  const words = ['HURRY UP!', 'SELLING FAST!', 'LIMITED TIME!', 'LAST CHANCE!'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'inline-block', color: '#ffeb3b', fontWeight: '900', marginLeft: '0.5rem' }}
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
};

const FloatingBalloons = ({ count = 7 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[45]">
      {[...Array(count)].map((_, i) => {
        const left = `${10 + Math.random() * 80}%`;
        const delay = Math.random() * 2;
        const duration = 5 + Math.random() * 4;
        const colors = ['#ff1744', '#ffd700', '#00bfff', '#9c27b0', '#00e676', '#ff9800'];
        const color = colors[i % colors.length];

        return (
          <motion.div
            key={i}
            initial={{ y: '110vh', x: 0, opacity: 0.95 }}
            animate={{ 
              y: '-20vh', 
              x: [0, Math.random() > 0.5 ? 40 : -40, Math.random() > 0.5 ? -20 : 20, 0],
            }}
            transition={{ 
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-0"
            style={{ left }}
          >
            <div className="relative flex flex-col items-center drop-shadow-xl">
              <div 
                className="w-12 h-14 rounded-[50%] shadow-inner"
                style={{ backgroundColor: color, border: '1px solid rgba(255,255,255,0.4)' }}
              >
                <div className="absolute top-2 left-2 w-3 h-3 bg-white/40 rounded-full blur-[1px]" />
              </div>
              <div 
                className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px]"
                style={{ borderBottomColor: color, marginTop: '-2px' }}
              />
              <div className="w-[1px] h-12 bg-white/50 shadow-sm" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

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
      <motion.div animate={controls} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl border transition-colors ${liked ? 'bg-red-500/30 border-red-500/60' : 'bg-black/60 border-white/20 backdrop-blur-xl hover:bg-black/80'}`}>
        <Heart size={22} className={`transition-all ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span key={count} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="text-white text-xs font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, active = false, activeClass = '' }) => (
  <motion.button whileTap={{ scale: 0.82 }} onClick={onClick} className="flex flex-col items-center gap-1.5 pointer-events-auto">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${active ? activeClass : 'bg-black/60 border border-white/20 backdrop-blur-xl hover:bg-black/80'}`}>
      <Icon size={20} className={active ? '' : 'text-white'} />
    </div>
    <span className="text-white text-[11px] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{label}</span>
  </motion.button>
);

// --- Fullscreen Feed Card ---
const FullscreenFeedCard = ({ post, isActive, onAddToCart, onClose, asMainFeed }) => {
  const product = post.originalProduct;
  const targetProductId = product?.id || post?.id;
  const optimizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (isVideoUrl(url)) return getImageUrl(url);
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      if (!url.includes('q_auto') && !url.includes('f_auto')) {
        return url.replace('/upload/', '/upload/q_auto,f_auto/');
      }
    }
    return getImageUrl(url);
  };

  const productImages = post.isFlashSale 
    ? [post.image] 
    : (product?.images?.length 
        ? product.images.map(img => optimizeImageUrl(img?.url || img)) 
        : [optimizeImageUrl(post.image || PLACEHOLDER_IMAGE)]);
  const basePrice = Number(product?.price || post?.originalPrice || post?.price || 0);
  const discountPct = Number(post?.discount || product?.discountPercentage || 0);
  const hasDiscount = discountPct > 0;
  const finalPrice = post?.dealPrice
    ? Number(post.dealPrice)
    : (hasDiscount ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice);
  const price = basePrice;
  const isOutOfStock = (product?.stock !== undefined && product.stock <= 0) || (post?.stock !== undefined && post.stock <= 0);

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
  const videoRef = useRef(null);
  const { playAudio, pauseAudio, toggleMute, isMuted, isPlaying } = useFeedAudio();
  const audioUrl = product?.audioUrl || post?.audioUrl;
  const audioTitle = product?.audioTitle || post?.audioTitle;
  const isCurrentVideo = isVideoUrl(productImages[currentImageIndex]);

  // Synchronize video playback and audio mute status
  useEffect(() => {
    if (!isCurrentVideo) return;
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy rejects unmuted autoplay, play muted first
          if (!video.muted) {
            video.muted = true;
            video.play().catch(() => {});
          }
        });
      }
    } else {
      video.pause();
    }
  }, [isActive, isMuted, isCurrentVideo, currentImageIndex]);

  const handleToggleSound = useCallback((e) => {
    e?.stopPropagation?.();
    toggleMute();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [toggleMute, isMuted]);

  // Play/pause audio when this card becomes active/inactive
  useEffect(() => {
    if (isActive && audioUrl) {
      playAudio(audioUrl);
    } else if (!isActive) {
      pauseAudio();
    }
    
    // Confetti Effect for all active promos
    if (isActive && post.promoType) {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF4500', '#FF1493', '#00BFFF', '#32CD32'],
        disableForReducedMotion: true
      });
    }
    
    return () => {
      if (isActive) pauseAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, audioUrl, post.promoType]);

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
    
    try {
      if (onAddToCart) {
        // onAddToCart in Feed.jsx calls useCartStore(state => state.addToCart)(product.id)
        // Wait, onAddToCart in Feed.jsx might just be a wrapper. Let's make sure it handles await.
        // Actually, we can just await it directly.
        await onAddToCart(product || post);
      }
      setCartAdded(true);
      setShowPacking(true);
      setTimeout(() => setCartAdded(false), 3000);
      axios.post(`/api/v1/products/${targetProductId}/interaction`, { type: 'CART_ADD' }).catch(() => {});
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || 'Failed to add to cart';
      toast.error(errMsg);
      
      if (errMsg.toLowerCase().includes('stock') || errMsg.toLowerCase().includes('sold out')) {
        // Force the local state to out of stock
        if (product) product.stock = 0;
        if (post) post.stock = 0;
        // Trigger a re-render by updating a local state (using setCartAdded just to trigger render)
        setCartAdded(false);
      }
    }
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

  let containerStyle = "relative w-full h-full bg-black select-none overflow-hidden";
  let promoBadge = null;
  let priceAreaStyle = "bg-black/75 border border-white/20 backdrop-blur-xl text-white shadow-2xl";
  let buyButtonClass = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.4)] border-none transition-all";

  if (post.promoType === 'FLASH_DEAL') {
    containerStyle = "relative w-full h-full bg-[#1a1a1a] select-none overflow-hidden border-[3px] border-[#ff1744] shadow-[inset_0_0_20px_rgba(255,23,68,0.3)]";
    promoBadge = (
      <motion.div 
        initial={{ y: -50, opacity: 0, rotate: -10 }} 
        animate={{ y: 0, opacity: 1, rotate: 0 }} 
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        className="absolute top-4 left-4 z-50 bg-[#ff1744]/10 text-[#ff1744] px-4 py-2 rounded-xl font-black flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(255,23,68,0.5)] border border-[#ff1744]"
      >
        <Timer size={18} className="pulse-anim" /> FLASH DEAL
        <RotatingText />
      </motion.div>
    );
    priceAreaStyle = "bg-[#2a2a2a] border border-[#ff1744]/50 text-white";
    buyButtonClass = "w-full bg-gradient-to-r from-[#ff1744] to-[#d50000] text-white font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,23,68,0.4)] border-none transition-all hover:scale-[1.02]";
  } else if (post.promoType === 'FESTIVAL_PROMO') {
    containerStyle = "relative w-full h-full select-none overflow-hidden bg-gradient-to-br from-[#fff9e6] to-[#fff0b3] border-2 border-[#ffd700] shadow-[inset_0_0_20px_rgba(255,215,0,0.3)]";
    promoBadge = (
      <motion.div 
        initial={{ y: -50, opacity: 0, scale: 0.5 }} 
        animate={{ y: 0, opacity: 1, scale: 1 }} 
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        className="absolute top-4 left-4 z-50 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 text-sm shadow-lg border border-[#ffd700]/50"
      >
        <PartyPopper size={18} /> FESTIVAL SPECIAL
      </motion.div>
    );
    priceAreaStyle = "bg-white/80 backdrop-blur-md border border-[#ffd700]";
    buyButtonClass = "w-full bg-gradient-to-r from-[#d32f2f] to-[#ff5252] text-white font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(211,47,47,0.4)] border-none transition-all hover:scale-[1.02]";
  } else if (post.promoType === 'WEEKEND_PROMO') {
    containerStyle = "relative w-full h-full select-none overflow-hidden bg-gradient-to-b from-[#e0c3fc] to-[#8ec5fc] shadow-[inset_0_0_20px_rgba(142,197,252,0.4)]";
    promoBadge = (
      <motion.div 
        initial={{ x: -50, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        className="absolute top-4 left-4 z-50 bg-white/40 backdrop-blur-md text-[#4a148c] px-4 py-2 rounded-xl font-black flex items-center gap-2 text-sm shadow-lg border border-white/50"
      >
        <Sunset size={18} /> WEEKEND VIBES
      </motion.div>
    );
    priceAreaStyle = "bg-white/40 backdrop-blur-md border border-white/60";
    buyButtonClass = "w-full bg-gradient-to-r from-[#4a148c] to-[#7b1fa2] text-white font-black text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(74,20,140,0.4)] border-none transition-all hover:scale-[1.02]";
  }

  return (
    <div className={containerStyle}>
      {isActive && post.promoType && <FloatingBalloons count={7} />}
      {promoBadge}
      {floatingHearts.map(h => <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => setFloatingHearts(p => p.filter(fh => fh.id !== h.id))} />)}
      <DoubleTapHeart show={showDoubleTap} x={doubleTapPos.x} y={doubleTapPos.y} />
      <FlyToCartAnimation show={showPacking} onDone={() => setShowPacking(false)} productImg={productImages[currentImageIndex]} />
      <Toast show={showShareToast} message="Link copied!" icon={Share2} position="bottom" />
      <Toast show={errorToast.show} message={errorToast.msg} icon={X} position="bottom" color="bg-red-500 text-white" />

      <div className="absolute inset-0 cursor-pointer" onClick={handleDoubleTap}>
        <AnimatePresence mode="wait">
          {productImages[currentImageIndex] ? (
            isVideoUrl(productImages[currentImageIndex]) ? (
              <motion.video
                ref={videoRef}
                key={currentImageIndex}
                src={productImages[currentImageIndex]}
                autoPlay={isActive}
                loop
                muted={isMuted}
                playsInline
                className={`w-full h-full absolute inset-0 ${post.isFlashSale ? 'object-contain' : 'object-cover'}`}
                initial={currentAnim.initial}
                animate={currentAnim.animate}
                exit={currentAnim.exit}
                transition={currentAnim.transition}
              />
            ) : (
              <motion.img
                key={currentImageIndex}
                src={productImages[currentImageIndex]}
                alt={post.seller}
                className={`w-full h-full absolute inset-0 ${post.isFlashSale ? 'object-contain' : 'object-cover'}`}
                initial={currentAnim.initial}
                animate={currentAnim.animate}
                exit={currentAnim.exit}
                transition={currentAnim.transition}
                onError={e => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
            )
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
        {/* Bottom gradient to ensure text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      </div>

      {!asMainFeed && (
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors pointer-events-auto">
          <X size={20} className="text-[var(--text-main)]" />
        </button>
      )}

      {/* Top Sound Toggle Button */}
      {(audioUrl || isCurrentVideo) && (
        <button
          onClick={handleToggleSound}
          className={`absolute top-4 ${asMainFeed ? 'right-4' : 'right-16'} z-50 px-3.5 py-1.5 backdrop-blur-xl rounded-full flex items-center gap-1.5 text-white text-xs font-bold transition-all pointer-events-auto shadow-lg border border-white/20 ${isMuted ? 'bg-red-500/80 hover:bg-red-600' : 'bg-black/60 hover:bg-black/80'}`}
          title={isMuted ? 'Tap for sound' : 'Sound on'}
        >
          {isMuted ? (
            <>
              <VolumeX size={15} />
              <span>Tap for sound</span>
            </>
          ) : (
            <>
              <Volume2 size={15} className="text-emerald-400" />
              <span>Sound on</span>
            </>
          )}
        </button>
      )}

      {/* Right Action Bar */}
      {!post.isFlashSale && (
        <div className="absolute right-12 bottom-48 md:bottom-32 z-20 flex flex-col items-center gap-5 pointer-events-none">
          <LikeButton liked={liked} count={likeCount} onLike={handleLike} />
          <ActionBtn icon={MessageCircle} label={post.comments} onClick={() => setShowComments(true)} />
          <ActionBtn icon={Share2} label="Share" onClick={handleShare} />
          <ActionBtn icon={Bookmark} label="Save" onClick={handleSave} active={saved} activeClass="bg-yellow-500/25 border-yellow-400/40 text-yellow-500" />
          <ActionBtn icon={cartAdded ? Check : ShoppingCart} label="Cart" onClick={handleCart} active={true} activeClass="bg-[var(--text-main)] text-[var(--bg-primary)] border border-[var(--text-main)]" />
        </div>
      )}

      {/* Bottom Info */}
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: isActive ? 0 : 24, opacity: isActive ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="absolute pb-28 md:pb-8 bottom-0 left-0 right-20 p-5 z-20 pointer-events-none">

        {/* TikTok-style music label + mute button */}
        {(audioUrl || isCurrentVideo) && (
          <div className="flex items-center gap-3 mb-4 pointer-events-auto">
            {/* Spinning vinyl disc */}
            <motion.button
              onClick={handleToggleSound}
              animate={{ rotate: (!isMuted && (isPlaying || isCurrentVideo)) ? 360 : 0 }}
              transition={{ duration: 3, ease: 'linear', repeat: (!isMuted && (isPlaying || isCurrentVideo)) ? Infinity : 0 }}
              className={`w-10 h-10 rounded-full border-2 border-white/40 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-lg ${isMuted ? 'bg-red-500/60' : 'bg-black/60'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-white" />
              ) : (
                <Volume2 size={18} className="text-white" />
              )}
            </motion.button>
            {/* Scrolling music title */}
            <div className="overflow-hidden flex-1 min-w-0 flex items-center gap-2">
              <motion.p
                animate={{ x: (audioTitle || (isCurrentVideo ? `${post.seller || 'Product'} · Video Audio` : 'Original Sound')).length > 20 ? [0, -100, 0] : 0 }}
                transition={{ duration: 6, ease: 'linear', repeat: Infinity, repeatDelay: 1 }}
                className="text-white text-xs font-bold whitespace-nowrap drop-shadow"
              >
                ♫ {audioTitle || (isCurrentVideo ? `${post.seller || 'Product'} · Video Audio` : 'Original Sound')}
              </motion.p>
              {isMuted && (
                <button
                  onClick={handleToggleSound}
                  className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm transition-colors border border-white/30 whitespace-nowrap"
                >
                  Unmute 🔊
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating mute button when card has audio but label is hidden */}
        {!audioUrl && false && (
          <div className="mb-4" />
        )}

        <div className="flex items-center gap-3 mb-2">
          {post.sellerId ? (
            <Link to={`/seller/${post.sellerId}`} className={`pointer-events-auto w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white font-black text-base backdrop-blur-md flex-shrink-0 transition-colors ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
              {post.avatar}
            </Link>
          ) : (
            <div className={`w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white font-black text-base backdrop-blur-md flex-shrink-0 transition-colors ${post.role === 'ADMIN' ? 'avatar-admin' : 'avatar-verified-seller'}`}>
              {post.avatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {post.sellerId ? (
              <Link to={`/seller/${post.sellerId}`} className="pointer-events-auto text-white font-black text-base flex items-center gap-1.5 leading-none hover:underline underline-offset-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                <span className="truncate">{post.seller}</span>
                <ShieldCheck size={16} className="text-emerald-400 fill-emerald-400 flex-shrink-0" />
              </Link>
            ) : (
              <div className="text-white font-black text-base flex items-center gap-1.5 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                <span className="truncate">{post.seller}</span>
                <ShieldCheck size={16} className="text-emerald-400 fill-emerald-400 flex-shrink-0" />
              </div>
            )}
            <div className="text-white/80 text-[10px] font-extrabold uppercase tracking-wider mt-1.5 flex items-center gap-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {post.time.includes('🔥') ? (
                <span className="flex items-center gap-1">
                  <Flame size={12} className="text-orange-500 fill-orange-500" />
                  <span>{post.time.replace('🔥', '').trim()}</span>
                </span>
              ) : (
                <span>{post.time}</span>
              )}
            </div>
          </div>
        </div>
        <p className="text-white text-[15px] font-medium leading-snug mb-5 pr-4 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{post.text}</p>
        
        {basePrice > 0 && (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-2 sm:gap-3 pointer-events-auto mr-2">
            <div className={`${priceAreaStyle} rounded-xl px-3 sm:px-4 py-3 flex items-center gap-1.5 shadow-2xl flex-shrink-0`}>
              <Flame size={16} className="text-orange-500 fill-orange-500 hidden sm:block animate-bounce" />
              <span className="text-white font-black text-[14px] sm:text-[16px] tracking-tight">₦{Number(finalPrice).toLocaleString()}</span>
              {hasDiscount && (
                <span className="text-white/50 text-[11px] sm:text-xs line-through font-bold">₦{Number(basePrice).toLocaleString()}</span>
              )}
            </div>
            {post.isFlashSale ? (
              <Link to={`/product/${targetProductId}`} className="flex-1 min-w-0">
                <motion.button whileTap={{ scale: 0.94 }} className={`${buyButtonClass} text-[13px] sm:text-[15px] whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-1 sm:gap-2`}>
                  <span>View Deal</span>
                  <ArrowRight size={14} className="hidden sm:inline-block" />
                </motion.button>
              </Link>
            ) : (
              <motion.button 
                whileTap={{ scale: isOutOfStock ? 1 : 0.94 }} 
                onClick={isOutOfStock ? null : handleCart} 
                className={`flex-1 font-black text-[14px] sm:text-[15px] py-3.5 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 shadow-2xl transition-all min-w-0 whitespace-nowrap overflow-hidden text-ellipsis ${
                  isOutOfStock 
                    ? 'bg-gray-700 text-white/50 cursor-not-allowed border border-gray-600' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {isOutOfStock ? (
                  <span>Sold Out</span>
                ) : (
                  <>
                    <span>Buy Now</span>
                    <ArrowRight size={16} className="hidden sm:inline-block" />
                  </>
                )}
              </motion.button>
            )}

            <div className={`${priceAreaStyle} flex-shrink-0 flex items-center justify-center rounded-xl px-3 sm:px-4 py-3 shadow-2xl`}>
              <span className={`text-[12px] sm:text-[13px] font-bold whitespace-nowrap ${isOutOfStock ? 'text-red-400' : 'text-white'}`}>
                {isOutOfStock ? 'Sold out' : `${product?.soldCount || post?.soldCount || 0} sold`}
              </span>
            </div>
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
      className={asMainFeed ? "w-full h-full relative bg-[var(--bg-primary)] flex justify-center" : "fixed inset-0 z-[9000] bg-black/90 backdrop-blur-sm flex justify-center"}
    >
      {/* Left Sidebar on Desktop */}
      {asMainFeed && (
        <div className="hidden lg:flex w-[300px] h-full flex-col border-r border-[var(--border-color)] overflow-y-auto scrollbar-hide py-4 px-3 gap-3 bg-[var(--bg-primary)] z-10">
          <h2 className="text-lg font-black text-[var(--text-main)] mb-2 px-1">Trending Drops</h2>
          {posts.map((post, i) => (
            <div 
              key={post.id || i} 
              onClick={() => setActiveIndex(i)} 
              className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${i === activeIndex ? 'border-blue-500 scale-[0.98] shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-[0.98]'}`}
            >
              {isVideoUrl(post.mediaUrl || post.image) ? (
                <video src={getImageUrl(post.mediaUrl || post.image)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={post.mediaUrl || post.image} alt="thumbnail" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                <span className="text-white text-xs font-bold truncate">{post.seller}</span>
                <span className="text-white/70 text-[10px] truncate">{post.text || post.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Feed Video Container */}
      <div ref={containerRef} className="w-full lg:max-w-[1000px] h-full relative bg-black shadow-2xl overflow-hidden">
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
            <motion.button key={i} onClick={() => setActiveIndex(i)} animate={{ height: i === activeIndex ? 18 : 4, backgroundColor: i === activeIndex ? 'var(--text-main)' : 'var(--border-color)' }} transition={{ duration: 0.2 }} className="w-1 rounded-full pointer-events-auto shadow-sm" />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default FeedImmersiveViewer;
