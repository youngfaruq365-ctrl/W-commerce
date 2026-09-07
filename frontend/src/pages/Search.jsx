import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, ArrowLeft, Store, User, Package } from 'lucide-react';
import axios from 'axios';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!initialQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await axios.get(`/api/v1/products?search=${encodeURIComponent(initialQuery)}&limit=50`);
        if (res.data.success) {
          setResults(res.data.products || []);
        }
      } catch (err) {
        console.error('Failed to fetch search results', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [initialQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] py-8 md:py-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Search Bar */}
        <div className="mb-10 flex flex-col items-center">
          <Link to="/" className="self-start mb-6 text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-2 font-bold transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </Link>
          
          <h1 className="text-4xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Search Results
          </h1>
          
          <form 
            onSubmit={handleSearch}
            className="w-full max-w-2xl relative"
          >
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-full py-4 pl-6 pr-16 text-lg shadow-lg focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-3 bottom-3 bg-[var(--accent-primary)] text-white p-3 rounded-full hover:opacity-90 transition-opacity"
            >
              <SearchIcon size={20} />
            </button>
          </form>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-sm">
            <SearchIcon size={64} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No results found for "{initialQuery}"</h2>
            <p className="text-[var(--text-muted)]">Try checking your spelling or using more general terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((product, idx) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: (idx % 10) * 0.05 }}
              >
                <Link to={`/product/${product.id}`} className="block h-full">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col group hover:-translate-y-1">
                    
                    {/* Image */}
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                      <img 
                        src={product.images?.[0]?.url ? (product.images[0].url.startsWith('http') ? product.images[0].url : `/uploads/${product.images[0].url.replace('uploads/', '')}`) : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80'} 
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-black text-black shadow-sm">
                        ₦{parseFloat(product.price).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-4 line-clamp-2 leading-tight flex-1 group-hover:text-[var(--accent-primary)] transition-colors">
                        {product.title}
                      </h3>
                      
                      {/* Explicit Required Details Display */}
                      <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-3 mt-auto text-sm border border-[var(--border-color)]/50">
                        <div className="flex items-start gap-3">
                          <Package size={16} className="text-blue-500 mt-0.5 shrink-0" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Product ID</p>
                            <p className="font-mono text-xs truncate" title={product.id}>{product.id}</p>
                          </div>
                        </div>
                        
                        <div className="w-full h-px bg-[var(--border-color)]"></div>
                        
                        <div className="flex items-start gap-3">
                          <Store size={16} className="text-green-500 mt-0.5 shrink-0" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Store ({product.store?.storeName || 'N/A'})</p>
                            <p className="font-mono text-xs truncate" title={product.storeId}>{product.storeId || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="w-full h-px bg-[var(--border-color)]"></div>
                        
                        <div className="flex items-start gap-3">
                          <User size={16} className="text-purple-500 mt-0.5 shrink-0" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Seller ({product.store?.user?.fullName || 'N/A'})</p>
                            <p className="font-mono text-xs truncate" title={product.store?.user?.id}>{product.store?.user?.id || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
