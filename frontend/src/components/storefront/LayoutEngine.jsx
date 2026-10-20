import React from 'react';
import { layoutLibrary } from '../../config/layoutLibrary';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import toast from 'react-hot-toast';
import 'swiper/css/navigation';
import { celebrate } from '../visual/CelebrationController';
import { MagneticButton, RippleClick, HoverLiftCard, RevealContent } from '../visual/AnimationLibrary';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';

const ActionButton = ({ config, onClick, className = '', style = {}, title, children }) => {
  const styleType = config?.buttonStyle || 'standard';
  
  if (styleType === 'magnetic') {
    return <MagneticButton onClick={onClick} className={className} style={style} title={title}>{children}</MagneticButton>;
  }
  if (styleType === 'ripple') {
    return <RippleClick onClick={onClick} className={className} style={style} title={title}>{children}</RippleClick>;
  }
  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={className}
      style={style}
      title={title}
    >
      {children}
    </motion.button>
  );
};

const ProductCardWrapper = ({ config, children, className = '', style = {} }) => {
  const hover = config?.hoverEffect || 'none';
  const borderGlow = config?.borderGlow || 'none';
  
  let combinedClass = className;
  if (borderGlow && borderGlow !== 'none') {
    combinedClass += ` anim-border-glow-${borderGlow}`;
  }
  
  if (hover === 'lift') {
    return <HoverLiftCard className={combinedClass} style={style}>{children}</HoverLiftCard>;
  }
  
  return <div className={combinedClass} style={style}>{children}</div>;
};

const SectionWrapper = ({ config, children, style={} }) => {
  if (config?.sectionReveal === 'reveal') {
    return <RevealContent style={style}>{children}</RevealContent>;
  }
  return <div style={style}>{children}</div>;
};

// -------------------------------------------------------------
// HELPER FOR IMAGE URL RESOLUTION
// -------------------------------------------------------------
const getImageUrl = (product) => {
  if (!product) return PLACEHOLDER_IMAGE;
  if (product.coverUrl) return product.coverUrl;
  if (product.images && product.images.length > 0) {
    const img = product.images[0];
    const url = typeof img === 'string' ? img : img.url;
    return (url && (url.startsWith('http') || url.startsWith('/'))) ? url : `/${url}`;
  }
  if (product.imageUrl) return product.imageUrl;
  return PLACEHOLDER_IMAGE;
};


