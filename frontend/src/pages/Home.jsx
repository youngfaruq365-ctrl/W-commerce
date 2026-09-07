import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, LayoutGrid } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StaggerContainer, StaggerItem, InteractiveLift, FadeUp } from '../components/MotionEngine';
import { celebrate } from '../components/CelebrationController';
import { useCartStore } from '../store/cartStore';

import LayoutEngine from '../components/LayoutEngine';
import PromotionsSection from '../components/PromotionsSection';
import { ProductCardSkeleton, StoreCardSkeleton } from '../components/SkeletonLoaders';
import { layoutLibrary } from '../config/layoutLibrary';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const addToCart = useCartStore(state => state.addToCart);
  // Optional mockup wishlist for now
  const wishlist = [];
  const toggleWishlist = () => {};

  const [searchQuery, setSearchQuery] = React.useState('');
  const [randomLayouts] = React.useState(() => {
    const layouts = [];
    const available = [...layoutLibrary];
    for (let i = 0; i < 4; i++) {
       if (available.length > 0) {
         const randomIndex = Math.floor(Math.random() * available.length);
         layouts.push(available[randomIndex].id);
         available.splice(randomIndex, 1);
       }
    }
    return layouts;
  });
  const [selectedCategory, setSelectedCategory] = useState('Recommended');
  const navigate = useNavigate();

  const filteredProducts = selectedCategory === 'Recommended' 
    ? products 
    : products.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());

  React.useEffect(() => {
    
    // Fetch products
    const fetchHomeData = async () => {
      try {
        const res = await axios.get('/api/v1/products?limit=32');
        if (res.data) {
          const fetchedProducts = res.data.data || res.data.products || (Array.isArray(res.data) ? res.data : []);
          // map products to what Home expects
          const mapped = fetchedProducts.map(p => ({
            ...p,
            coverUrl: p.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            price: p.price || 0,
            title: p.title || p.name || 'Product',
          }));
          setProducts(mapped);
          
          // extract unique stores
          const storeMap = {};
          fetchedProducts.forEach(p => {
             if (p.store && !storeMap[p.store.id]) {
                storeMap[p.store.id] = {
                   id: p.store.id,
                   name: p.store.storeName,
                   slug: p.store.portfolioSlug,
                   logoUrl: p.store.logoUrl,
                   logoLetter: p.store.storeName?.[0],
                   bannerUrl: p.store.bannerUrl,
                };
             }
          });
          setStores(Object.values(storeMap));
        }
      } catch (err) {
        // console.error('Failed to fetch products', err);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchHomeData();
  }, []);
  
  const handleAddToCart = async (eOrProduct, maybeProduct) => {
    const isEvent = eOrProduct && typeof eOrProduct.preventDefault === 'function';
    const e = isEvent ? eOrProduct : null;
    const product = isEvent ? maybeProduct : eOrProduct;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
      celebrate('standard', e);
    }

    if (!product || !product.id) return;
    
    try {
      await addToCart(product.id, 1);
    } catch(err) {
      // console.error(err);
    }
  };  


  const categoryImages = {
    'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=200',
    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=200',
    'Beauty': 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=200',
    'Books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=200',
    'Home': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=200',
    'Food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=200',
    'Auto': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=200',
    'Gaming': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200',
    'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=200',
    'Toys': 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&q=80&w=200',
    'Art': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=200',
    'Health': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=200'
  };

  const baseCategories = ['Fashion', 'Electronics', 'Beauty', 'Books', 'Home', 'Food', 'Auto', 'Gaming', 'Sports', 'Toys', 'Art', 'Health'];
  
  const categories = [
    { name: 'Recommended', icon: <LayoutGrid size={32} color="#333" fill="#333" />, isIcon: true },
    ...baseCategories.map(catName => ({
      name: catName,
      img: categoryImages[catName] || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=200'
    }))
  ];

  return (
    <>
      {/* Top Categories Navigation */}
      <div className="bg-[var(--bg-main)] pt-6 md:pt-8 lg:pt-10 border-b border-black/5">
        <div className="app-container pb-8 md:pb-12">
          <div className="hide-scrollbar flex gap-4 md:gap-8 overflow-x-auto pb-2 scroll-smooth">
            {categories.map(c => (
              <div onClick={() => setSelectedCategory(c.name)} key={c.name} className={`flex-shrink-0 w-20 md:w-24 flex flex-col items-center cursor-pointer transition-opacity duration-300 ${selectedCategory === c.name ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                <div 
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-full mb-3 flex items-center justify-center overflow-hidden bg-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 ${c.isIcon ? 'border-2 border-black/10' : 'border-2 border-transparent'}`}
                >
                  {c.isIcon ? (
                    <div className="w-14 h-14 md:w-[70px] md:h-[70px] rounded-full bg-[#f5f5f5] flex items-center justify-center">
                      {c.icon}
                    </div>
                  ) : (
                    <img src={c.img} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="font-semibold text-xs md:text-sm text-[var(--text-primary)] text-center leading-tight">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="app-container"
        style={{ paddingTop: '0rem' }}
      >
      {/* Marketplace Search Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center mb-8 md:mb-12"
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }} 
          className="max-w-2xl mx-auto relative px-4 md:px-0 group"
        >
          <input 
            type="text" 
            placeholder="What are you looking for?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-standard w-full py-4 px-6 md:py-5 md:px-8 rounded-[50px] bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] text-base md:text-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all duration-300" 
          />
          <button type="submit" className="btn btn-primary absolute right-6 md:right-2 top-2 bottom-2 rounded-full px-6 md:px-8 font-bold hover:scale-105 transition-transform duration-300">Search</button>
        </form>
      </motion.div>



      {/* Trending Products - Random Layout on Refresh */}
      <div style={{ marginBottom: '4rem' }}>
        {!isLoaded ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{selectedCategory === 'Recommended' ? 'Trending Across the Platform' : `${selectedCategory} Products`}</h2>
            <StaggerContainer className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => <StaggerItem key={i}><ProductCardSkeleton /></StaggerItem>)}
            </StaggerContainer>
          </div>
        ) : (
          <div className="space-y-16">
            {randomLayouts.map((layoutId, index) => {
              // Duplicate products so we always have enough for 4 blocks even if DB has few
              const repeatedProducts = [
                ...filteredProducts, 
                ...filteredProducts, 
                ...filteredProducts, 
                ...filteredProducts
              ];
              const productsForLayout = repeatedProducts.slice(index * 8, (index + 1) * 8);
              if (productsForLayout.length === 0) return null;
              
              const sectionTitles = [
                selectedCategory === 'Recommended' ? 'Trending Across the Platform' : `${selectedCategory} Products`,
                'New Arrivals',
                'Featured Collections',
                'Don\'t Miss Out'
              ];

              return (
                <LayoutEngine 
                  key={`${layoutId}-${index}`}
                  section={{ id: `trending-random-${index}`, type: layoutId, title: sectionTitles[index] || 'More Products' }}
                  products={productsForLayout}
                  addToCart={handleAddToCart}
                  wishlist={wishlist}
                  toggleWishlist={toggleWishlist}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Promotions Section */}
      <PromotionsSection products={products} addToCart={handleAddToCart} />

      {/* Popular Stores */}
      <div className="mb-0">
        <h2 className="flex items-center gap-2 mb-6 text-xl md:text-2xl font-bold">
          <Sparkles color="var(--accent-gold)" /> Popular Stores
        </h2>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {!isLoaded ? (
            Array.from({ length: 4 }).map((_, i) => <StaggerItem key={i}><StoreCardSkeleton /></StaggerItem>)
          ) : (
            Object.values(stores).map(store => (
            <StaggerItem key={store.id}>
            <Link to={`/store/${store.slug}`} className="no-underline text-inherit block group h-full">
              <div className="store-card glass-standard flex gap-4 items-center bg-transparent transition-transform duration-300 hover:-translate-y-1 p-4 md:p-5 rounded-xl overflow-hidden relative text-[var(--text-primary)] shadow-md hover:shadow-xl h-full"
              >
                {/* Background Image with Gradient Overlay */}
                {store.bannerUrl ? (
                  <>
                    <div className="store-bg absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{
                      backgroundImage: `url(${store.bannerUrl})`
                    }} />
                    {/* Overlay removed as requested */}
                  </>
                ) : (
                  <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]" />
                )}

                {/* Content */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center text-xl md:text-2xl font-black shrink-0 z-10 shadow-[0_2px_10px_rgba(0,0,0,0.2)] overflow-hidden">
                  {store.logoUrl ? (
                    <img src={store.logoUrl.startsWith('http') || store.logoUrl.startsWith('/') ? store.logoUrl : `/${store.logoUrl}`} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    store.logoLetter || store.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1 z-10">
                  <h3 className="m-0 mb-1 text-lg md:text-xl whitespace-nowrap overflow-hidden text-ellipsis font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{store.name}</h3>
                  <div className="text-[var(--text-secondary)] text-xs md:text-sm flex items-center gap-2 mb-1">
                    <span>{36 + (store.name.length * 12)} Followers</span>
                    <span className="opacity-50">|</span>
                    <span>{5 + (store.name.length % 4)}.{store.name.length % 9}K+ Sold</span>
                  </div>
                  <div className="text-[var(--text-primary)] text-sm flex items-center gap-1 font-bold">
                    4.8 <Star size={14} fill="var(--accent-gold)" color="var(--accent-gold)" className="ml-px" />
                  </div>
                </div>
              </div>
            </Link>
            </StaggerItem>
          )))}
        </StaggerContainer>
      </div>
    </motion.div>
    </>
  );
}
