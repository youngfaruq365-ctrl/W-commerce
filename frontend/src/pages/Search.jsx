import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, ArrowLeft, Store, User, Package, AlertTriangle } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { ErrorState } from '../components/shared/ErrorState';
import { Spinner } from '../components/shared/LoadingState';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!initialQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await axios.get(`/api/v1/products?search=${encodeURIComponent(initialQuery)}&limit=50`);
        if (res.data.success) {
          setResults(res.data.products || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status >= 500 || !status) {
          setFetchError('server');
        } else {
          setResults([]);
        }
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

          <form onSubmit={handleSearch} className="w-full max-w-2xl relative">
            <input
              id="search-input"
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              autoComplete="off"
              className="w-full neu-input py-4 pl-6 pr-16 text-lg"
            />
            <button
              type="submit"
              id="search-submit"
              className="absolute right-3 top-2 bottom-2 neu-button-primary p-3 rounded-full flex items-center justify-center"
            >
              <SearchIcon size={20} />
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size={40} className="text-blue-500" />
          </div>
        ) : fetchError === 'server' ? (
          <ErrorState
            variant="serverError"
            title="Search unavailable"
            message="Could not reach the server. Please check your connection and try again."
            onRetry={() => { setFetchError(null); setLoading(true); }}
          />
        ) : !initialQuery.trim() ? (
          <div className="text-center py-20">
            <SearchIcon size={64} className="mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
            <h2 className="text-2xl font-bold mb-2">Start searching</h2>
            <p className="text-[var(--text-muted)]">Type a product name, store, or category above.</p>
          </div>
        ) : results.length === 0 ? (
          <ErrorState
            variant="empty"
            title={`No results for "${initialQuery}"`}
            message="Try checking your spelling or using more general terms."
            showHome
          />
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] font-bold mb-6">{results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{initialQuery}&rdquo;</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: (idx % 10) * 0.05 }}
                >
                  <Link to={`/product/${product.id}`} className="block h-full">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col group hover:-translate-y-1">

                      {/* Image */}
                      <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                        <img
                          src={
                            (() => {
                              const imgUrl = product.images?.[0]?.url || product.images?.[0];
                              if (!imgUrl) return PLACEHOLDER_IMAGE;
                              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) return imgUrl;
                              if (typeof imgUrl === 'string') return `/uploads/${imgUrl.replace('uploads/', '')}`;
                              return PLACEHOLDER_IMAGE;
                            })()
                          }
                          alt={product.title || 'Product'}
                          loading="lazy"
                          onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-black text-black shadow-sm">
                          ₦{parseFloat(product.price || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight flex-1 group-hover:text-[var(--accent-primary)] transition-colors">
                          {product.title || product.name || 'Unnamed product'}
                        </h3>
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[var(--border-color)]">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Store size={14} className="text-blue-500" />
                          </div>
                          <p className="text-sm font-bold text-[var(--text-muted)] truncate">
                            {product.store?.storeName || 'Unknown store'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
