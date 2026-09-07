import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Star, Sparkles, LayoutGrid } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem, InteractiveLift, FadeUp } from '../components/MotionEngine';
import { celebrate } from '../components/CelebrationController';

import LayoutEngine from '../components/LayoutEngine';
import PromotionsSection from '../components/PromotionsSection';
import { ProductCardSkeleton, StoreCardSkeleton } from '../components/SkeletonLoaders';
import { layoutLibrary } from '../config/layoutLibrary';

export default function Home({ products, stores, addToCart, wishlist, toggleWishlist, isLoaded }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [randomTrendingLayout, setRandomTrendingLayout] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    // Pick a random layout for the trending section on mount
    const randomLayout = layoutLibrary[Math.floor(Math.random() * layoutLibrary.length)];
    setRandomTrendingLayout(randomLayout.id);
  }, []);
  
  const handleAddToCart = (e, product) => {
    celebrate('standard', e);
    addToCart(product);
  };

  const baseCategories = ['Fashion', 'Electronics', 'Beauty', 'Books', 'Home', 'Food', 'Auto'];
  
  const categories = [
    { name: 'Recommended', icon: <LayoutGrid size={32} color="#333" fill="#333" />, isIcon: true },
    ...baseCategories.map(catName => {
      const product = products.find(p => p.category === catName);
      return {
        name: catName,
        img: product ? product.coverUrl : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=200'
      };
    })
  ];

  return (
    <>
      <Helmet>
        <title>W-Commerce | Global Marketplace</title>
        <meta name="description" content="Discover top-quality items from verified sellers on W-Commerce." />
        <meta property="og:title" content="W-Commerce | Global Marketplace" />
        <meta property="og:description" content="Discover top-quality items from verified sellers on W-Commerce." />
      </Helmet>
      {/* Top Categories Navigation */}
      <div style={{ background: 'var(--bg-main)', padding: '1.5rem 0 0 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="app-container" style={{ paddingBottom: '3rem' }}>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '0' }}>
            {categories.map(c => (
              <Link to={`/products?category=${encodeURIComponent(c.name)}`} key={c.name} style={{ textDecoration: 'none', flexShrink: 0, width: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div 
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%', 
                    marginBottom: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#fff',
                    border: c.isIcon ? '2px solid rgba(0,0,0,0.1)' : '2px solid transparent',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {c.isIcon ? (
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.icon}
                    </div>
                  ) : (
                    <img src={c.img} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.2' }}>{c.name}</div>
              </Link>
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
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }} 
          style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}
        >
          <input 
            type="text" 
            placeholder="What are you looking for?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-standard"
            style={{ width: '100%', padding: '1.25rem 2rem', borderRadius: '50px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
          />
          <button type="submit" className="btn btn-primary" style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', bottom: '0.5rem', borderRadius: '40px', padding: '0 2rem' }}>Search</button>
        </form>
      </div>



      {/* Trending Products - Random Layout on Refresh */}
      <div style={{ marginBottom: '4rem' }}>
        {!isLoaded ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Trending Across the Platform</h2>
            <StaggerContainer className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => <StaggerItem key={i}><ProductCardSkeleton /></StaggerItem>)}
            </StaggerContainer>
          </div>
        ) : (
          randomTrendingLayout && (
            <LayoutEngine 
              section={{ id: 'trending-random', type: randomTrendingLayout, title: 'Trending Across the Platform' }}
              products={products.slice(0, 8)}
              addToCart={addToCart}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
            />
          )
        )}
      </div>

      {/* Promotions Section */}
      <PromotionsSection products={products} addToCart={addToCart} />

      {/* Popular Stores */}
      <div style={{ marginBottom: '0' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Sparkles color="var(--accent-gold)" /> Popular Stores
        </h2>
        <StaggerContainer className="store-grid">
          {!isLoaded ? (
            Array.from({ length: 4 }).map((_, i) => <StaggerItem key={i}><StoreCardSkeleton /></StaggerItem>)
          ) : (
            Object.values(stores).map(store => (
            <StaggerItem key={store.id}>
            <Link to={`/store/${store.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="store-card glass-standard"
                style={{ 
                  display: 'flex', gap: '1rem', alignItems: 'center', 
                  background: 'transparent',
                  transition: 'transform 0.2s', padding: '1rem 1.25rem', 
                  borderRadius: '8px', overflow: 'hidden', position: 'relative',
                  color: 'var(--text-primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} 
              >
                {/* Background Image with Gradient Overlay */}
                <div className="store-bg" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
                  backgroundImage: `url(${store.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center'
                }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.4) 100%)'
                }} />

                {/* Content */}
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '900', flexShrink: 0, zIndex: 1, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                  {store.logoLetter || store.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1, zIndex: 1 }}>
                  <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', color: 'var(--text-primary)' }}>{store.name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                    <span>{36 + (store.name.length * 12)} Followers</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span>{5 + (store.name.length % 4)}.{store.name.length % 9}K+ Sold</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 'bold' }}>
                    4.8 <Star size={12} fill="var(--accent-gold)" color="var(--accent-gold)" style={{ marginLeft: '1px' }} />
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
