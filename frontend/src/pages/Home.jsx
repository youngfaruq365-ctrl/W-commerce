import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useBuyerStore } from '../store/buyerStore';
import { Star, Sparkles, ArrowRight } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { AnimatedList, AnimatedItem } from '../components/motion/AnimatedList';
import { ErrorState } from '../components/shared/ErrorState';
import LayoutEngine from '../components/storefront/LayoutEngine';
import { 
  useDiscoveryData, 
  SellerStoriesSection, 
  StoresNearYouSection 
} from '../components/home/DiscoverySections';
import BuyProductAgain from '../components/home/BuyProductAgain';
import { offlineStorage } from '../offline/offlineStorage';

// Generate a unique vivid gradient from a store ID string
const storeGradient = (id = '') => {
  const palette = [
    'from-violet-600 to-indigo-500',
    'from-rose-500 to-orange-400',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-fuchsia-500 to-pink-600',
    'from-amber-500 to-yellow-400',
    'from-sky-500 to-cyan-400',
    'from-green-500 to-emerald-400',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

export default function Home() {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  const addToCart = useCartStore(state => state.addToCart);
  const { wishlist, addToWishlist, removeFromWishlist, fetchWishlist } = useBuyerStore();
  const { stories, stores: nearStores, country } = useDiscoveryData();

  const LAYOUT_OPTIONS = ['luxury-bento', 'editorial-masonry', 'layout-6'];
  const [randomLayout, setRandomLayout] = useState('luxury-bento');

  useEffect(() => {
    if (fetchWishlist) fetchWishlist();
    setRandomLayout(LAYOUT_OPTIONS[Math.floor(Math.random() * LAYOUT_OPTIONS.length)]);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoaded(false);
      try {
        const res = await axios.get('/api/v1/products?limit=24&page=1');
        if (res.data) {
          const fetchedProducts = res.data.data || res.data.products || (Array.isArray(res.data) ? res.data : []);
          
          // Deduplicate products by id and randomize
          const uniqueProducts = [];
          const seenProductIds = new Set();
          for (const p of fetchedProducts) {
             if (!seenProductIds.has(p.id)) {
                 seenProductIds.add(p.id);
                 uniqueProducts.push(p);
             }
          }
          
          const mapped = uniqueProducts.map(p => ({
            ...p,
            coverUrl: p.images?.[0]?.url || PLACEHOLDER_IMAGE,
            price: p.price || 0,
            title: p.title || p.name || 'Product',
          }));
          
          // Fisher-Yates shuffle
          const shuffle = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[j], arr[i]] = [arr[i], arr[j]];
            }
            return arr;
          };
          
          setProducts(shuffle(mapped));
          offlineStorage.saveProducts(fetchedProducts);
          
          const storeMap = {};
          fetchedProducts.forEach(p => {
             if (p.store && !storeMap[p.store.id]) {
                storeMap[p.store.id] = {
                   id: p.store.id,
                   name: p.store.storeName,
                   slug: p.store.portfolioSlug,
                   logoUrl: p.store.logoUrl,
                   logoLetter: p.store.storeName?.[0] || '?',
                   bannerUrl: p.store.bannerUrl,
                   country: p.store.country,
                   averageRating: p.store.averageRating || 0,
                };
             }
          });
          setStores(shuffle(Object.values(storeMap)));
        }
      } catch (err) {
        try {
          const cached = await offlineStorage.getProducts();
          if (cached && cached.length > 0) {
            console.log('[Home] Loaded cached products for offline browsing:', cached.length);
            const mapped = cached.map(p => ({
              ...p,
              coverUrl: p.images?.[0]?.url || p.coverUrl || PLACEHOLDER_IMAGE,
              price: p.price || 0,
              title: p.title || p.name || 'Product',
            }));
            setProducts(mapped);
            toast('Offline mode — displaying cached catalog', { icon: '📡' });
            return;
          }
        } catch (cErr) {
          console.warn('[Home] Offline cache read error:', cErr);
        }
        toast.error('Failed to load products');
      } finally {
        setIsLoaded(true);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <main className="w-full max-w-[1180px] mx-auto px-4 pb-20">
      {/* PayAI Global Cross-Border Showcase Banner */}
      <div className="mt-4 mb-2 p-4 sm:p-5 neu-panel bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base tracking-tight uppercase">
                Shop Amazon, AliExpress & eBay with PayAI
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase">
                New
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              15-minute locked landed cost quotes, guaranteed customs duties & PayPal Sandbox checkout.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/payai')}
          className="neu-button-primary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
        >
          <span>Launch PayAI Global</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Categories Top Nav */}
      <section className="py-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex gap-6 overflow-x-auto px-4 md:px-8 hide-scrollbar snap-x mx-auto max-w-7xl">
          {[
            { name: 'Recommended', isIcon: true },
            { name: 'Beauty & Personal Care', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop' },
            { name: "Women's Clothing", img: 'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=200&h=200&fit=crop' },
            { name: 'Home & Kitchen', img: 'https://images.unsplash.com/photo-1556910103-1c02745a872f?w=200&h=200&fit=crop' },
            { name: "Men's Clothing", img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop' },
            { name: "Women's Shoes", img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=200&h=200&fit=crop' },
          ].map((cat, i) => (
            <div 
              key={i} 
              onClick={() => {
                if (cat.name === 'Recommended') {
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate(`/search?q=${encodeURIComponent(cat.name)}`);
                }
              }}
              className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group snap-start"
            >
              <div className={`w-[80px] h-[80px] rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${cat.name === 'Recommended' ? 'border border-[var(--border-color)] bg-gray-50 shadow-sm group-hover:bg-gray-100' : 'bg-gray-100 group-hover:ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--bg-primary)]'}`}>
                {cat.isIcon ? (
                  <div className="grid grid-cols-2 gap-1 w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black rounded-sm w-full h-full"></div>
                    <div className="bg-black rounded-full w-full h-full"></div>
                    <div className="bg-black rounded-sm w-full h-full"></div>
                    <div className="bg-black rounded-sm w-full h-full" style={{ borderBottomRightRadius: '8px' }}></div>
                  </div>
                ) : (
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
              </div>
              <span className={`text-[13px] text-center w-[100px] leading-tight ${cat.name === 'Recommended' ? 'font-bold text-[var(--text-main)]' : 'font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Products Section */}
      <section id="products-section" className="py-12">
        {isLoaded && products.length === 0 ? (
          <div className="py-12 flex justify-center">
            <ErrorState 
              variant="empty"
              title="No Products Found"
              message="We couldn't find any products at the moment. Please check back later!"
            />
          </div>
        ) : (
          <div className="min-h-[400px] relative">
            {!isLoaded ? (
              <div key="loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({length: 8}).map((_, i) => (
                  <div key={`skel-${i}`} className="neu-card h-80 animate-pulse bg-gray-200/20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div key={`layout-${randomLayout}`} className="animate-fade-in">
                <LayoutEngine 
                    section={{ type: randomLayout, title: '', hideTitle: true }} 
                    products={products} 
                    addToCart={(productId) => addToCart(productId, 1)} 
                    wishlist={wishlist}
                    toggleWishlist={(productId) => {
                      const isWished = wishlist.some(w => String(w.productId) === String(productId) || String(w.product?.id) === String(productId));
                      if (isWished) removeFromWishlist(productId);
                      else addToWishlist(productId);
                    }}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* The Real Store Section */}
      <section className="py-6">
        {!isLoaded ? (
          <div className="flex gap-6 overflow-x-auto pb-8 hide-scrollbar snap-x">
            <div className="animate-pulse flex gap-6 w-full">
              {[1,2,3].map(i => <div key={i} className="neu-card w-[300px] md:w-[340px] h-64 shrink-0 bg-gray-200/20 rounded-xl"></div>)}
            </div>
          </div>
        ) : (
          <AnimatedList className="flex gap-6 overflow-x-auto pb-8 hide-scrollbar snap-x">
            {stores.map(store => (
              <AnimatedItem
                key={store.id}
                className="neu-card shrink-0 w-[300px] md:w-[340px] flex flex-col group snap-start hover:-translate-y-1 transition-transform overflow-hidden"
              >
                <Link to={`/store/${store.slug || store.id}`} onClick={() => window.scrollTo(0, 0)} className="block h-full cursor-pointer">
                  {/* Full Card Banner/Image */}
                  <div className="h-[400px] relative overflow-hidden bg-[var(--bg-secondary)] rounded-xl">
                    {store.bannerUrl ? (
                      <img src={store.bannerUrl} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${storeGradient(store.id)} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
                        <span className="text-8xl font-black text-white/30 select-none">{store.logoLetter}</span>
                      </div>
                    )}
                    
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5">
                      <div className="flex justify-between items-end">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-lg truncate mb-1">
                            {store.name && store.name !== store.country ? store.name : `Store ${store.id?.substring(0, 6)}`}
                          </h4>
                          {store.averageRating > 0 && (
                          <div className="font-bold text-white text-sm flex items-center gap-1">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" /> {store.averageRating.toFixed(1)}
                          </div>
                          )}
                        </div>
                        
                        {/* Action icon */}
                        <div className="text-white shrink-0 ml-3 pb-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Country badge */}
                    {store.country && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                        {store.country}
                      </div>
                    )}
                  </div>
                </Link>
              </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </section>

      {/* Stores Near You & Stories */}
      <SellerStoriesSection stories={stories} />
      <StoresNearYouSection stores={nearStores} country={country} />

      {/* Buy product again */}
      <BuyProductAgain products={products} />


    </main>
  );
}
