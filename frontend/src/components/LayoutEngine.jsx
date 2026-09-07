import React from 'react';
import { layoutLibrary } from '../config/layoutLibrary';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import confetti from 'canvas-confetti';

const HoverSlideshowImage = ({ product, ...props }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const productImages = product?.images?.length > 0 
    ? product.images.map(img => {
        const url = img.url || img;
        return (typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))) ? url : `/${url}`;
      })
    : [product?.coverUrl || product?.imageUrl || '/assets/splash_3d_box_1781971684931.png'];

  React.useEffect(() => {
    if (!isHovered || productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % productImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, productImages.length]);

  const currentSrc = productImages[currentImageIndex] || productImages[0];

  return (
    <div 
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentImageIndex(0);
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.img 
          key={currentSrc}
          src={currentSrc}
          alt={product?.title || 'Product'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          {...props}
          style={{ ...props.style, position: 'absolute', inset: 0 }}
        />
      </AnimatePresence>
    </div>
  );
};

// -------------------------------------------------------------
// HELPER FOR ADD TO CART ANIMATION
// -------------------------------------------------------------
const triggerCartAnimation = (e, product, addToCart) => {
  const isOutOfStock = product.variants?.length > 0 
    ? product.variants.every(v => parseInt(v.stock) <= 0)
    : parseInt(product.stockQuantity || '0') <= 0;
    
  if (isOutOfStock) {
    alert("This product is currently out of stock.");
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x, y },
    colors: ['#facc15', '#ffffff', '#aaaaaa'],
    disableForReducedMotion: true
  });
  addToCart(product);
};

