import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, Star, Heart, ShoppingCart, X, ChevronDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CATEGORY_META = {
  electronics: { name: 'Electronics', emoji: '💻', gradient: 'from-blue-600 to-cyan-600', banner: 'from-blue-900 to-cyan-900' },
  fashion: { name: 'Fashion', emoji: '👗', gradient: 'from-pink-600 to-rose-600', banner: 'from-pink-900 to-rose-900' },
  beauty: { name: 'Beauty', emoji: '💄', gradient: 'from-purple-600 to-violet-600', banner: 'from-purple-900 to-violet-900' },
  gaming: { name: 'Gaming', emoji: '🎮', gradient: 'from-green-600 to-emerald-600', banner: 'from-green-900 to-emerald-900' },
  home: { name: 'Home & Living', emoji: '🏠', gradient: 'from-amber-600 to-orange-600', banner: 'from-amber-900 to-orange-900' },
  sports: { name: 'Sports', emoji: '⚽', gradient: 'from-red-600 to-rose-600', banner: 'from-red-900 to-rose-900' },
  books: { name: 'Books', emoji: '📚', gradient: 'from-indigo-600 to-blue-600', banner: 'from-indigo-900 to-blue-900' },
  toys: { name: 'Toys & Kids', emoji: '🧸', gradient: 'from-yellow-600 to-amber-600', banner: 'from-yellow-900 to-amber-900' },
  food: { name: 'Food & Grocery', emoji: '🍕', gradient: 'from-orange-600 to-red-600', banner: 'from-orange-900 to-red-900' },
  health: { name: 'Health', emoji: '💊', gradient: 'from-teal-600 to-cyan-600', banner: 'from-teal-900 to-cyan-900' },
  auto: { name: 'Automotive', emoji: '🚗', gradient: 'from-gray-600 to-slate-600', banner: 'from-gray-900 to-slate-900' },
  jewelry: { name: 'Jewelry', emoji: '💍', gradient: 'from-rose-600 to-pink-600', banner: 'from-rose-900 to-pink-900' },
};

const MOCK_PRODUCTS = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: ['MacBook Air M4', 'Samsung Galaxy S25', 'Sony WH-1000XM6', 'iPad Pro 13"',
    'LG OLED 65"', 'AirPods Pro 3', 'DJI Mini 4K', 'Logitech MX Master',
    'Razer DeathAdder', 'Elgato 4K Cam', 'ASUS ROG Monitor', 'SteelSeries Headset',
    'Dell XPS 15', 'Bose QC45', 'Anker Power Bank', 'Kingston SSD 2TB'][i],
  price: [899, 999, 249, 1099, 1299, 189, 299, 79, 59, 149, 399, 179, 1299, 229, 49, 89][i],
  original: [1299, 1199, 399, 1499, 1799, 329, 399, 99, 79, 199, 549, 249, 1799, 329, 79, 129][i],
  rating: [4.9, 4.8, 4.9, 4.7, 4.8, 4.8, 4.6, 4.7, 4.5, 4.4, 4.7, 4.6, 4.8, 4.9, 4.3, 4.8][i],
  reviews: [2300, 8900, 3400, 1200, 4500, 9800, 1100, 7800, 12000, 890, 3200, 5600, 1800, 6700, 15000, 4300][i],
  image: ['💻', '📱', '🎵', '📱', '📺', '🎧', '🚁', '🖱️', '🖱️', '📷', '🖥️', '🎧', '💻', '🎵', '🔋', '💾'][i],
  badge: i < 4 ? 'Best Seller' : i < 8 ? 'New' : null,
  condition: i % 3 === 0 ? 'New' : 'New',
}));

