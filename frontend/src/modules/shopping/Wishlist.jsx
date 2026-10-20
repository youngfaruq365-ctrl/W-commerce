import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Heart, ShoppingCart, Share2, Trash2, FolderPlus, Search,
  ArrowUpDown, Tag, Package, AlertTriangle, Star, ChevronDown,
  Grid3X3, List, Copy, Check, Sparkles, X, RefreshCw
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { WSkeleton } from '../../design/components';
import { useCartStore } from '../../store/cartStore';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';

const COLLECTIONS = ['All Items', 'Gift Ideas', 'Tech Picks', 'Fashion'];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date Added (Newest)' },
  { value: 'date_asc', label: 'Date Added (Oldest)' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'discount_desc', label: 'Biggest Discount' },
];

export default function Wishlist() {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [status, setStatus] = useState('loading'); // idle, loading, success, error, retrying
  const [errorMsg, setErrorMsg] = useState('');
  const [wishlist, setWishlist] = useState([]);
  
  const [activeCollection, setActiveCollection] = useState('All Items');
  const [addedToCart, setAddedToCart] = useState({});
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [copied, setCopied] = useState(false);
  const addToCart = useCartStore(state => state.addToCart);

  const fetchWishlist = async (isRetry = false) => {
    setStatus(isRetry ? 'retrying' : 'loading');
    try {
      const response = await apiClient.get('/api/v1/wishlist');
      if (response.data.success) {
        // Map backend format to frontend format
        const items = response.data.items.map(item => {
          const p = item.product || {};
          return {
            id: p.id || item.productId, // We'll need productId for operations
            wishlistId: item.id,
            name: p.title || 'Unknown Product',
            price: p.price || 0,
            originalPrice: p.compareAtPrice || p.price || 0,
            discount: p.compareAtPrice ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0,
            image: p.images?.[0]?.url || PLACEHOLDER_IMAGE,
            inStock: item.inStock ?? (p.stock > 0),
            rating: p.averageRating || 5.0,
            reviews: p.reviewCount || 0,
            seller: p.store?.storeName || 'Unknown Store',
            dateAdded: item.createdAt,
            onSale: !!p.compareAtPrice && p.compareAtPrice > p.price,
            category: p.category || 'General'
          };
        });
        setWishlist(items);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(response.data.message || 'Failed to load wishlist');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to server');
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const filterTabs = [
    { key: 'all', label: 'All', count: wishlist.length },
    { key: 'in_stock', label: 'In Stock', count: wishlist.filter(i => i.inStock).length },
    { key: 'sale', label: 'On Sale', count: wishlist.filter(i => i.onSale).length },
    { key: 'out_of_stock', label: 'Out of Stock', count: wishlist.filter(i => !i.inStock).length },
  ];

  const filtered = wishlist
    .filter(item => {
      if (filter === 'in_stock') return item.inStock;
      if (filter === 'sale') return item.onSale;
      if (filter === 'out_of_stock') return !item.inStock;
      return true;
    })
    .filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'discount_desc': return b.discount - a.discount;
        case 'date_asc': return new Date(a.dateAdded) - new Date(b.dateAdded);
        default: return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
    });

  const removeItem = async (productId) => {
    try {
      setWishlist(prev => prev.filter(i => i.id !== productId)); // Optimistic UI
      await apiClient.delete(`/api/v1/wishlist/${productId}`);
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove from wishlist');
      fetchWishlist(); // Refresh to restore if failed
    }
  };

  const handleAddToCart = async (id) => {
    try {
      await addToCart(id, 1);
      setAddedToCart(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setAddedToCart(prev => ({ ...prev, [id]: false })), 2000);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      setNewCollectionName('');
      setShowNewCollection(false);
    }
  };

  if (status === 'error' || status === 'retrying') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold">Unable to load wishlist</h2>
          <p className="text-[var(--text-muted)]">{errorMsg}</p>
          <button 
            onClick={() => fetchWishlist(true)}
            className="flex items-center gap-2 justify-center w-full px-4 py-2 bg-[var(--text-main)] text-[var(--bg-primary)] rounded-xl font-semibold"
          >
            <RefreshCw size={16} className={status === 'retrying' ? 'animate-spin' : ''} />
            {status === 'retrying' ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .card-anim { animation: fadeInUp 0.35s ease forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Heart size={20} className="text-rose-400 fill-rose-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">My Wishlist</h1>
                <p className="text-xs text-[var(--text-muted)]">{status === 'loading' ? '...' : wishlist.length} saved items</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] text-sm transition-all hover:bg-[var(--bg-tertiary)]"
              >
                {copied ? <Check size={15} className="text-green-400" /> : <Share2 size={15} />}
                {copied ? 'Copied!' : 'Share'}
              </button>
              <button
                onClick={() => setShowNewCollection(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-primary)] text-sm font-semibold hover:opacity-90 transition-all"
              >
                <FolderPlus size={15} />
                <span className="hidden sm:inline">New Collection</span>
              </button>
            </div>
          </div>
          {/* Collections strip */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
            {COLLECTIONS.map(col => (
              <button
                key={col}
                onClick={() => setActiveCollection(col)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCollection === col
                    ? 'bg-[var(--text-main)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your wishlist..."
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-hover)] transition-all"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm hover:border-[var(--border-hover)] transition-all whitespace-nowrap"
            >
              <ArrowUpDown size={15} />
              <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.value === sortBy)?.label}</span>
              <ChevronDown size={13} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] z-30 overflow-hidden">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--accent-gray-glow)] transition-all ${sortBy === opt.value ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-muted)]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1">
            {[{ icon: Grid3X3, key: 'grid' }, { icon: List, key: 'list' }].map(({ icon: Icon, key }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`p-2 rounded-lg transition-all ${viewMode === key ? 'bg-[var(--bg-tertiary)] text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-[var(--text-main)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-black/20' : 'bg-[var(--bg-tertiary)]'}`}>
                {status === 'loading' ? '-' : tab.count}
              </span>
            </button>
          ))}
        </div>

        {status === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
             {[1,2,3,4,5].map(i => <WSkeleton key={i} className="h-64 w-full rounded-2xl" />)}
          </div>
        )}

        {status === 'success' && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center card-anim">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-6 border border-[var(--border-color)]">
              <Heart size={36} className="text-[var(--text-faint)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nothing here yet</h3>
            <p className="text-[var(--text-muted)] mb-6 max-w-sm">Save products you love to your wishlist and come back when you're ready to buy.</p>
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="px-6 py-3 bg-[var(--text-main)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all">
              Start Exploring
            </button>
          </div>
        )}

        {status === 'success' && viewMode === 'grid' && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className="card-anim bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] transition-all group"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="relative">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  {item.discount > 0 && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                      -{item.discount}%
                    </div>
                  )}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-[var(--bg-primary)]/60 flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1 truncate">{item.seller}</p>
                  <h3 className="text-sm font-medium leading-snug mb-2 line-clamp-2">{item.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-[var(--text-muted)]">{item.rating} ({item.reviews.toLocaleString()})</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-bold text-sm">₦{item.price.toFixed(2)}</span>
                    {item.originalPrice > item.price && (
                      <span className="text-xs text-[var(--text-faint)] line-through">₦{item.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(item.id)}
                    disabled={!item.inStock}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      addedToCart[item.id]
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : item.inStock
                        ? 'bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-faint)] cursor-not-allowed'
                    }`}
                  >
                    {addedToCart[item.id] ? <><Check size={12} /> Added!</> : <><ShoppingCart size={12} /> Add to Cart</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'success' && viewMode === 'list' && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className="card-anim flex gap-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 hover:border-[var(--border-hover)] transition-all"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  {item.discount > 0 && (
                    <div className="absolute top-1 left-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      -{item.discount}%
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">{item.seller} · {item.category}</p>
                  <h3 className="font-semibold mt-0.5 mb-1 truncate">{item.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-[var(--text-muted)]">{item.rating} ({item.reviews.toLocaleString()} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">₦{item.price.toFixed(2)}</span>
                    {item.originalPrice > item.price && (
                      <span className="text-sm text-[var(--text-faint)] line-through">₦{item.originalPrice.toFixed(2)}</span>
                    )}
                    {!item.inStock && <span className="text-xs text-red-400 font-medium">Out of Stock</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleAddToCart(item.id)}
                    disabled={!item.inStock}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                      addedToCart[item.id]
                        ? 'bg-green-500/20 text-green-400'
                        : item.inStock
                        ? 'bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-faint)] cursor-not-allowed'
                    }`}
                  >
                    {addedToCart[item.id] ? <Check size={14} /> : <ShoppingCart size={14} />}
                    {addedToCart[item.id] ? 'Added!' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCollection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">New Collection</h3>
              <button onClick={() => setShowNewCollection(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={20} />
              </button>
            </div>
            <input
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="e.g. Gift Ideas, Tech Picks..."
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm mb-4 focus:outline-none focus:border-[var(--border-hover)] text-[var(--text-main)]"
              onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewCollection(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-sm hover:bg-[var(--bg-tertiary)] transition-all">
                Cancel
              </button>
              <button onClick={handleCreateCollection} className="flex-1 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-primary)] text-sm font-semibold hover:opacity-90 transition-all">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
