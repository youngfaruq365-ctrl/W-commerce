import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Star } from 'lucide-react';
import { usePreview } from '../commerce/PreviewContext';

export const SearchOverlay = ({ store }) => {
  const { isSearchOpen, setIsSearchOpen, products, setActiveProduct } = usePreview();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setResults([]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const matches = products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
      (p.badge && p.badge.toLowerCase().includes(lowerQuery))
    );
    setResults(matches);
  }, [query, products]);

  const handleSelect = (product) => {
    setIsSearchOpen(false);
    setActiveProduct(product);
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[var(--s-bg)]/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center px-6 md:px-12 py-6 border-b border-[var(--s-border,transparent)]">
            <Search className="text-[var(--s-text)] opacity-50 mr-4" size={28} />
            <input
              autoFocus
              type="text"
              placeholder="Search products, collections, and more..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-2xl md:text-4xl font-black text-[var(--s-text)] placeholder-[var(--s-text)]/30"
              style={{ fontFamily: 'var(--s-font-heading)' }}
            />
            <button 
              onClick={() => setIsSearchOpen(false)}
              className="ml-4 p-2 rounded-full hover:bg-[var(--s-text)]/5 text-[var(--s-text)] transition-colors"
            >
              <X size={32} />
            </button>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8">
            <div className="max-w-7xl mx-auto">
              {!query.trim() ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--s-text)] opacity-40">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p className="text-xl font-bold">What are you looking for?</p>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {results.map((product, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      className="group cursor-pointer flex flex-col gap-3"
                    >
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--s-surface)]">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {product.badge && (
                          <div className="absolute top-3 left-3 px-3 py-1 bg-[var(--s-primary)] text-[var(--s-bg)] text-xs font-bold rounded-full uppercase tracking-wider">
                            {product.badge}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white text-black w-12 h-12 rounded-full flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform">
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--s-text)] text-lg line-clamp-1">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-black text-[var(--s-text)]">₦{parseFloat(product.price).toFixed(2)}</span>
                          {product.originalPrice && (
                            <span className="text-[var(--s-text)] opacity-40 line-through text-sm">
                              ₦{parseFloat(product.originalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--s-text)] opacity-40">
                  <p className="text-xl font-bold">No results found for "{query}"</p>
                  <p className="text-sm mt-2">Try checking for typos or using different keywords.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
