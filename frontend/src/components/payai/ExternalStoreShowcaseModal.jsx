import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Globe, ShieldCheck, ShoppingBag,
  Star, Plane, CheckCircle2, RefreshCw, ShoppingCart, Info, Store, Check,
  Heart, Share2, Sparkles, Clock, MapPin, Truck, Award, Box, ArrowRight,
  Shield, Search, ChevronRight, Layers, FileCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../utils/apiClient';
import { decodeHtml, resolveProductImage } from '../../utils/imageHelpers';
import StoreLogoAvatar from './StoreLogoAvatar';

// Variable height patterns matching Image 2 editorial masonry layout
const HEIGHT_PATTERNS = [
  'h-[290px] sm:h-[320px]', // medium
  'h-[210px] sm:h-[230px]', // short landscape
  'h-[380px] sm:h-[420px]', // tall portrait
  'h-[310px] sm:h-[340px]', // standard portrait
  'h-[230px] sm:h-[250px]', // medium landscape
  'h-[420px] sm:h-[460px]', // extra tall portrait
];

export default function ExternalStoreShowcaseModal({
  isOpen,
  store,
  onClose,
  formatLocalPrice,
  resolveOfferPrices,
  onAddToCart,
  destinationCountry = 'NG'
}) {
  const [showcaseData, setShowcaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'story' | 'shipping'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFollowing, setIsFollowing] = useState(false);

  // Keyboard shortcut: close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowcaseData(null);
      setAddedItems({});
      setActiveTab('products');
      setSearchQuery('');
      setSelectedCategory('All');
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen || !store) return;

    let isMounted = true;
    async function loadShowcase() {
      setIsLoading(true);
      try {
        const storeId = store.storeId || store.id;
        const res = await apiClient.get(`/api/v1/payai/global-store/store/${storeId}/showcase`, {
          params: { linkId: store.linkId }
        });

        if (isMounted) {
          if (res.data?.success) {
            setShowcaseData(res.data);
          } else {
            setShowcaseData({
              store,
              products: store.sampleProducts || []
            });
          }
        }
      } catch (err) {
        console.debug('External store showcase fallback:', err.message);
        if (isMounted) {
          setShowcaseData({
            store,
            products: store.sampleProducts || []
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadShowcase();
    return () => {
      isMounted = false;
    };
  }, [isOpen, store]);

  const currentStore = showcaseData?.store || store || {};
  const products = showcaseData?.products || store?.sampleProducts || [];

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(['All']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchQuery = !searchQuery || (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Robust unified price resolution
  const resolvePrice = useCallback((prod) => {
    if (resolveOfferPrices) {
      return resolveOfferPrices(prod);
    }
    const FX_RATE = 1480;
    if (!prod) return { priceUSD: 49.99, priceNGN: 49.99 * FX_RATE };
    if (prod._normalizedPrices && prod.priceNGN && prod.priceUSD) {
      return {
        priceUSD: Number(Number(prod.priceUSD).toFixed(2)),
        priceNGN: Math.round(Number(prod.priceNGN))
      };
    }
    const rawPrice = Number(prod.price) || 0;
    const isPricedInNGN =
      prod.currency === 'NGN' ||
      (rawPrice >= 500 && prod.currency !== 'USD' && prod.currency !== 'USD_NORMALIZED');

    const priceNGN = prod.priceNGN && Number(prod.priceNGN) < 5000000
      ? Math.round(Number(prod.priceNGN))
      : isPricedInNGN
      ? Math.round(rawPrice)
      : Math.round(rawPrice * FX_RATE);

    const priceUSD = prod.priceUSD
      ? Number(Number(prod.priceUSD).toFixed(2))
      : isPricedInNGN
      ? Number((rawPrice / FX_RATE).toFixed(2))
      : Number(rawPrice.toFixed(2));

    return { priceUSD: priceUSD || 49.99, priceNGN: priceNGN || Math.round(49.99 * FX_RATE) };
  }, [resolveOfferPrices]);

  const handleFollowToggle = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      toast.success(next ? `Following ${currentStore.storeName}!` : `Unfollowed ${currentStore.storeName}`);
      return next;
    });
  };

  const handleShare = () => {
    const url = currentStore.externalUrl || window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${currentStore.storeName} Portfolio`,
        text: currentStore.description || `Explore ${currentStore.storeName} on W-Commerce`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      toast.success('Store portfolio link copied to clipboard!');
    }
  };

  const handleAddProductToCart = (product, pricing) => {
    if (onAddToCart) {
      onAddToCart({
        id: product.id,
        productId: product.id,
        externalOfferId: product.id,
        title: product.title,
        price: pricing.priceUSD,
        priceUSD: pricing.priceUSD,
        priceNGN: pricing.priceNGN,
        currency: 'USD',
        imageUrl: product.imageUrl,
        provider: 'w-commerce',
        originalPlatform: currentStore.platform,
        sellerName: currentStore.storeName || currentStore.sellerName || 'Verified Merchant',
        sellerId: currentStore.storeId || currentStore.sellerId || null,
        storeId: currentStore.storeId || null,
        originCountry: currentStore.originCountry || 'International',
        isImported: true
      });
    }

    setAddedItems((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [product.id]: false }));
    }, 2200);
  };

  const storeTier = String(currentStore.sellerTier || 'PRO').toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && store && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Portfolio Showcase Modal */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 25 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#121214] text-slate-900 dark:text-zinc-100 rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col overflow-hidden z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close showcase modal"
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all duration-200 cursor-pointer border border-white/20 shadow-lg active:scale-95"
          >
            <X size={18} />
          </button>

          {/* ══════════════════════════════════════════════════════════════════
              1. LUXURY PORTFOLIO HERO & BRAND IDENTITY BANNER
             ══════════════════════════════════════════════════════════════════ */}
          <div className="relative h-60 sm:h-72 w-full overflow-hidden shrink-0 select-none bg-slate-950">
            {/* Background Cover Image with Editorial Dark Scrim */}
            <img
              src={currentStore.bannerUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80'}
              alt={currentStore.storeName}
              className="w-full h-full object-cover opacity-60 scale-100 hover:scale-105 transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-[#121214] dark:via-[#121214]/65 dark:to-black/40" />

            {/* Ambient Brand Light Ring Glow */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-80 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Brand Identity Elements */}
            <div className="absolute inset-x-4 sm:inset-x-8 bottom-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
              {/* Left: Avatar + Brand Info */}
              <div className="flex items-end gap-3.5 sm:gap-5 min-w-0 flex-1">
                {/* Store Avatar / Logo in Luxury Ring */}
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 p-1 shadow-2xl shrink-0 overflow-hidden border-2 border-white/40 ring-4 ring-blue-500/20 backdrop-blur-md">
                  <StoreLogoAvatar
                    store={currentStore}
                    className="rounded-xl sm:rounded-2xl"
                    textClassName="text-base sm:text-xl font-black"
                    iconSize={36}
                  />
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  {/* Badges Row */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white dark:text-white backdrop-blur-md border border-white/30 shadow-xs">
                      {currentStore.platform || 'Shopify'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                      {storeTier} PORTFOLIO
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30 shadow-xs">
                      <ShieldCheck size={11} className="text-emerald-400" />
                      <span>Verified Partner</span>
                    </span>
                  </div>

                  {/* Brand Name */}
                  <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate drop-shadow-md">
                    {currentStore.storeName}
                  </h1>

                  {/* Verified Store Metrics */}
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-700 dark:text-white/80 mt-1 flex-wrap">
                    <span className="text-blue-600 dark:text-blue-300 font-bold">
                      {products.length} Curated Items
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span>Official Merchant Partner</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Action Controls */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-end pb-1">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                    isFollowing
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-white/80 dark:bg-white/10 hover:bg-white text-slate-700 dark:text-white border border-slate-200 dark:border-white/15'
                  }`}
                >
                  <Heart size={13} className={isFollowing ? 'fill-rose-500 text-rose-500' : ''} />
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share Store Portfolio"
                  className="p-2 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white text-slate-700 dark:text-white border border-slate-200 dark:border-white/15 transition cursor-pointer shadow-sm active:scale-95"
                  title="Share Brand Portfolio"
                >
                  <Share2 size={14} />
                </button>

                <a
                  href={currentStore.externalUrl || currentStore.storeUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#006cff] hover:bg-blue-600 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Official Website</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              2. PROFESSIONAL PORTFOLIO TRUST & ASSURANCE STRIP
             ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-8 py-3 bg-slate-50 dark:bg-[#18181b] border-y border-slate-200/80 dark:border-white/[0.06] text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="text-emerald-500 shrink-0" size={15} />
              <div>
                <p className="font-bold text-[11px] leading-tight text-slate-800 dark:text-zinc-200">100% Escrow Secured</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Payment released on delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="text-blue-500 shrink-0" size={15} />
              <div>
                <p className="font-bold text-[11px] leading-tight text-slate-800 dark:text-zinc-200">Doorstep Air Express</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">3–5 Business Days to {destinationCountry}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-amber-500 shrink-0" size={15} />
              <div>
                <p className="font-bold text-[11px] leading-tight text-slate-800 dark:text-zinc-200">Guaranteed Landed Cost</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">No surprise customs or taxes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-purple-500 shrink-0" size={15} />
              <div>
                <p className="font-bold text-[11px] leading-tight text-slate-800 dark:text-zinc-200">Authentic Brand Stock</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Direct authorized warehouse dispatch</p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              3. PORTFOLIO TABS NAVIGATION
             ══════════════════════════════════════════════════════════════════ */}
          <div className="px-4 sm:px-8 pt-3 pb-2 border-b border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'products'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Curated Collection</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                  {products.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('story')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'story'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Store size={13} />
                <span>Brand Story & Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shipping')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'shipping'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Truck size={13} />
                <span>Landed Cost & Logistics</span>
              </button>
            </div>

            {/* Quick Bio Snippet */}
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden md:block max-w-xs truncate text-right">
              {currentStore.description || 'Verified cross-border merchant with global logistics.'}
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              4. TAB CONTENTS
             ══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
            {/* ──────── TAB 1: CURATED COLLECTION (IMAGE 2 LAYOUT) ──────── */}
            {activeTab === 'products' && (
              <div className="space-y-5">
                {/* Search & Category Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 shrink-0">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#006cff] text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Search inside showcase */}
                  <div className="relative min-w-[200px] sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${currentStore.storeName}...`}
                      className="w-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-[#006cff]"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <RefreshCw size={26} className="animate-spin text-[#006cff]" />
                    <span className="text-xs font-bold">Curating brand showcase...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 space-y-2">
                    <ShoppingBag size={40} className="mx-auto opacity-40 text-blue-500" />
                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">No products match your search</p>
                    <p className="text-xs">Try selecting another category or clearing the search query.</p>
                  </div>
                ) : (
                  /* ─── Image 2 Editorial Visual Masonry Grid ─── */
                  <div className="columns-2 sm:columns-2 md:columns-3 gap-4 space-y-4">
                    {filteredProducts.map((product, idx) => {
                      const pricing = resolvePrice(product);
                      const isAdded = addedItems[product.id];
                      const heightClass = HEIGHT_PATTERNS[idx % HEIGHT_PATTERNS.length];

                      return (
                        <div key={product.id} className="break-inside-avoid">
                          <div
                            className={`relative rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 w-full select-none ${heightClass} border border-black/[0.06] dark:border-white/[0.08] bg-slate-200 dark:bg-zinc-800`}
                          >
                            {/* Product Cover Image */}
                            <img
                              src={resolveProductImage(product)}
                              alt={decodeHtml(product.title)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = resolveProductImage(product);
                              }}
                            />

                            {/* Deep Editorial Gradient Scrim (Image 2 style) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                            {/* Top Badges */}
                            <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
                              <span className="text-[10px] font-bold text-white/95 bg-black/45 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 truncate max-w-[65%] shadow-xs">
                                {decodeHtml(product.category || 'Imported')}
                              </span>
                              <span className="text-[10px] font-bold text-blue-300 bg-blue-950/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1 shadow-xs">
                                <Plane size={10} />
                                <span>Air Cargo</span>
                              </span>
                            </div>

                            {/* Bottom Content Bar (Title, Dual Pricing, and 1-Click Floating Cart Button) */}
                            <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 z-10 flex items-end justify-between gap-3">
                              {/* Left: Title & Pricing */}
                              <div className="min-w-0 flex-1">
                                <h4
                                  className="text-white font-bold text-xs sm:text-sm leading-snug line-clamp-2 drop-shadow-md mb-1 group-hover:text-amber-200 transition-colors"
                                  title={product.title}
                                >
                                  {decodeHtml(product.title)}
                                </h4>

                                <div className="flex items-baseline gap-1.5 flex-wrap drop-shadow-md">
                                  <span className="text-white/95 font-black text-sm sm:text-base tracking-tight">
                                    {destinationCountry === 'NG'
                                      ? `₦${pricing.priceNGN.toLocaleString()}`
                                      : `$${pricing.priceUSD.toFixed(2)} USD`}
                                  </span>
                                  <span className="text-white/70 text-xs font-semibold">
                                    {destinationCountry === 'NG'
                                      ? `($${pricing.priceUSD.toFixed(2)} USD)`
                                      : `≈ ${formatLocalPrice ? formatLocalPrice(pricing.priceUSD, destinationCountry) : `₦${pricing.priceNGN.toLocaleString()}`}`}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Floating Cart Action Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddProductToCart(product, pricing);
                                }}
                                disabled={isAdded}
                                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 shadow-md shrink-0 border cursor-pointer ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white border-emerald-400'
                                    : 'bg-white/25 hover:bg-white text-white hover:text-slate-900 border-white/25'
                                }`}
                                title={isAdded ? 'Added to Cart' : 'Add to W-Commerce Cart'}
                              >
                                {isAdded ? (
                                  <Check size={16} className="text-white" />
                                ) : (
                                  <ShoppingCart size={15} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 2: BRAND STORY & PROFILE ──────── */}
            {activeTab === 'story' && (
              <div className="space-y-6 max-w-3xl mx-auto py-2">
                {/* Brand Story Box */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                        About {currentStore.storeName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Official Cross-Border Merchant & Verified Brand Partner
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                    {currentStore.description || `${currentStore.storeName} is a high-performance brand committed to exceptional quality and athletic innovation. Dispatched direct from certified brand distribution centers, every item meets international authenticity standards.`}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Fulfillment Hub</p>
                      <p className="font-black text-sm text-slate-900 dark:text-white mt-0.5">Global Priority Dispatch</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Turnaround Time</p>
                      <p className="font-black text-sm text-slate-900 dark:text-white mt-0.5">24h Dispatch</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Seller Tier</p>
                      <p className="font-black text-sm text-blue-600 dark:text-blue-400 mt-0.5">{storeTier} Verified</p>
                    </div>
                  </div>
                </div>

                {/* Authenticity Certificate Box */}
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <FileCheck size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      100% Genuine Brand Authenticity Guarantee
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      All products listed in this showcase originate directly from {currentStore.storeName}'s authorized international stock. Pre-cleared by W-Commerce logistics partners with anti-counterfeiting tracking and factory serial verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 3: LANDED COST & LOGISTICS POLICY ──────── */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 max-w-3xl mx-auto py-2">
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] space-y-6">
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Plane className="text-blue-500" size={18} />
                      <span>Cross-Border Air Express Logistics Pipeline</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Direct Doorstep Fulfillment: From authorized international hub to your hands in {destinationCountry}
                    </p>
                  </div>

                  {/* 4-Step Pipeline Visual */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/70 dark:border-white/5 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Global Express Warehouse</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Order picked, packed & labeled within 24h</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/70 dark:border-white/5 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Direct Air Flight</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Fast commercial air cargo across borders</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/70 dark:border-white/5 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Pre-Cleared Customs</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Zero surprise duties or airport hold-ups</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/70 dark:border-white/5 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Doorstep Delivery</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Local courier hands over package directly</p>
                    </div>
                  </div>

                  {/* Landed Cost Assurance Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-blue-500/20 space-y-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      What is the Landed Cost Guarantee?
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                      The amount shown at checkout is 100% final. It includes the international product price, air freight, insurance, pre-cleared customs clearance, and last-mile doorstep delivery. You will NEVER be asked to pay extra duty, clearing fees, or courier surcharges upon arrival.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
