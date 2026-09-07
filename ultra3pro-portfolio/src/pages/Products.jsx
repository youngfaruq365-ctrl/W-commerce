import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, ShoppingCart, Star, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Products({ books, addToCart }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, price-low, price-high
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const categories = ['All', 'Fiction', 'Non-Fiction', 'Business', 'Technology', 'Sci-Fi'];

  const handleSortClick = () => {
    const orders = ['newest', 'price-low', 'price-high'];
    const nextIndex = (orders.indexOf(sortOrder) + 1) % orders.length;
    setSortOrder(orders[nextIndex]);
  };

  // Process books
  const displayedBooks = useMemo(() => {
    let filtered = books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            book.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'All' ? true : 
                              book.title.toLowerCase().includes(activeCategory.toLowerCase()) || 
                              book.description.toLowerCase().includes(activeCategory.toLowerCase());
                              
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      if (sortOrder === 'price-low') {
        const priceA = parseFloat(a.price?.replace(/,/g, '') || 0);
        const priceB = parseFloat(b.price?.replace(/,/g, '') || 0);
        return priceA - priceB;
      } else if (sortOrder === 'price-high') {
        const priceA = parseFloat(a.price?.replace(/,/g, '') || 0);
        const priceB = parseFloat(b.price?.replace(/,/g, '') || 0);
        return priceB - priceA;
      }
      return parseInt(b.id) - parseInt(a.id);
    });
    
    return filtered;
  }, [books, searchQuery, activeCategory, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(displayedBooks.length / itemsPerPage);
  const currentBooks = displayedBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getSortLabel = () => {
    if(sortOrder === 'price-low') return 'Price: Low to High';
    if(sortOrder === 'price-high') return 'Price: High to Low';
    return 'Sort: Newest';
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
      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search books..." 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} /> Filters
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="card" 
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '250px', zIndex: 10 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Filter Options</h4>
                    <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowFilters(false)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price Range</label>
                    <input type="range" min="0" max="50000" style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>₦0</span><span>₦50k+</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Rating</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[4, 3, 2].map(r => (
                        <div key={r} style={{ background: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                          {r}+ Stars
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowFilters(false)}>Apply Filters</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="btn btn-secondary" onClick={handleSortClick} style={{ minWidth: '160px', justifyContent: 'space-between' }}>
            {getSortLabel()} <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="category-pills">
        {categories.map(cat => (
          <div 
            key={cat} 
            className={`pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="product-grid" style={{ marginTop: '2rem' }}>
        {currentBooks.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            No books found matching your criteria.
          </div>
        ) : (
          currentBooks.map((book, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={book.id} 
              className="product-card"
            >
              <div style={{ position: 'relative' }}>
                <img src={book.coverUrl || 'https://via.placeholder.com/300x400/222/555?text=No+Cover'} alt={book.title} className="product-image" />
              </div>
              
              <h3 className="product-title" title={book.title}>{book.title}</h3>
              <div className="product-price">₦{book.price || '15,000'}</div>
              
              <div className="product-footer">
                <div className="product-rating">
                  <Star size={14} color="var(--accent-gold)" fill="var(--accent-gold)" />
                  {book.rating || '4.5'}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.8, rotate: -10 }}
                  onClick={(e) => handleAddToCart(e, book)} 
                  className="cart-btn" 
                  title="Add to Cart"
                >
                  <ShoppingCart size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      {/* Pagination implementation */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0 }} 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >&lt;</button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ width: '40px', height: '40px', padding: 0 }}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          
          <button 
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0 }} 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >&gt;</button>
        </div>
      )}
    </motion.div>
  );
}