// -------------------------------------------------------------
// HELPER FOR ADD TO CART ANIMATION
// -------------------------------------------------------------
const triggerCartAnimation = (e, product, addToCart) => {
  const isOutOfStock = product.variants?.length > 0 
    ? product.variants.every(v => parseInt(v.stock) <= 0)
    : parseInt(product.stockQuantity || '0') <= 0;
    
  if (isOutOfStock) {
    toast.error('This product is currently out of stock.');
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  addToCart(product.id).then(() => {
    celebrate('standard', e);
  }).catch((err) => {
    toast.error(err.response?.data?.message || err.message || 'Failed to add to cart');
  });
};

// -------------------------------------------------------------
// 1. PREMIUM COVERFLOW
// The signature 3D carousel with cinematic depth and shadows
// -------------------------------------------------------------
const PremiumCoverflow = ({ section, products, addToCart, wishlist, toggleWishlist, animationConfig }) => {
  if (products.length === 0) return null;
  
  return (
    <SectionWrapper config={animationConfig} style={{ margin: '4rem 0', padding: '0 1rem' }}>
      {!section?.hideTitle && section?.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
          {section.title}
        </h2>
      )}
      
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
              <ProductCardWrapper config={animationConfig} className="coverflow-slide-inner" style={{ height: "100%", width: "100%" }}>
                <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                  <img loading="lazy" src={getImageUrl(product)} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  <ActionButton 
                    config={animationConfig}
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
                  </ActionButton>
                </div>
                </div>
              </ProductCardWrapper>
          </SwiperSlide>
          );
        })}
      </Swiper>
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// 2. LUXURY BENTO
// Asymmetric grid mixing hero products with smaller cards
// -------------------------------------------------------------
const LuxuryBento = ({ section, products, addToCart, animationConfig }) => {
  if (products.length === 0) return null;
  const mainProduct = products[0];
  const sideProducts = products.slice(1, 3);
  const bottomProducts = products.slice(3, 7);

  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>
      {!section?.hideTitle && section?.title && (
        <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
          {section.title}
        </h2>
      )}
      
      {/* Main Hero Card in a single-item bento grid layout for consistency */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {mainProduct && (
          <div className="bento-item" style={{ position: 'relative', padding: 0, height: '500px', gridColumn: '1 / -1' }}>
            <img loading="lazy" src={mainProduct.coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={mainProduct.title} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '3rem' }}>
              <h3 style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{mainProduct.title}</h3>
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', marginBottom: '2rem' }}>{mainProduct.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <span style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 'bold' }}>₦{mainProduct.price}</span>
                <ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, mainProduct, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  Add to Cart
                </ActionButton>
                <Link to={`/product/${mainProduct.id}`} className="btn btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                  View Details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bento-grid">
        {[...sideProducts, ...bottomProducts].map(product => (
          <ProductCardWrapper config={animationConfig} key={product.id} className="bento-item" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '400px' }}>
            <Link to={`/product/${product.id}`} style={{ flex: 1, display: 'block', overflow: 'hidden' }}>
              <motion.img loading="lazy" whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} src={getImageUrl(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={product.title} />
            </Link>
            <Link to={`/product/${product.id}`} style={{ padding: '1.5rem', display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                <ActionButton config={animationConfig} onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerCartAnimation(e, product, addToCart); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>
              </div>
            </Link>
          </ProductCardWrapper>
        ))}
      </div>
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// 3. EDITORIAL MASONRY
// Variable heights, waterfall effect, luxury editorial feel
// -------------------------------------------------------------
const EditorialMasonry = ({ section, products, addToCart, animationConfig }) => {
  if (products.length === 0) return null;
  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>
      {!section?.hideTitle && section?.title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>
            {section.title}
          </h2>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Vol. 1</span>
        </div>
      )}
      
      {/* CSS columns masonry */}
      <div className="editorial-masonry-grid">
        {products.map((product, idx) => {
          // Fake variable height based on index to create masonry look without actual image heights
          const height = idx % 3 === 0 ? '500px' : idx % 2 === 0 ? '350px' : '450px';
          
          return (
            <ProductCardWrapper config={animationConfig} key={product.id} style={{ breakInside: 'avoid', marginBottom: '1.5rem', position: 'relative', borderRadius: '16px', overflow: 'hidden', height }}>
              <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                <motion.img loading="lazy" whileHover={{ scale: 1.05 }} transition={{ duration: 0.6 }} src={getImageUrl(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 1.5rem 1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{product.title}</h4>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>₦{product.price}</span>
                </div>
                <ActionButton 
                  config={animationConfig}
                  onClick={(e) => triggerCartAnimation(e, product, addToCart)}
                  style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ShoppingCart size={16} />
                </ActionButton>
              </div>
            </ProductCardWrapper>
          )
        })}
      </div>
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// 4. INFINITY CAROUSEL
// Continuous scroll loop
// -------------------------------------------------------------
const InfinityCarousel = ({ section, products, addToCart, animationConfig }) => {
  if (products.length === 0) return null;
  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0', overflow: 'hidden' }}>
      {!section?.hideTitle && section?.title && (
        <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
          {section.title}
        </h2>
      )}
      
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
            <ProductCardWrapper config={animationConfig} style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-card)', padding: '1rem', height: "100%" }}>
              <Link to={`/product/${product.id}`}>
                <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <motion.img loading="lazy" whileHover={{ scale: 1.05 }} src={getImageUrl(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </Link>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                {storeConfig.showAddToCart !== false && <ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>}
              </div>
            </ProductCardWrapper>
          </SwiperSlide>
        ))}
      </Swiper>
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// 5. CENTER STAGE
// One huge product taking center stage
// -------------------------------------------------------------
const CenterStage = ({ section, products, addToCart, animationConfig }) => {
  if (products.length === 0) return null;
  const product = products[0]; // Just takes the first one
  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>
      {!section?.hideTitle && section?.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
          {section.title}
        </h2>
      )}
      
      <div style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img loading="lazy" src={getImageUrl(product)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, filter: 'blur(20px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '4rem', alignItems: 'center', padding: '4rem', maxWidth: '1000px', width: '100%' }}>
          <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} style={{ flex: 1, height: '450px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
             <img loading="lazy" src={getImageUrl(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          
          <motion.div initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ flex: 1 }}>
            <h3 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1.1, margin: '0 0 1rem 0' }}>{product.title}</h3>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>{product.description}</p>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '2rem' }}>₦{product.price}</div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <ActionButton config={animationConfig} onClick={(e) => triggerCartAnimation(e, product, addToCart)} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px', flex: 1 }}>
                Add to Cart
              </ActionButton>
              <Link to={`/product/${product.id}`} className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '30px' }}>
                View Details
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
};


