import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';

const ALL_CATEGORIES = [
  { name: 'Electronics', emoji: '💻', count: '45,230', slug: 'electronics', gradient: 'from-blue-600 to-cyan-600', desc: 'Phones, laptops, gadgets & more' },
  { name: 'Fashion', emoji: '👗', count: '120,410', slug: 'fashion', gradient: 'from-pink-600 to-rose-600', desc: 'Clothing, shoes & accessories' },
  { name: 'Beauty', emoji: '💄', count: '32,100', slug: 'beauty', gradient: 'from-purple-600 to-violet-600', desc: 'Skincare, makeup & fragrance' },
  { name: 'Gaming', emoji: '🎮', count: '18,760', slug: 'gaming', gradient: 'from-green-600 to-emerald-600', desc: 'Consoles, games & accessories' },
  { name: 'Home & Living', emoji: '🏠', count: '67,800', slug: 'home', gradient: 'from-amber-600 to-orange-600', desc: 'Furniture, decor & appliances' },
  { name: 'Sports', emoji: '⚽', count: '29,400', slug: 'sports', gradient: 'from-red-600 to-rose-600', desc: 'Equipment, apparel & nutrition' },
  { name: 'Books', emoji: '📚', count: '200,000', slug: 'books', gradient: 'from-indigo-600 to-blue-600', desc: 'Fiction, non-fiction & education' },
  { name: 'Toys & Kids', emoji: '🧸', count: '41,300', slug: 'toys', gradient: 'from-yellow-600 to-amber-600', desc: 'Toys, games & baby products' },
  { name: 'Food & Grocery', emoji: '🍕', count: '15,900', slug: 'food', gradient: 'from-orange-600 to-red-600', desc: 'Fresh, packaged & organic food' },
  { name: 'Health', emoji: '💊', count: '23,500', slug: 'health', gradient: 'from-teal-600 to-cyan-600', desc: 'Supplements, wellness & fitness' },
  { name: 'Automotive', emoji: '🚗', count: '12,100', slug: 'auto', gradient: 'from-gray-600 to-slate-600', desc: 'Parts, accessories & tools' },
  { name: 'Jewelry', emoji: '💍', count: '9,800', slug: 'jewelry', gradient: 'from-rose-600 to-pink-600', desc: 'Rings, necklaces & watches' },
];

const FEATURED = ['electronics', 'fashion', 'gaming', 'beauty'];

export default function Categories() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = ALL_CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );
  const featured = ALL_CATEGORIES.filter(c => FEATURED.includes(c.slug));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[var(--text-main)] mb-1">Browse Categories</h1>
          <p className="text-[var(--text-muted)] text-sm">Explore over 600,000 products across 12 categories</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] focus:border-[var(--text-main)] rounded-2xl pl-11 pr-4 py-3 text-[var(--text-main)] placeholder-[var(--text-faint)] text-sm outline-none transition-colors"
          />
        </div>

        {/* Featured Categories */}
        {!query && (
          <div className="mb-8">
            <h2 className="text-[var(--text-main)] font-bold text-base mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Featured Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map(cat => (
                <Link
                  key={cat.slug}
                  to={`/categories/${cat.slug}`}
                  className={`relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br ${cat.gradient} group`}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <div className="text-3xl mb-1">{cat.emoji}</div>
                    <h3 className="text-white font-bold text-sm">{cat.name}</h3>
                    <span className="text-white/70 text-xs">{cat.count} products</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending indicator */}
        {!query && (
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-[var(--text-muted)] text-sm">Electronics & Gaming trending today</span>
          </div>
        )}

        {/* All Categories Grid */}
        <h2 className="text-[var(--text-main)] font-bold text-base mb-4">
          {query ? `Results for "${query}"` : 'All Categories'}
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-[var(--text-muted)]">No categories found for "{query}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(cat => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--text-main)] font-bold text-sm">{cat.name}</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{cat.desc}</p>
                  <span className="text-[var(--text-faint)] text-xs mt-1 block">{cat.count} products</span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
