import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await axios.get(`/api/v1/products?search=${encodeURIComponent(query)}&limit=5`);
        if (res.data.success) {
          setResults(res.data.products || []);
        }
      } catch (err) {
        // error handled silently
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 400);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        if (!query) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      if (onSearch) onSearch(query.trim());
    }
  };

  const handleSelectProduct = (productId) => {
    setShowDropdown(false);
    navigate(`/product/${productId}`);
  };

  const toggleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (!query) {
      setIsExpanded(false);
    } else {
      handleSubmit({ preventDefault: () => {} });
    }
  };

  return (
    <div className="relative flex justify-end" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative flex items-center h-10 w-full justify-end">
        <div className={`transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex items-center h-full absolute right-0 premium-glass rounded-full border ${isExpanded || query ? 'w-[65vw] sm:w-[400px] border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] bg-[var(--bg-secondary)]/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'w-10 border-transparent bg-transparent shadow-none'}`}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setIsExpanded(true);
              if (query.length >= 2) setShowDropdown(true);
            }}
            placeholder="Search items, sellers, IDs..."
            className={`w-full h-full bg-transparent text-[var(--text-main)] rounded-full py-2 pl-4 pr-10 focus:outline-none transition-opacity duration-300 text-sm ${isExpanded || query ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
        
        <button
          type={isExpanded && query ? "submit" : "button"}
          onClick={toggleExpand}
          className={`absolute right-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer transition-all z-10 shrink-0 ${isExpanded || query ? 'text-[var(--text-muted)] hover:text-[var(--accent-gray)]' : 'icon-3d-glass-box'}`}
        >
          <Search size={18} className={isExpanded || query ? "" : "text-[color:var(--text-main)] drop-shadow-[0_0_5px_var(--accent-gray)]"} />
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && query.length >= 2 && (
        <div className="absolute top-full right-0 mt-3 w-[280px] sm:w-[400px] modal-3d-glass text-[var(--text-main)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[var(--accent-gray)]" size={24} />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="px-4 py-3 border-b border-white/10 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Top Matches
              </div>
              {results.map((product) => {
                const imgUrl = product.images?.[0]?.url 
                  ? (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/') 
                      ? product.images[0].url 
                      : `/${product.images[0].url}`) 
                  : PLACEHOLDER_IMAGE;
                
                return (
                  <div 
                    key={product.id}
                    onClick={() => handleSelectProduct(product.id)}
                    className="flex items-center gap-4 p-3 hover:bg-[var(--bg-tertiary)] cursor-pointer border-b border-white/5 last:border-0 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white flex-shrink-0 border border-white/10 overflow-hidden group-hover:border-[var(--accent-gray)] transition-colors">
                      <img src={imgUrl} alt={product.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate text-[var(--text-main)] group-hover:text-black transition-colors">{product.title}</h4>
                      <p className="text-[10px] text-gray-700 truncate flex items-center gap-2 mt-1">
                        <span className="text-[var(--accent-gray)] font-bold tracking-widest uppercase text-xs">₦{Number(product.price)?.toFixed(2)}</span>
                        <span>•</span>
                        <span>{product.store?.storeName || 'Unknown Store'}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
              <div 
                onClick={handleSubmit}
                className="p-4 text-center text-xs font-bold text-black bg-[var(--accent-gray)]/10 hover:bg-[var(--accent-gray)]/20 cursor-pointer transition-colors border-t border-[var(--accent-gray)]/20"
              >
                View all results for "{query}"
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