const BRANDS = ['All Brands', 'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'Asus', 'Logitech', 'Bose', 'Razer'];
const SORT_OPTIONS = ['Relevance', 'Price: Low to High', 'Price: High to Low', 'Best Rated', 'Most Reviews', 'Newest'];

export default function CategoryDetails() {
  const { slug } = useParams();
  const meta = CATEGORY_META[slug] || { name: slug, emoji: '🛍️', gradient: 'from-gray-600 to-slate-600', banner: 'from-gray-900 to-slate-900' };

  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sort, setSort] = useState('Relevance');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedRating, setSelectedRating] = useState(0);
  const [wishlisted, setWishlisted] = useState({});

  useEffect(() => {
    axios.get(`/api/v1/products?category=${slug}&limit=16`)
      .then(r => { if (r.data?.products?.length) setProducts(r.data.products); })
      .catch(() => {
        toast.error('Failed to load category products');
      });
  }, [slug]);

  const filtered = products.filter(p => {
    if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
    if (selectedRating > 0 && p.rating < selectedRating) return false;
    return true;
  });

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="text-[var(--text-main)] font-bold text-sm mb-3">Price Range</h3>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" value={priceRange[0]} onChange={e => setPriceRange([+e.target.value, priceRange[1]])}
            className="w-20 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 text-[var(--text-main)] text-xs outline-none" />
          <span className="text-[var(--text-faint)] text-xs">—</span>
          <input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])}
            className="w-20 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 text-[var(--text-main)] text-xs outline-none" />
        </div>
      </div>
      {/* Brand */}
      <div>
        <h3 className="text-[var(--text-main)] font-bold text-sm mb-3">Brand</h3>
        <div className="space-y-2">
          {BRANDS.map(b => (
            <button key={b} onClick={() => setSelectedBrand(b)}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-colors ${selectedBrand === b ? 'bg-[var(--text-main)] text-[var(--bg-primary)] font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'}`}>
              {b}
            </button>
          ))}
        </div>
      </div>
      {/* Rating */}
      <div>
        <h3 className="text-[var(--text-main)] font-bold text-sm mb-3">Minimum Rating</h3>
        <div className="space-y-2">
          {[0, 4, 4.5, 4.8].map(r => (
            <button key={r} onClick={() => setSelectedRating(r)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${selectedRating === r ? 'bg-[var(--text-main)] text-[var(--bg-primary)] font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'}`}>
              {r === 0 ? 'Any Rating' : (
                <>
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-xs">{r}+ Stars</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Condition */}
      <div>
        <h3 className="text-[var(--text-main)] font-bold text-sm mb-3">Condition</h3>
        {['All', 'New', 'Refurbished', 'Used'].map(c => (
          <button key={c}
            className="w-full text-left text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] text-sm px-3 py-2 rounded-xl transition-colors">
            {c}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Banner */}
      <div className={`relative h-40 md:h-52 bg-gradient-to-br ${meta.banner} overflow-hidden`}>
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12">
          <div className="text-5xl mb-2">{meta.emoji}</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{meta.name}</h1>
          <p className="text-white/70 text-sm mt-1">{filtered.length} products found</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link to="/" className="hover:text-[var(--text-main)]">Home</Link>
          <ChevronRight size={12} />
          <Link to="/categories" className="hover:text-[var(--text-main)]">Categories</Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text-main)]">{meta.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex gap-6">
        {/* Sidebar — Desktop */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 sticky top-4">
            <h2 className="text-[var(--text-main)] font-bold mb-4 flex items-center gap-2">
              <SlidersHorizontal size={16} /> Filters
            </h2>
            <FilterSidebar />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Sort Bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[var(--text-muted)] text-sm">{filtered.length} products</span>
            <div className="flex items-center gap-2">
              {/* Mobile Filter */}
              <button onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-main)] text-sm px-3 py-2 rounded-xl transition-colors">
                <SlidersHorizontal size={14} /> Filters
              </button>
              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-main)] text-sm px-3 py-2 rounded-xl outline-none cursor-pointer appearance-none pr-8"
                >
                  {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => (
              <Link key={p.id} to={`/product/${p.id}`}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-sm)] overflow-hidden group">
                <div className="relative">
                  <div className="h-36 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center text-5xl">
                    {p.image}
                  </div>
                  {p.badge && (
                    <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {p.badge}
                    </span>
                  )}
                  <button
                    onClick={e => { e.preventDefault(); setWishlisted(w => ({ ...w, [p.id]: !w[p.id] })); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <Heart size={12} className={wishlisted[p.id] ? 'fill-rose-400 text-rose-400' : 'text-[var(--text-muted)]'} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[var(--text-main)] text-xs font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="text-[var(--text-muted)] text-xs">{p.rating}</span>
                    <span className="text-[var(--text-faint)] text-xs">({p.reviews?.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[var(--text-main)] font-bold text-sm">${p.price}</span>
                    {p.original && <span className="text-[var(--text-faint)] text-xs line-through">${p.original}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[var(--text-main)] font-bold">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={20} />
              </button>
            </div>
            <FilterSidebar />
            <button onClick={() => setSidebarOpen(false)}
              className="mt-6 w-full py-3 bg-[var(--text-main)] text-[var(--bg-primary)] font-bold rounded-xl hover:bg-[var(--accent-gray-hover)] transition-colors">
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