// -------------------------------------------------------------
// 1. PREMIUM COVERFLOW
// The signature 3D carousel with cinematic depth and shadows
// -------------------------------------------------------------
const PremiumCoverflow = ({ section, products, addToCart, wishlist, toggleWishlist }) => {
  if (products.length === 0) return null;
  
  return (
    <div style={{ margin: '4rem 0', padding: '0 1rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
        {section.title || "Trending Products"}
      </h2>
      
      <Swiper
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        spaceBetween={40}
        coverflowEffect={{
          rotate: 15,
          stretch: 0,
          depth: 300,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={{ clickable: true }}
        navigation={true}
        modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        style={{ padding: '2rem 0 5rem 0', '--swiper-navigation-color': 'var(--accent-gold)', '--swiper-pagination-color': 'var(--accent-gold)' }}
      >
        {products.map((product) => {
          const isWishlisted = wishlist?.find(p => p.id === product.id);
          return (
            <SwiperSlide key={product.id} style={{ width: 'min(100%, 320px)', height: '460px' }}>
              <div className="coverflow-slide-inner">
                <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                  <HoverSlideshowImage product={product} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Link>
                
                <button 
                  onClick={(e) => { e.preventDefault(); toggleWishlist && toggleWishlist(product); }}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', zIndex: 10 }}
                  title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Heart size={20} color={isWishlisted ? "#ef4444" : "#fff"} fill={isWishlisted ? "#ef4444" : "none"} />
                </button>
                
                <div className="coverflow-overlay">
                  <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 0, lineHeight: '1.3', fontWeight: 'bold' }}>{product.title}</h3>
                  </Link>
                  
                  <div className="coverflow-description">
                    {product.description || "A fantastic product you won't be able to resist."}
                  </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <p style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>₦{product.price}</p>
                  <motion.button 
                    whileTap={{ scale: 0.8, rotate: -10 }}
                    onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                    style={{ 
                      width: '40px', height: '40px', 
                      borderRadius: '50%', background: 'var(--accent-gold)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', border: 'none' 
                    }}
                    title="Add to Cart"
                  >
                    <ShoppingCart size={20} color="#000" />
                  </motion.button>
                </div>
              </div>
            </div>
          </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

// -------------------------------------------------------------
// 2. LUXURY BENTO
// Asymmetric grid mixing hero products with smaller cards
// -------------------------------------------------------------
const LuxuryBento = ({ section, products, addToCart }) => {
  if (products.length === 0) return null;
  // We need at least 3 products to make a bento look good, 
  // but we'll fall back gracefully.
  const mainProduct = products[0];
  const sideProducts = products.slice(1, 3);
  const bottomProducts = products.slice(3, 7);

  return (
    <div style={{ margin: '5rem 0' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
        {section.title || "Featured Highlights"}
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Main Hero Card */}
        {mainProduct && (
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', height: '500px', gridColumn: '1 / -1' }}>
            <HoverSlideshowImage product={mainProduct} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '3rem' }}>
              <h3 style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{mainProduct.title}</h3>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '2rem' }}>{mainProduct.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <span style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 'bold' }}>₦{mainProduct.price}</span>
                <button onClick={(e) => triggerCartAnimation(e, mainProduct, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  Add to Cart
                </button>
                <Link to={`/product/${mainProduct.id}`} className="btn btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  View Details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
        {[...sideProducts, ...bottomProducts].map(product => (
          <div key={product.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '400px', borderRadius: '20px' }}>
            <Link to={`/product/${product.id}`} style={{ flex: 1, display: 'block', overflow: 'hidden' }}>
              <HoverSlideshowImage product={product} whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>
            <div style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                <button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. EDITORIAL MASONRY
// Variable heights, waterfall effect, luxury editorial feel
// -------------------------------------------------------------
const EditorialMasonry = ({ section, products, addToCart }) => {
  if (products.length === 0) return null;
  return (
    <div style={{ margin: '5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>
          {section.title || "Curated Collection"}
        </h2>
        <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Vol. 1</span>
      </div>
      
      {/* CSS columns masonry */}
      <div className="editorial-masonry-grid">
        {products.map((product, idx) => {
          // Fake variable height based on index to create masonry look without actual image heights
          const height = idx % 3 === 0 ? '500px' : idx % 2 === 0 ? '350px' : '450px';
          
          return (
            <div key={product.id} style={{ breakInside: 'avoid', marginBottom: '1.5rem', position: 'relative', borderRadius: '16px', overflow: 'hidden', height }}>
              <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                <HoverSlideshowImage product={product} whileHover={{ scale: 1.05 }} transition={{ duration: 0.6 }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 1.5rem 1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{product.title}</h4>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>₦{product.price}</span>
                </div>
                <button 
                  onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                  style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. INFINITY CAROUSEL
// Continuous scroll loop
// -------------------------------------------------------------
const InfinityCarousel = ({ section, products, addToCart }) => {
  if (products.length === 0) return null;
  return (
    <div style={{ margin: '5rem 0', overflow: 'hidden' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
        {section.title || "New Arrivals"}
      </h2>
      
      <Swiper
        slidesPerView={'auto'}
        spaceBetween={30}
        loop={true}
        speed={4000}
        autoplay={{ delay: 0, disableOnInteraction: false }}
        modules={[Autoplay]}
        className="infinity-swiper"
      >
        {[...products, ...products].map((product, idx) => ( // double it for smooth loop
          <SwiperSlide key={`${product.id}-${idx}`} style={{ width: '280px' }}>
            <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-card)', padding: '1rem' }}>
              <Link to={`/product/${product.id}`}>
                <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <HoverSlideshowImage product={product} whileHover={{ scale: 1.05 }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </Link>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                <button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

// -------------------------------------------------------------
// 5. CENTER STAGE
// One huge product taking center stage
// -------------------------------------------------------------
const CenterStage = ({ section, products, addToCart }) => {
  if (products.length === 0) return null;
  const product = products[0]; // Just takes the first one
  return (
    <div style={{ margin: '5rem 0' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
        {section.title || "Spotlight"}
      </h2>
      
      <div style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img loading="lazy" src={product.coverUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, filter: 'blur(20px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '4rem', alignItems: 'center', padding: '4rem', maxWidth: '1000px', width: '100%' }}>
          <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} style={{ flex: 1, height: '450px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
             <HoverSlideshowImage product={product} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          
          <motion.div initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ flex: 1 }}>
            <h3 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1.1, margin: '0 0 1rem 0' }}>{product.title}</h3>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>{product.description}</p>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '2rem' }}>₦{product.price}</div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={(e) => triggerCartAnimation(e, product, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px', flex: 1 }}>
                Add to Cart
              </button>
              <Link to={`/product/${product.id}`} className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px', textDecoration: 'none' }}>
                View Details
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};


// -------------------------------------------------------------
// 6. GRID ARCHETYPE
// -------------------------------------------------------------
const GridArchetype = ({ section, products, params, addToCart, wishlist, toggleWishlist }) => {
  if (products.length === 0) return null;
  const columns = params?.columns || 3;
  const gap = params?.gap || 24;
  const roundness = params?.roundness || 16;
  
  return (
    <div style={{ margin: '5rem 0' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
        {section.title || "Grid Collection"}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(calc(100% / ${columns} - ${gap}px), 1fr))`, gap: `${gap}px` }}>
        {products.map(product => {
          const isWishlisted = wishlist?.find(p => p.id === product.id);
          return (
            <div key={product.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: `${roundness}px`, position: 'relative' }}>
              <Link to={`/product/${product.id}`} style={{ display: 'block', overflow: 'hidden', aspectRatio: product.displayConfig?.discoveryRatio === 'portrait' ? '3/4' : product.displayConfig?.discoveryRatio === 'landscape' ? '16/9' : '1/1' }}>
                <HoverSlideshowImage product={product} whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); toggleWishlist && toggleWishlist(product); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart size={16} color={isWishlisted ? "#ef4444" : "#fff"} fill={isWishlisted ? "#ef4444" : "none"} />
              </button>
            <div style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                <button onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// ENGINE ROUTER
// -------------------------------------------------------------
export default function LayoutEngine({ section, products, addToCart, wishlist, toggleWishlist }) {
  const config = layoutLibrary.find(l => l.id === section.type) || layoutLibrary[0];
  const params = config.params || {};

  switch (config.archetype) {
    case 'coverflow': return <PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />;
    case 'bento': return <LuxuryBento section={section} products={products} params={params} addToCart={addToCart} />;
    case 'masonry': return <EditorialMasonry section={section} products={products} params={params} addToCart={addToCart} />;
    case 'carousel': return <InfinityCarousel section={section} products={products} params={params} addToCart={addToCart} />;
    case 'hero': return <CenterStage section={section} products={products} params={params} addToCart={addToCart} />;
    case 'grid': return <GridArchetype section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />;
    default: return <PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />;
  }
}
