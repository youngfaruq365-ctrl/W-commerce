import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Eye, ChevronRight, X, Loader2, Timer, PartyPopper, Sunset } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { celebrate } from './CelebrationController';


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

export default function PromotionsSection({ products, addToCart }) {
  const [activeCategory, setActiveCategory] = useState('Recommended');
  const [quickLookItem, setQuickLookItem] = useState(null);
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(false);
  const [quickLookLoading, setQuickLookLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    'Recommended',
    'Fashion',
    'Electronics',
    'Books',
    'Beauty',
    'Home',
    'Auto',
    'Food'
  ];

  // Filter products to only show those with active promos AND matching category
  let promoProducts = products.filter(p => {
    if (!p.promoDiscount) return false;
    if (activeCategory === 'Recommended') return true;
    return p.category === activeCategory;
  });

  // FALLBACK FOR DESIGN PREVIEW:
  // If there are no real promos, let's take some normal products and pretend they are promos so the design is visible!
  if (promoProducts.length === 0 && products.length > 0) {
    promoProducts = products.slice(0, 3).map((p, i) => ({
      ...p,
      promoDiscount: p.price ? Math.floor(p.price * 0.2) : 500,
      promoType: i === 0 ? 'FLASH_DEAL' : (i === 1 ? 'FESTIVAL_PROMO' : 'WEEKEND_PROMO'),
      promoEndTime: new Date(Date.now() + 86400000).toISOString()
    }));
  }

  if (promoProducts.length === 0 && activeCategory === 'Recommended') return null;

  const handleQuickLook = (product) => {
    setQuickLookItem(product);
    setIsQuickLookOpen(true);
    setQuickLookLoading(true);
    // Simulate loading a premium modal
    setTimeout(() => {
      setQuickLookLoading(false);
    }, 800);
  };

  const calculateTimeLeft = (endTime) => {
    if (!endTime) return '11:59:02'; // default fallback
    const end = new Date(endTime).getTime();
    const distance = end - currentTime;
    if (distance < 0) return '00:00:00';
    
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFestivalHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { x, y },
      colors: ['#FFD700', '#FF4500', '#FF1493', '#00BFFF', '#32CD32'],
      disableForReducedMotion: true
    });
  };

  const flashDeals = promoProducts.filter(p => p.promoType === 'FLASH_DEAL');
  const festivalPromos = promoProducts.filter(p => p.promoType === 'FESTIVAL_PROMO');
  const weekendPromos = promoProducts.filter(p => p.promoType === 'WEEKEND_PROMO');
  const otherPromos = promoProducts.filter(p => !['FLASH_DEAL', 'FESTIVAL_PROMO', 'WEEKEND_PROMO'].includes(p.promoType));

  // If no promos have explicit types (e.g. legacy data), distribute them for demo purposes:
  const displayFlashDeals = flashDeals.length > 0 ? flashDeals : otherPromos.slice(0, Math.ceil(otherPromos.length / 3));
  const displayFestivalPromos = festivalPromos.length > 0 ? festivalPromos : otherPromos.slice(Math.ceil(otherPromos.length / 3), Math.ceil(otherPromos.length * 2 / 3));
  const displayWeekendPromos = weekendPromos.length > 0 ? weekendPromos : otherPromos.slice(Math.ceil(otherPromos.length * 2 / 3));


  const renderCard = (product, idx, type) => {
    const discount = product.promoDiscount || 0;
    const soldCount = product.soldCount || product.salesCount || 0;
    const isNumberOne = idx === 0;

    let cardStyle = {};
    let tagStyle = {};
    let bannerContent = null;
    let mainColor = '';

    if (type === 'FLASH_DEAL') {
      cardStyle = { background: '#1a1a1a', color: '#fff', border: '2px solid #ff1744', boxShadow: '0 0 15px rgba(255, 23, 68, 0.2)' };
      mainColor = '#ff1744';
      tagStyle = { background: 'rgba(255, 23, 68, 0.1)', border: '1px solid #ff1744', color: '#ff1744' };
      bannerContent = (
        <div style={{ background: '#ff1744', color: '#fff', padding: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Timer size={18} className="pulse-anim" /> FLASH DEAL
          </div>
          <RotatingText />
        </div>
      );
    } else if (type === 'FESTIVAL_PROMO') {
      cardStyle = { background: 'linear-gradient(135deg, #fff9e6 0%, #fff0b3 100%)', color: '#333', border: '2px solid #ffd700', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' };
      mainColor = '#d32f2f';
      tagStyle = { background: '#fff', border: '1px solid #ffd700', color: '#d32f2f' };
      bannerContent = (
        <div style={{ background: 'linear-gradient(90deg, #ffd700, #ff8c00)', color: '#fff', padding: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
          <PartyPopper size={18} /> FESTIVAL SPECIAL
        </div>
      );
    } else if (type === 'WEEKEND_PROMO') {
      cardStyle = { background: 'linear-gradient(to bottom, #e0c3fc 0%, #8ec5fc 100%)', color: '#333', border: 'none', boxShadow: '0 4px 15px rgba(142, 197, 252, 0.4)' };
      mainColor = '#4a148c';
      tagStyle = { background: 'rgba(255,255,255,0.7)', border: '1px solid #fff', color: '#4a148c' };
      bannerContent = (
        <div style={{ background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', color: '#4a148c', padding: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Sunset size={18} /> WEEKEND VIBES
        </div>
      );
    }

    return (
      <div 
        key={product.id} 
        className="card promo-card"
        style={{ 
          padding: '0', 
          overflow: 'hidden', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s, box-shadow 0.3s',
          borderRadius: '16px',
          ...cardStyle
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          if (type === 'FESTIVAL_PROMO') handleFestivalHover(e);
          const ql = e.currentTarget.querySelector('.quick-look');
          if(ql) {
            ql.style.opacity = '1';
            ql.style.pointerEvents = 'auto';
            ql.style.transform = 'translateY(0)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          const ql = e.currentTarget.querySelector('.quick-look');
          if(ql) {
            ql.style.opacity = '0';
            ql.style.pointerEvents = 'none';
            ql.style.transform = 'translateY(10px)';
          }
        }}
      >
        {bannerContent}

        {/* Image Area */}
        <div style={{ position: 'relative', height: '260px', background: '#f5f5f5' }}>
          <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
            <img 
              src={product.coverUrl || (product.images && product.images.length > 0 ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : PLACEHOLDER_IMAGE)} 
              alt={product.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </Link>
          
          {/* Quick Look Button */}
          <button 
            className="quick-look"
            onClick={() => handleQuickLook(product)}
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              background: 'rgba(255,255,255,0.95)',
              color: '#000',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0,
              pointerEvents: 'none',
              transform: 'translateY(10px)',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={16} /> Quick look
          </button>
        </div>

        {/* Details Area */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, background: cardStyle.background }}>
          <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h4 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '1.1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: type === 'FLASH_DEAL' ? '#ccc' : (type === 'WEEKEND_PROMO' ? '#333' : 'var(--text-secondary)')
            }}>
              {product.title}
            </h4>
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ color: mainColor, fontSize: '0.875rem', fontWeight: 'bold' }}>Now</span>
              <span style={{ color: mainColor, fontSize: '1.5rem', fontWeight: '900' }}>₦{product.price}</span>
            </div>
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                addToCart(product.id).then(() => {
                  celebrate('standard', e);
                }).catch((err) => {
                  toast.error(err.response?.data?.message || err.message || 'Failed to add to cart');
                });
              }}
              style={{
                background: mainColor,
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#fff',
                boxShadow: `0 4px 10px ${mainColor}40`
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ShoppingCart size={18} />
            </button>
          </div>

          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            borderRadius: '6px',
            padding: '4px',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
            ...tagStyle
          }}>
            <span style={{ background: mainColor, color: '#fff', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
              ↓ Saved ₦{discount}
            </span>
            <span style={{ padding: '0 0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Timer size={12} /> {calculateTimeLeft(product.promoEndTime)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', fontSize: '0.875rem', color: type === 'FLASH_DEAL' ? '#999' : '#555' }}>
            <div style={{ display: 'flex', color: type === 'FLASH_DEAL' ? '#ffeb3b' : '#ffb300' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < 4 ? "currentColor" : "none"} />
              ))}
            </div>
            <span>🔥 {soldCount}K+ sold</span>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div style={{ marginBottom: '5rem', background: 'var(--bg-main)', paddingTop: '2rem' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.2rem', 
          color: '#e65100', 
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          🎯 ACTIVE PROMOTIONS 🎯
        </h3>
        <h2 style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
          UNBEATABLE DEALS FOR YOU
        </h2>
      </div>

      {/* Category Pills */}
      <div style={{ position: 'relative', marginBottom: '3rem', padding: '0 1rem' }}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} className="no-scrollbar">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                border: activeCategory === cat ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: activeCategory === cat ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeCategory === cat ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {promoProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)', margin: '0 1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>No active promotions for {activeCategory} right now.</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Check back later for new deals or explore other categories!</p>
        </div>
      ) : (
        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          
          {displayFlashDeals.length > 0 && (
            <section>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff1744' }}>
                <Timer size={24} /> Flash Deals
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
                {displayFlashDeals.map((p, i) => renderCard(p, i, 'FLASH_DEAL'))}
              </div>
            </section>
          )}

          {displayFestivalPromos.length > 0 && (
            <section>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d32f2f' }}>
                <PartyPopper size={24} /> Festival Promos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
                {displayFestivalPromos.map((p, i) => renderCard(p, i, 'FESTIVAL_PROMO'))}
              </div>
            </section>
          )}

          {displayWeekendPromos.length > 0 && (
            <section>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4a148c' }}>
                <Sunset size={24} /> Weekend Promos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
                {displayWeekendPromos.map((p, i) => renderCard(p, i, 'WEEKEND_PROMO'))}
              </div>
            </section>
          )}

        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .quick-look-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pulse-anim {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Quick Look Modal Overlay */}
      <AnimatePresence>
        {isQuickLookOpen && quickLookItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(5px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setIsQuickLookOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-main)',
                width: '100%',
                maxWidth: '900px',
                height: '80vh',
                maxHeight: '600px',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              {quickLookLoading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <Loader2 size={48} color="var(--accent-gold)" className="quick-look-spin" />
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Loading Promotional Details...</div>
                </div>
              ) : (
                <div className="quick-look-layout" style={{ display: 'flex', width: '100%', height: '100%' }}>
                  {/* Left Side: Image */}
                  <div className="quick-look-image-container" style={{ background: '#f5f5f5', position: 'relative', flex: '1', minWidth: '300px' }}>
                    <img 
                      src={quickLookItem.coverUrl} 
                      alt={quickLookItem.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#e65100', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 'bold' }}>
                      PROMO
                    </div>
                  </div>
                  
                  {/* Right Side: Details */}
                  <div style={{ flex: '1.2', padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <button 
                      onClick={() => setIsQuickLookOpen(false)}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-card)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                      <X size={20} color="var(--text-primary)" />
                    </button>
                    
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{quickLookItem.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      {quickLookItem.description || "Grab this amazing deal while it lasts! Top quality and fast shipping."}
                    </p>
                    
                    <div style={{ padding: '1rem', background: '#ffede6', border: '1px solid #ffccb3', borderRadius: '8px', marginBottom: '2rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#e65100', fontWeight: 'bold', marginBottom: '0.25rem' }}>Limited Time Offer Ends In:</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#e65100', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Timer size={24} className="pulse-anim" /> {calculateTimeLeft(quickLookItem.promoEndTime)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                            ₦{quickLookItem.price}
                          </span>
                          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                            ₦{(parseFloat(String(quickLookItem.price).replace(/,/g, '')) - parseFloat(quickLookItem.promoDiscount || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ background: '#e65100', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.875rem' }}>
                          Save ₦{parseFloat(quickLookItem.promoDiscount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={(e) => { 
                          addToCart(quickLookItem.id).then(() => {
                            celebrate('standard', e);
                            setIsQuickLookOpen(false);
                          }).catch((err) => {
                            toast.error(err.response?.data?.message || err.message || 'Failed to add to cart');
                          });
                        }}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', background: '#e65100', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Add to Cart Now
                      </button>
                      <Link to={`/product/${quickLookItem.id}`} style={{ flex: 1 }}>
                        <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: '#fff', color: '#e65100', border: '2px solid #e65100', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                          View Full Details
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
