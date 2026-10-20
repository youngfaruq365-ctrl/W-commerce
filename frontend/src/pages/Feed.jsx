import { PLACEHOLDER_IMAGE } from '../constants/placeholders';
import { isVideoUrl, getImageUrl } from '../utils/imageHelpers';
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient as axios } from '../utils/apiClient';
import { Sparkles, Menu, Search, Filter } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { celebrate } from '../components/visual/CelebrationController';
import toast from 'react-hot-toast';

import FeedSidebar from '../components/feed/FeedSidebar';
import FeedCard from '../components/feed/FeedCard';
import FeedImmersiveViewer from '../components/feed/FeedImmersiveViewer';
import { WFetchingAnimation } from '../components/motion/WFetchingAnimation';
import { WEmptyState } from '../components/motion/WEmptyState';

class FeedItemBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    // console.error('Feed item crashed:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

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

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('foryou');
  const [immersiveIndex, setImmersiveIndex] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || '';
  
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Use URL category if present, otherwise default to activeCategory state
  const effectiveCategory = urlCategory || activeCategory;
  
  useEffect(() => {
    if (urlCategory && urlCategory !== activeCategory) {
      setActiveCategory(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearch !== searchQuery) {
        const newParams = new URLSearchParams(searchParams);
        if (localSearch) newParams.set('search', localSearch);
        else newParams.delete('search');
        setSearchParams(newParams);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [localSearch, searchParams, searchQuery, setSearchParams]);

  const addToCart = useCartStore(state => state.addToCart);

  // ── Fetch real products from backend ──────────────────────────────────────
  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        if (effectiveCategory === 'promotions') {
          const res = await axios.get('/api/v1/flash-deals/active');
          if (res.data.success && res.data.flashDeals?.length > 0) {
            const mapped = res.data.flashDeals.map(deal => {
              const product = deal.product;
              return {
                id:              product.id || product._id,
                sellerId:        product.store?.sellerId || product.sellerId,
                storeSlug:       product.store?.portfolioSlug,
                storeId:         product.store?.id,
                seller:          product.store?.storeName || 'Verified Seller',
                avatar:          (product.store?.storeName || 'V')[0].toUpperCase(),
                time:            '🔥 Flash Deal',
                text:            `${deal.promoTitle} - ${deal.discount}% OFF! ${product.description?.slice(0, 80) || ''}`,
                image:           deal.bannerImage ? optimizeImageUrl(deal.bannerImage) : null,
                promoTitle:      deal.promoTitle,
                promoType:       deal.promoType,
                isFlashSale:     true,
                discount:        deal.discount,
                audioUrl:        product.audioUrl || product.audio || null,
                audioTitle:      product.audioTitle || null,
                likes:           product.viewCount || 0,
                comments:        product._count?.reviews || 0,
                originalProduct: product,
              };
            });
            for (let i = mapped.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
            }
            setPosts(mapped);
          } else {
            setPosts([]);
          }
          setLoading(false);
          return;
        }

        let endpointTrend = '';
        let endpointAll = '';

        if (searchQuery) {
          endpointAll = `/api/v1/products?limit=30&sort=newest&search=${encodeURIComponent(searchQuery)}`;
        } else if (effectiveCategory === 'trending') {
          endpointTrend = '/api/v1/products/trending?limit=30';
        } else if (effectiveCategory && effectiveCategory !== 'foryou') {
          // For specific categories like 'fashion', 'electronics'
          // We must exact match or partial match on category on backend
          endpointAll = `/api/v1/products?limit=30&sort=newest&category=${encodeURIComponent(effectiveCategory)}`;
        } else {
          // Default: foryou (fetch both)
          endpointTrend = '/api/v1/products/trending?limit=10';
          endpointAll = '/api/v1/products?limit=30&sort=newest';
        }

        const requests = [];
        const requestTypes = [];
        if (endpointAll) { requests.push(axios.get(endpointAll)); requestTypes.push('all'); }
        if (endpointTrend) { requests.push(axios.get(endpointTrend)); requestTypes.push('trend'); }

        const results = await Promise.allSettled(requests);
        
        let products = [];

        // Prefer trending if it exists
        const trendIdx = requestTypes.indexOf('trend');
        if (trendIdx !== -1) {
          const res = results[trendIdx];
          if (res.status === 'fulfilled' && res.value.data.success) {
            products = res.value.data.products || res.value.data.data || [];
          }
        }

        // Fill up from all products
        const allIdx = requestTypes.indexOf('all');
        if (allIdx !== -1) {
          const res = results[allIdx];
          if (res.status === 'fulfilled' && res.value.data.success) {
            const allProds = res.value.data.data || res.value.data.products || [];
            // Merge, avoiding duplicates
            const existingIds = new Set(products.map(p => p.id));
            allProds.forEach(p => { if (!existingIds.has(p.id)) products.push(p); });
          }
        }

        if (products.length > 0) {
          // Map real products to feed post shape
          const mapped = products.map(product => ({
            id:              product.id || product._id,
            sellerId:        product.store?.sellerId || product.sellerId,
            storeSlug:       product.store?.portfolioSlug,
            storeId:         product.store?.id,
            seller:          product.store?.storeName || 'Verified Seller',
            avatar:          (product.store?.storeName || 'V')[0].toUpperCase(),
            time:            product.isFlashSale ? '🔥 Flash Deal' : 'Just Dropped',
            text:            product.description?.slice(0, 110) || `${product.title} — Premium quality, limited stock!`,
            image:           optimizeImageUrl(product.images?.[0]?.url || PLACEHOLDER_IMAGE),
            audioUrl:        product.audioUrl || product.audio || null,
            audioTitle:      product.audioTitle || null,
            likes:           product.viewCount || 0,
            comments:        product._count?.reviews || 0,
            originalProduct: product,
          }));
          for (let i = mapped.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
          }
          setPosts(mapped);
        } else {
          // No products found — show empty state, not fake data
          setPosts([]);
        }
      } catch (err) {
        // console.error('Feed fetch error:', err);
        // On API error — show empty state, never show fake data
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [searchQuery, effectiveCategory]);

  const handleAddToCart = async (product, e) => {
    if (!product?.id) return;
    try {
      await addToCart(product.id, 1);
      celebrate('standard', e);
    } catch (err) {
      throw err;
    }
  };

  const [immersivePosts, setImmersivePosts] = useState(null);

  const handleCardClick = (post) => {
    const sellerPosts = posts.filter(p => p.sellerId === post.sellerId);
    const idx = sellerPosts.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      setImmersivePosts(sellerPosts);
      setImmersiveIndex(idx);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-[var(--bg-primary)] overflow-hidden relative">
      {/* TikTok-style Categories Bar */}
      <div className="absolute top-0 left-0 right-0 z-[50] flex justify-center items-center pt-4 pb-10 pointer-events-none lg:pl-[300px] gap-3 px-4 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
         {/* Promotion Button */}
         <div className="pointer-events-auto shrink-0 relative z-50">
            <button onClick={() => {
              setActiveCategory('promotions');
              const newParams = new URLSearchParams(searchParams);
              newParams.set('category', 'promotions');
              setSearchParams(newParams);
            }} className="w-10 h-10 rounded-full bg-black/30 dark:bg-black/40 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/20 shadow-xl" title="Daily Promotions">
              <Sparkles size={18} strokeWidth={2.5} className="text-amber-400" />
            </button>
         </div>

         <div className="flex gap-2 pointer-events-auto max-w-full overflow-x-auto hide-scrollbar px-3 py-1.5 items-center bg-black/30 dark:bg-black/40 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
            {['For You', 'Trending', 'Fashion', 'Electronics'].map(cat => {
              const catKey = cat.toLowerCase().replace(' ', '');
              const isActive = effectiveCategory === catKey || (effectiveCategory === '' && catKey === 'foryou');
              return (
               <button 
                  key={cat}
                  onClick={() => {
                    setActiveCategory(catKey);
                    const newParams = new URLSearchParams(searchParams);
                    if (catKey === 'foryou') newParams.delete('category');
                    else newParams.set('category', catKey);
                    setSearchParams(newParams);
                  }}
                  className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full transition-all ${isActive ? 'bg-white text-black shadow-md scale-105' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
               >
                 {cat}
               </button>
              );
            })}
         </div>

         {/* Search Button */}
         <div className="pointer-events-auto shrink-0 relative z-50">
            <button onClick={() => { setShowSearch(!showSearch); setShowFilter(false); }} className="w-10 h-10 rounded-full bg-black/30 dark:bg-black/40 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/20 shadow-xl">
              <Search size={18} strokeWidth={2.5} />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ opacity: 0, scale: 0.9, originTopRight: 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 top-12 w-64 sm:w-72 bg-neutral-900/90 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl p-3 z-[60]">
                  <input autoFocus type="text" placeholder="Search drops..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-transparent outline-none py-1.5 text-sm font-medium text-white placeholder-gray-400" />
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {loading ? (
        <div className="w-full h-full flex justify-center items-center bg-[var(--bg-primary)]">
          <WFetchingAnimation message={searchQuery ? "Searching global catalog..." : "Fetching your feed..."} />
        </div>
      ) : posts.length === 0 ? (
        <div className="w-full h-full flex justify-center items-center bg-[var(--bg-primary)] p-6">
          <WEmptyState 
            icon={Sparkles}
            title="No Drops Yet" 
            message="Check back soon for trending products or adjust your search." 
            actionLabel="Explore Shop" 
            onAction={() => window.location.href = '/shop'} 
          />
        </div>
      ) : (
        <FeedImmersiveViewer 
          posts={posts}
          initialIndex={0}
          onClose={() => {}} 
          onAddToCart={handleAddToCart}
          asMainFeed={true}
        />
      )}
      
      {/* Glowing Black Gradient at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none bg-gradient-to-t from-black via-black/50 to-transparent z-[40]" />
    </div>
  );
};

export default Feed;
