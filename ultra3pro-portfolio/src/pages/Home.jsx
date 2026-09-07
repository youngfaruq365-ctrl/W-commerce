import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, PlayCircle, Clock, Package, Heart, CheckCircle2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import confetti from 'canvas-confetti';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function Home({ books, addToCart, storeProfile }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [email, setEmail] = useState('');
  
  // Get a featured book for the flash sale section (or use a placeholder)
  const featuredBook = books.length > 0 ? books[0] : null;

  const handleSubscribe = (e) => {
    e.preventDefault();
    if(email) {
      alert(`Thanks for subscribing with ${email}!`);
      setEmail('');
    }
  };

  const handleAddToCart = (e, book) => {
    // Trigger confetti at the click position
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

    addToCart(book);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="app-container"
    >
      {/* Hero Banner & Profile */}
      <div className="hero-banner">
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url("${storeProfile?.bannerUrl || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200'}") center/cover`, opacity: 0.4 }}></div>
      </div>
      
      <div className="profile-section">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
          <div className="profile-logo" style={{ textTransform: 'uppercase' }}>
            <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#000' }}>{storeProfile?.logoLetter || 'AB'}</span>
          </div>
          <div style={{ paddingBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
              {storeProfile?.name || "ALEX'S BOOKSTORE"} <CheckCircle2 size={18} color="var(--accent-gold)" />
            </h1>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <span>Premium Seller</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Star size={14} color="var(--accent-gold)" fill="var(--accent-gold)" /> 4.9 (2.3k)</span>
            </div>
          </div>
        </div>
        <button 
          className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => setIsFollowing(!isFollowing)}
        >
          <Heart size={16} fill={isFollowing ? 'currentColor' : 'none'} /> 
          {isFollowing ? 'Following' : 'Follow Store'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div>
          <div className="stat-value">{isFollowing ? '2,301' : '2.3K+'}</div>
          <div className="stat-label">Followers</div>
        </div>
        <div>
          <div className="stat-value">{books.length || '12K+'}</div>
          <div className="stat-label">Products</div>
        </div>
        <div>
          <div className="stat-value">98%</div>
          <div className="stat-label">Positive Reviews</div>
        </div>
        <div>
          <div className="stat-value">2 mins</div>
          <div className="stat-label">Response Time</div>
        </div>
      </div>

      {/* 3D Product Carousel */}
      <div style={{ margin: '4rem 0', padding: '0 1rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>Trending Books</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Swipe to explore our most popular titles</p>
        
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
          {books.map((book) => (
            <SwiperSlide key={book.id} style={{ width: '320px', height: '460px' }}>
              <div className="coverflow-slide-inner">
                <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                <div className="coverflow-overlay">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: 0, lineHeight: '1.3', fontWeight: 'bold' }}>{book.title}</h3>
                  
                  <div className="coverflow-description">
                    {book.description || "A fantastic read that you won't be able to put down."}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <p style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>₦{book.price}</p>
                    <motion.button 
                      whileTap={{ scale: 0.8, rotate: -10 }}
                      onClick={(e) => handleAddToCart(e, book)}
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
          ))}
        </Swiper>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginTop: '2rem' }}>
        {/* Left Column: About */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* About Store Snippet */}
          <div className="card" style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '1rem' }}>ABOUT THE STORE</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Global book selections redefined.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Years in Business</span>
                  <span>2+</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Happy Customers</span>
                  <span>50K+</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Store Satisfaction</span>
                  <span>100%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Based in</span>
                  <span>Nigeria</span>
                </div>
              </div>
              <Link to="/about" className="btn btn-secondary">Learn More</Link>
            </div>
            <div style={{ flex: 1, position: 'relative', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer">
                <PlayCircle size={48} color="var(--text-secondary)" style={{ cursor: 'pointer' }} title="Play Store Intro" />
              </a>
            </div>
          </div>
          
          {/* Trust indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.75rem' }}>100% Authentic</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <Package size={24} style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.75rem' }}>Secure Payments</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <MessageSquare size={24} style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.75rem' }}>24/7 Support</div>
            </div>
          </div>
        </div>

        {/* Right Column: Mailing list / Extra content */}
        <div>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Get Exclusive Offers</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Subscribe to our newsletter</p>
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <input 
                type="email" 
                placeholder="Enter email address" 
                className="form-control" 
                style={{ flex: 1 }} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>Go</button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
