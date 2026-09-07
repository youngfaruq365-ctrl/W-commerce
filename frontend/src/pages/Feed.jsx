import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Menu, Search, Filter } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { celebrate } from '../components/visual/CelebrationController';

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
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('q_auto') && !url.includes('f_auto')) {
      return url.replace('/upload/', '/upload/q_auto,f_auto/');
    }
  }
  return url;
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
                isFlashSale:     true,
                discount:        deal.discount,
                likes:           product.viewCount || 0,
                comments:        product._count?.reviews || 0,
                originalProduct: product,
              };
            });
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
            image:           optimizeImageUrl(product.images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'),
            likes:           product.viewCount || 0,
            comments:        product._count?.reviews || 0,
            originalProduct: product,
          }));
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
      // console.error('Cart error:', err);
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
      <div className="absolute top-0 left-0 right-0 z-[50] flex justify-center items-center pt-6 pb-6 pointer-events-none">
         <div className="flex gap-5 pointer-events-auto">
            {['For You', 'Trending', 'Fashion', 'Electronics', 'Promotions'].map(cat => {
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
                  className={`text-[17px] font-black drop-shadow-lg transition-all ${isActive ? 'text-[var(--text-main)] scale-105' : 'text-[var(--text-main)]/60 hover:text-[var(--text-main)]/90'}`}
               >
                 {cat}
                 {isActive && <div className="w-6 h-1 bg-[var(--text-main)] rounded-full mx-auto mt-1" />}
               </button>
              );
            })}
         </div>
         {/* Search & Filter Buttons (Floating) */}
         <div className="absolute right-4 top-5 flex gap-3 pointer-events-auto">
            <button onClick={() => {
              setActiveCategory('promotions');
              const newParams = new URLSearchParams(searchParams);
              newParams.set('category', 'promotions');
              setSearchParams(newParams);
            }} className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00b873] to-[#005a38] border-none flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg" title="Daily Promotions">
              <Sparkles size={18} strokeWidth={2.5} />
            </button>
            <button onClick={() => { setShowSearch(!showSearch); setShowFilter(false); }} className="w-10 h-10 rounded-full bg-transparent border-none flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-tertiary)] transition-colors">
              <Search size={18} strokeWidth={2.5} />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ opacity: 0, scale: 0.9, originTopRight: 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 top-12 w-64 sm:w-72 bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border-color)] p-4 z-[60]">
                  <input autoFocus type="text" placeholder="Search drops..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-main)]/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--text-main)]/50 focus:ring-1 focus:ring-[var(--text-main)]/50 font-medium" />
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
    </div>
  );
};

export default Feed;
