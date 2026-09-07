import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Eye, ChevronRight, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  const promoProducts = products.filter(p => {
    if (!p.promoDiscount) return false;
    if (activeCategory === 'Recommended') return true;
    return p.category === activeCategory;
  });

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
          🎓 BACK TO SCHOOL SALE 🎓
        </h3>
        <h2 style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
          EXPLORE YOUR INTERESTS
        </h2>
      </div>

      {/* Category Pills */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
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
        <button style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer'
        }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Promo Product Grid */}
      {promoProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>No active promotions for {activeCategory} right now.</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Check back later for new deals or explore other categories!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', 
          gap: '1.5rem' 
        }}>
          {promoProducts.map((product, i) => {
          const discount = product.promoDiscount || 0;
          const soldCount = product.soldCount || product.salesCount || 0;
          const isNumberOne = i === 0;

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
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                const ql = e.currentTarget.querySelector('.quick-look');
                if(ql) ql.style.opacity = '1';
                if(ql) ql.style.transform = 'translateY(0)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                const ql = e.currentTarget.querySelector('.quick-look');
                if(ql) ql.style.opacity = '0';
                if(ql) ql.style.transform = 'translateY(10px)';
              }}
            >
              {/* Image Area */}
              <div style={{ position: 'relative', height: '280px', background: '#f5f5f5' }}>
                <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                  <img 
                    src={product.coverUrl} 
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
                    transform: 'translateY(10px)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Eye size={16} /> Quick look
                </button>
              </div>

              {/* Details Area */}
              <div style={{ padding: '1rem' }}>
                {/* Title */}
                <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-secondary)'
                  }}>
                    {product.title}
                  </h4>
                </Link>

                {/* Price Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ color: '#e65100', fontSize: '1rem', fontWeight: 'bold' }}>Last day</span>
                    <span style={{ color: '#e65100', fontSize: '1.5rem', fontWeight: '900' }}>₦{product.price}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); addToCart(product); }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.background = '#f5f5f5'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'none'; }}
                  >
                    <ShoppingCart size={20} color="var(--text-primary)" />
                  </button>
                </div>

                {/* Deal Tag */}
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  background: '#ffede6',
                  border: '1px solid #ffccb3',
                  borderRadius: '4px',
                  padding: '2px',
                  marginBottom: '0.75rem',
                  fontSize: '0.75rem'
                }}>
                  <span style={{ background: '#e65100', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ↓ Saved ₦{discount} extra
                  </span>
                  <span style={{ color: '#e65100', padding: '0 0.4rem', fontWeight: 'bold' }}>
                    {calculateTimeLeft(product.promoEndTime)}
                  </span>
                </div>

                {/* Best Selling */}
                <div style={{ color: '#e65100', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {isNumberOne ? '#1 BEST-SELLING ITEM' : `#${i + 2} BEST-SELLING ITEM`} | Past 6 months
                </div>

                {/* Rating & Sold */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', color: '#000' }}>
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} size={14} fill={idx < 4 ? "#000" : "none"} color="#000" />
                    ))}
                  </div>
                  <span>🔥 {soldCount}K+ sold</span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ 
                    background: '#673ab7', 
                    color: '#fff', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    ★ Star seller
                  </span>
                  <span style={{ 
                    background: '#e3f2fd', 
                    color: '#1565c0', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontWeight: 'bold' 
                  }}>
                    Brand: {product.brand || product.attributes?.brand || 'GENAI'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
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
                <div className="quick-look-layout">
                  {/* Left Side: Image */}
                  <div className="quick-look-image-container" style={{ background: '#f5f5f5', position: 'relative' }}>
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
                  <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <button 
                      onClick={() => setIsQuickLookOpen(false)}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-card)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                      <X size={20} color="var(--text-primary)" />
                    </button>
                    
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{quickLookItem.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      {quickLookItem.description}
                    </p>
                    
                    <div style={{ padding: '1rem', background: '#ffede6', border: '1px solid #ffccb3', borderRadius: '8px', marginBottom: '2rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#e65100', fontWeight: 'bold', marginBottom: '0.25rem' }}>Limited Time Offer Ends In:</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#e65100', marginBottom: '0.5rem' }}>
                        {calculateTimeLeft(quickLookItem.promoEndTime)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                            ₦{quickLookItem.price}
                          </span>
                          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                            ₦{(parseFloat(String(quickLookItem.price).replace(/,/g, '')) - parseFloat(quickLookItem.promoDiscount)).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ background: '#e65100', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.875rem' }}>
                          Save ₦{parseFloat(quickLookItem.promoDiscount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => { addToCart(quickLookItem); setIsQuickLookOpen(false); }}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', background: '#e65100' }}
                      >
                        Add to Cart Now
                      </button>
                      <Link to={`/product/${quickLookItem.id}`} style={{ flex: 1 }}>
                        <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
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