// -------------------------------------------------------------
// 6. GRID ARCHETYPE
// -------------------------------------------------------------
const GridArchetype = ({ section, products, params, addToCart, wishlist, toggleWishlist, animationConfig }) => {
  if (products.length === 0) return null;
  const columns = params?.columns || 3;
  const gap = params?.gap || 24;
  const roundness = params?.roundness || 16;
  
  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>
      {!section?.hideTitle && section?.title && (
        <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
          {section.title}
        </h2>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(calc(100% / ${columns} - ${gap}px), 1fr))`, gap: `${gap}px` }}>
        {products.map(product => {
          const isWishlisted = wishlist?.find(p => p.id === product.id);
          return (
            <ProductCardWrapper config={animationConfig} key={product.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: `${roundness}px`, position: 'relative' }}>
              <Link to={`/product/${product.id}`} style={{ display: 'block', overflow: 'hidden', aspectRatio: product.displayConfig?.discoveryRatio === 'portrait' ? '3/4' : product.displayConfig?.discoveryRatio === 'landscape' ? '16/9' : '1/1' }}>
                <motion.img loading="lazy" whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} src={getImageUrl(product)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); toggleWishlist && toggleWishlist(product); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart size={16} color={isWishlisted ? "#ef4444" : "#fff"} fill={isWishlisted ? "#ef4444" : "none"} />
              </button>
            <Link to={`/product/${product.id}`} style={{ padding: '1.5rem', background: 'var(--bg-card)', display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{product.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₦{product.price}</span>
                <ActionButton config={animationConfig} onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerCartAnimation(e, product, addToCart); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ShoppingCart size={18} /></ActionButton>
              </div>
            </Link>
          </ProductCardWrapper>
          );
        })}
      </div>
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// SCATTERED FLOATING
// -------------------------------------------------------------
const ScatteredFloating = ({ section, products, params, addToCart, wishlist, toggleWishlist, animationConfig = {} }) => {
  const isFood = section.type === 'floating-circles-food';
  const isFashion = section.type === 'floating-circles-fashion';
  const isTech = section.type === 'floating-squares-tech';

  let displayProducts = [...products];
  while (displayProducts.length < 7) {
    displayProducts.push({ id: `dummy-${displayProducts.length}`, title: 'Sample Product', price: 5000 });
  }

  const p = displayProducts;
  const img = (idx) => p[idx].images && p[idx].images.length > 0 ? p[idx].images[0].url : PLACEHOLDER_IMAGE;
  const title = (idx) => p[idx].title || 'Product';
  const price = (idx) => `₦${p[idx].price || 5000}`;
  
  const ProductLink = ({ idx, className, isMain = false }) => {
    const product = p[idx];
    
    return (
      <Link to={`/product/${product.id}`} className={className} style={{display:'block'}}>
         <motion.img whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} src={img(idx)} alt={title(idx)} style={{width:'100%', height:'100%', objectFit:'cover'}} />
         {isMain && (
           <div className={`${isFood ? 'food' : isFashion ? 'fashion' : 'electronics'}-main-info`}>
             <strong>{title(idx)}</strong>
             <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
               {storeConfig.showPrice !== false && <span>{price(idx)}</span>}
               {storeConfig.showAddToCart !== false && <ActionButton config={animationConfig} onClick={(e) => { e.preventDefault(); /* triggerCartAnimation handles it */ addToCart(product); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}><ShoppingCart size={14} /></ActionButton>}
             </div>
           </div>
         )}
      </Link>
    );
  };

  return (
    <SectionWrapper config={animationConfig} style={{ margin: '5rem 0' }}>
      <style>{`
        .foodie-section { background:#f4eee8; position:relative; width:100%; height:620px; border-radius: 12px; margin-bottom: 2rem; overflow:hidden; }
        .food-stage { width:100%; height:100%; position:relative; display:flex; align-items:center; justify-content:center; }
        .food-main { width:420px; height:420px; border-radius:50%; overflow:hidden; position:relative; z-index:5; border:10px solid #fff; box-shadow: 0 30px 80px rgba(0,0,0,.18); transition:.5s; display:block; }
        .food-main img { width:100%; height:100%; object-fit:cover; transition:.5s; }
        .food-main-info { position:absolute; left:25px; right:25px; bottom:25px; padding:16px 20px; background:rgba(255,255,255,.92); backdrop-filter:blur(12px); border-radius:100px; display:flex; align-items:center; justify-content:space-between; gap:20px; color:#111; }
        .food-main-info strong { font-size:14px; margin:0; }
        .food-main-info span { font-size:13px; color:#555; }
        .food-thumb { width:135px; height:135px; position:absolute; overflow:hidden; border-radius:50%; border:7px solid #fff; background:#ddd; box-shadow: 0 15px 35px rgba(0,0,0,.14); z-index:6; display:block; }
        .food-thumb img { width:100%; height:100%; object-fit:cover; }
        .food-one { left:9%; top:30px; }
        .food-two { right:10%; top:75px; }
        .food-three { left:3%; bottom:100px; }
        .food-four { right:5%; bottom:45px; }
        .food-five { left:26%; bottom:5px; width:105px; height:105px; }
        .food-six { right:27%; top:0; width:105px; height:105px; }

        .fashion-section { background:#dedede; position:relative; width:100%; height:620px; border-radius: 12px; margin-bottom: 2rem; overflow:hidden; }
        .fashion-stage { width:100%; height:100%; position:relative; display:flex; align-items:center; justify-content:center; }
        .fashion-main { width:430px; height:430px; position:relative; overflow:hidden; z-index:5; border-radius: 50% 50% 20px 20px; background:#ccc; box-shadow: 0 30px 80px rgba(0,0,0,.2); display:block; }
        .fashion-main img { width:100%; height:100%; object-fit:cover; }
        .fashion-main-info { position:absolute; left:20px; right:20px; bottom:20px; padding:17px 20px; background:rgba(255,255,255,.93); border-radius:15px; display:flex; align-items:center; justify-content:space-between; color:#111; }
        .fashion-main-info strong { font-size:14px; margin:0; }
        .fashion-main-info span { font-size:13px; color:#555; }
        .fashion-item { position:absolute; width:190px; height:270px; overflow:hidden; z-index:6; background:#ccc; box-shadow: 0 20px 40px rgba(0,0,0,.17); display:block; }
        .fashion-item img { width:100%; height:100%; object-fit:cover; }
        .fashion-left { left:6%; border-radius: 150px 0 0 150px; }
        .fashion-right { right:6%; border-radius: 0 150px 150px 0; }
        .fashion-top { top:0; left:50%; transform:translateX(-50%); width:155px; height:125px; border-radius: 150px 150px 0 0; }
        .fashion-bottom { bottom:0; left:50%; transform:translateX(-50%); width:155px; height:125px; border-radius: 0 0 150px 150px; }

        .electronics-section { background:#111; color:#fff; position:relative; width:100%; height:620px; border-radius: 12px; margin-bottom: 2rem; overflow:hidden; }
        .electronics-stage { width:100%; height:100%; position:relative; display:flex; align-items:center; justify-content:center; }
        .electronics-main { width:430px; height:430px; position:relative; overflow:hidden; z-index:5; background:#222; box-shadow: 0 30px 80px rgba(0,0,0,.6); display:block; }
        .electronics-main img { width:100%; height:100%; object-fit:cover; }
        .electronics-main-info { position:absolute; left:20px; right:20px; bottom:20px; padding:17px 20px; background:rgba(255,255,255,.94); color:#111; display:flex; align-items:center; justify-content:space-between; }
        .electronics-main-info strong { font-size:14px; margin:0; }
        .electronics-main-info span { font-size:13px; color:#555; }
        .electronics-item { width:175px; height:175px; position:absolute; overflow:hidden; background:#222; z-index:6; box-shadow: 0 20px 40px rgba(0,0,0,.5); display:block; }
        .electronics-item img { width:100%; height:100%; object-fit:cover; }
        .electronics-one { left:6%; top:35px; }
        .electronics-two { right:7%; top:80px; }
        .electronics-three { left:12%; bottom:50px; }
        .electronics-four { right:12%; bottom:15px; }
        
        @media(max-width:900px){
            .foodie-section, .fashion-section, .electronics-section { height: 720px; }
            .food-main, .fashion-main, .electronics-main { width: 330px; height: 330px; }
            .food-thumb { width: 100px; height: 100px; }
            .fashion-item { width: 145px; height: 210px; }
            .electronics-item { width: 125px; height: 125px; }
        }
        @media(max-width:600px){
            .foodie-section, .fashion-section, .electronics-section { height: 520px; }
            .food-main { width: 245px; height: 245px; }
            .food-thumb { width: 70px; height: 70px; border-width: 4px; }
            .food-one { left:3%; top:30px; } .food-two { right:3%; top:55px; } .food-three { left:0; bottom:80px; } .food-four { right:0; bottom:65px; } .food-five { left:25%; bottom:0; width:60px; height:60px; } .food-six { right:25%; top:0; width:60px; height:60px; }
            .fashion-main { width: 260px; height: 260px; }
            .fashion-item { width: 90px; height: 145px; }
            .fashion-top, .fashion-bottom { width: 90px; height: 75px; }
            .fashion-left { left: 0; } .fashion-right { right: 0; }
            .electronics-main { width: 260px; height: 260px; }
            .electronics-item { width: 90px; height: 90px; }
            .electronics-one { left: 0; top: 40px; } .electronics-two { right: 0; top: 60px; } .electronics-three { left: 5%; bottom: 50px; } .electronics-four { right: 5%; bottom: 30px; }
        }
      `}</style>

      {isFood && (
        <div className="category-section foodie-section">
          <div className="food-stage">
            <ProductLink idx={1} className="food-thumb food-one" />
            <ProductLink idx={2} className="food-thumb food-two" />
            <ProductLink idx={3} className="food-thumb food-three" />
            <ProductLink idx={4} className="food-thumb food-four" />
            <ProductLink idx={5} className="food-thumb food-five" />
            <ProductLink idx={6} className="food-thumb food-six" />
            <ProductLink idx={0} className="food-main" isMain={true} />
          </div>
        </div>
      )}

      {isFashion && (
        <div className="category-section fashion-section">
          <div className="fashion-stage">
            <ProductLink idx={1} className="fashion-item fashion-left" />
            <ProductLink idx={2} className="fashion-item fashion-right" />
            <ProductLink idx={3} className="fashion-item fashion-top" />
            <ProductLink idx={4} className="fashion-item fashion-bottom" />
            <ProductLink idx={0} className="fashion-main" isMain={true} />
          </div>
        </div>
      )}

      {isTech && (
        <div className="category-section electronics-section">
          <div className="electronics-stage">
            <ProductLink idx={1} className="electronics-item electronics-one" />
            <ProductLink idx={2} className="electronics-item electronics-two" />
            <ProductLink idx={3} className="electronics-item electronics-three" />
            <ProductLink idx={4} className="electronics-item electronics-four" />
            <ProductLink idx={0} className="electronics-main" isMain={true} />
          </div>
        </div>
      )}
    </SectionWrapper>
  );
};

// -------------------------------------------------------------
// ENGINE ROUTER
// -------------------------------------------------------------
export default function LayoutEngine({ section, products, addToCart, wishlist, toggleWishlist, animationConfig = {}, storeConfig = {} }) {
  const config = layoutLibrary.find(l => l.id === section.type) || layoutLibrary[0];
  const params = config.params || {};

  switch (config.archetype) {
    case 'coverflow': return <PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'bento': return <LuxuryBento section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'masonry': return <EditorialMasonry section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'carousel': return <InfinityCarousel section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'hero': return <CenterStage section={section} products={products} params={params} addToCart={addToCart} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'grid': return <GridArchetype section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} storeConfig={storeConfig} />;
    case 'scattered': return <ScatteredFloating section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} storeConfig={storeConfig} />;
    default: return <PremiumCoverflow section={section} products={products} params={params} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} animationConfig={animationConfig} storeConfig={storeConfig} />;
  }
}
