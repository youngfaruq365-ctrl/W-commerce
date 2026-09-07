import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Flame, ShoppingCart, Heart, Star, Clock, ChevronLeft, ChevronRight,
  MapPin, Eye, Zap, TrendingUp, Grid, Package, Radio, Users, MessageCircle,
  Sparkles, ArrowRight, Play, Camera, Search, Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

// ── Mock Data ─────────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: 1, title: 'Summer Sale Is Live', subtitle: 'Up to 70% off on Electronics & Fashion',
    cta: 'Shop Now', gradient: 'from-violet-900 via-purple-800 to-indigo-900',
    accent: '#a78bfa', tag: '🔥 Hot Deal'
  },
  {
    id: 2, title: 'New Season Arrivals', subtitle: 'Discover the latest trends before they sell out',
    cta: 'Explore', gradient: 'from-rose-900 via-pink-800 to-orange-900',
    accent: '#fb7185', tag: '✨ New In'
  },
  {
    id: 3, title: 'Gaming Week 2026', subtitle: 'Best prices on consoles, gear & accessories',
    cta: 'Level Up', gradient: 'from-emerald-900 via-teal-800 to-cyan-900',
    accent: '#34d399', tag: '🎮 Gaming'
  },
];


const TRENDING = [
  { id: 1, name: 'Dyson Airwrap', price: 449, image: '💨', rating: 4.8, reviews: 12400, badge: 'Trending #1' },
  { id: 2, name: 'Samsung OLED 65"', price: 1299, image: '📺', rating: 4.7, reviews: 8900, badge: 'Trending #2' },
  { id: 3, name: 'Lululemon Leggings', price: 98, image: '🩱', rating: 4.6, reviews: 34000, badge: 'Trending #3' },
  { id: 4, name: 'PS5 Slim Bundle', price: 449, image: '🎮', rating: 4.9, reviews: 5600, badge: 'Trending #4' },
  { id: 5, name: 'Instant Pot Duo', price: 79, image: '🍲', rating: 4.7, reviews: 89000, badge: 'Trending #5' },
];

const CATEGORIES = [
  { name: 'Electronics', emoji: '💻', count: '45K+', slug: 'electronics', color: 'from-blue-600 to-cyan-600' },
  { name: 'Fashion', emoji: '👗', count: '120K+', slug: 'fashion', color: 'from-pink-600 to-rose-600' },
  { name: 'Beauty', emoji: '💄', count: '32K+', slug: 'beauty', color: 'from-purple-600 to-violet-600' },
  { name: 'Gaming', emoji: '🎮', count: '18K+', slug: 'gaming', color: 'from-green-600 to-emerald-600' },
  { name: 'Home', emoji: '🏠', count: '67K+', slug: 'home', color: 'from-amber-600 to-orange-600' },
  { name: 'Sports', emoji: '⚽', count: '29K+', slug: 'sports', color: 'from-red-600 to-rose-600' },
  { name: 'Books', emoji: '📚', count: '200K+', slug: 'books', color: 'from-indigo-600 to-blue-600' },
  { name: 'Toys', emoji: '🧸', count: '41K+', slug: 'toys', color: 'from-yellow-600 to-amber-600' },
  { name: 'Food', emoji: '🍕', count: '15K+', slug: 'food', color: 'from-orange-600 to-red-600' },
  { name: 'Health', emoji: '💊', count: '23K+', slug: 'health', color: 'from-teal-600 to-cyan-600' },
  { name: 'Auto', emoji: '🚗', count: '12K+', slug: 'auto', color: 'from-gray-600 to-slate-600' },
  { name: 'Jewelry', emoji: '💍', count: '9K+', slug: 'jewelry', color: 'from-rose-600 to-pink-600' },
];

const NEARBY_STORES = [
  { id: 1, name: 'TechVault Store', category: 'Electronics', rating: 4.9, reviews: 2300, distance: '0.8 km', avatar: '🏪' },
  { id: 2, name: 'Fashionista Hub', category: 'Fashion', rating: 4.7, reviews: 1800, distance: '1.2 km', avatar: '👗' },
  { id: 3, name: 'GreenLife Market', category: 'Health & Food', rating: 4.8, reviews: 956, distance: '2.1 km', avatar: '🌿' },
  { id: 4, name: 'GameZone Pro', category: 'Gaming', rating: 4.9, reviews: 3100, distance: '3.4 km', avatar: '🎮' },
];

const STORIES = [
  { id: 1, seller: 'Sarah K.', avatar: '👩', viewed: false, color: 'from-pink-500 to-rose-500' },
  { id: 2, seller: 'TechMaster', avatar: '👨‍💻', viewed: false, color: 'from-blue-500 to-cyan-500' },
  { id: 3, seller: 'StyleHouse', avatar: '🧑', viewed: true, color: 'from-purple-500 to-violet-500' },
  { id: 4, seller: 'FitGear', avatar: '💪', viewed: false, color: 'from-green-500 to-emerald-500' },
  { id: 5, seller: 'CozyNest', avatar: '🏡', viewed: true, color: 'from-amber-500 to-orange-500' },
  { id: 6, seller: 'BeautyBar', avatar: '💅', viewed: false, color: 'from-rose-500 to-pink-500' },
];

const COMMUNITY_POSTS = [
  {
    id: 1, user: 'Alex M.', avatar: '🧑‍🎤', time: '2h ago',
    caption: 'Just got my new setup! The RGB keyboard from TechVault is absolutely fire 🔥 Totally worth the price.',
    image: '💻', likes: 847, comments: 134, tag: 'Tech Setup'
  },
  {
    id: 2, user: 'Mia Chen', avatar: '👩‍🎨', time: '4h ago',
    caption: 'Summer haul arrived! StyleHouse never disappoints 💯 Sizing is perfect, material feels premium.',
    image: '👗', likes: 1200, comments: 89, tag: 'Fashion Haul'
  },
  {
    id: 3, user: 'Jordan T.', avatar: '🧑‍💼', time: '6h ago',
    caption: 'Made my home office dream a reality thanks to W-Commerce. Links in bio for all items!',
    image: '🖥️', likes: 2340, comments: 267, tag: 'Home Office'
  },
];

const COLLECTIONS = [
  { id: 1, name: 'Work From Home Essentials', items: 48, gradient: 'from-violet-900 to-indigo-900', emoji: '🖥️' },
  { id: 2, name: 'Summer Beach Vibes', items: 62, gradient: 'from-orange-800 to-rose-900', emoji: '🏖️' },
  { id: 3, name: "Gamer's Paradise", items: 35, gradient: 'from-emerald-900 to-cyan-900', emoji: '🎮' },
];

const LIVE_SESSIONS = [
  { id: 1, seller: 'TechMaster Pro', avatar: '👨‍💻', viewers: 4320, product: 'iPhone 16 Pro Unboxing', duration: '1:24:30' },
  { id: 2, seller: 'StyleQueen', avatar: '👩‍🎤', viewers: 2100, product: 'Summer Fashion Haul', duration: '0:45:12' },
];

// ── Countdown Timer Hook ──────────────────────────────────────────────────────
function useCountdown(targetHours = 8) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(time.h)}:${pad(time.m)}:${pad(time.s)}`;
}

// ── SmartProductCard ──────────────────────────────────────────────────────────
function SmartProductCard({ product, onAddToCart }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    await new Promise(r => setTimeout(r, 600));
    onAddToCart?.(product);
    setAdding(false);
  };

  return (
    <div className="relative flex-shrink-0 w-44 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-1 overflow-hidden group">
      {product.discount && (
        <div className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          -{product.discount}%
        </div>
      )}
      <button
        onClick={() => setWishlisted(!wishlisted)}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <Heart size={14} className={wishlisted ? 'fill-rose-400 text-rose-400' : 'text-[var(--text-muted)]'} />
      </button>
      <div className="h-32 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center text-5xl">
        {product.image}
      </div>
      <div className="p-3">
        <p className="text-[var(--text-main)] text-xs font-medium truncate">{product.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star size={10} className="fill-amber-400 text-amber-400" />
          <span className="text-[var(--text-muted)] text-xs">{product.rating}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[var(--text-main)] font-bold text-sm">${product.price}</span>
          {product.original && (
            <span className="text-[var(--text-faint)] text-xs line-through">${product.original}</span>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="mt-2 w-full py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-primary)] text-xs font-bold hover:bg-[var(--accent-gray-hover)] transition-all flex items-center justify-center gap-1"
        >
          {adding ? <div className="w-3 h-3 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" /> : <ShoppingCart size={12} />}
          {adding ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToCart } = useCartStore();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [products, setProducts] = useState([]);

  const bannerRef = useRef(null);

  // Auto-slide banners
  useEffect(() => {
    const t = setInterval(() => setCurrentBanner(p => (p + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fetch products (with fallback)
  useEffect(() => {
    axios.get('/api/v1/products?limit=10')
      .then(r => setProducts(r.data?.products || TRENDING))
      .catch(() => setProducts(TRENDING));
  }, []);

  const handleAddToCart = useCallback((product) => {
    addToCart({ productId: product.id, quantity: 1 });
  }, [addToCart]);

  const banner = BANNERS[currentBanner];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="flex-1 flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5 hover:border-[var(--border-hover)] transition-colors"
          >
            <Search size={16} className="text-[var(--text-muted)]" />
            <span className="text-[var(--text-faint)] text-sm">Search for anything...</span>
            <Camera size={16} className="text-[var(--text-muted)] ml-auto" />
          </button>
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="relative p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-colors">
            <Bell size={18} className="text-[var(--text-main)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">

        {/* ── Section 1: Hero Banner ─────────────────────────────────────────── */}
        <div className="mt-4 relative rounded-3xl overflow-hidden h-64 md:h-80">
          <div className={`absolute inset-0 bg-gradient-to-br ${banner.gradient} transition-all duration-700`} />
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white mb-3 w-fit">
              {banner.tag}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">{banner.title}</h1>
            <p className="text-white/80 text-sm md:text-base mb-5">{banner.subtitle}</p>
            <button
              onClick={() => navigate('/flash-deals')}
              className="flex items-center gap-2 bg-white text-[var(--bg-primary)] font-bold px-5 py-2.5 rounded-xl hover:scale-[1.03] transition-transform w-fit text-sm"
            >
              {banner.cta} <ArrowRight size={16} />
            </button>
          </div>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {BANNERS.map((_, i) => (
              <button
                key={i} onClick={() => setCurrentBanner(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
              />
            ))}
          </div>
          {/* Nav arrows */}
          <button
            onClick={() => setCurrentBanner(p => (p - 1 + BANNERS.length) % BANNERS.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentBanner(p => (p + 1) % BANNERS.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>


        {/* ── Section 3: Seller Stories ──────────────────────────────────────── */}
        <div className="mt-8">
          <h2 className="text-[var(--text-main)] font-bold text-base mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-violet-400 to-pink-400 rounded-full inline-block" />
            Seller Stories
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {STORIES.map(s => (
              <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  key={s.id} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <div className={`p-0.5 rounded-full bg-gradient-to-br ${s.viewed ? 'from-gray-600 to-gray-700' : s.color}`}>
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-2xl border-2 border-[var(--bg-primary)]">
                    {s.avatar}
                  </div>
                </div>
                <span className="text-[var(--text-muted)] text-xs truncate w-16 text-center">{s.seller}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 4: Trending Products ──────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-amber-400" />
              Trending Now
            </h2>
            <Link to="/trending" className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {TRENDING.map(p => (
              <SmartProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </div>

        {/* ── Section 5: Live Shopping ───────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <Radio size={18} className="text-rose-400 animate-pulse" />
              Live Shopping
            </h2>
            <span className="text-[var(--text-muted)] text-sm">{LIVE_SESSIONS.length} live now</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIVE_SESSIONS.map(session => (
              <div key={session.id} className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden hover:border-[var(--border-hover)] transition-all cursor-pointer group">
                <div className="h-32 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center text-6xl">
                  {session.avatar}
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  <Eye size={12} /> {session.viewers.toLocaleString()}
                </div>
                <div className="p-4">
                  <p className="text-[var(--text-main)] font-semibold text-sm">{session.product}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[var(--text-muted)] text-xs">by {session.seller}</span>
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex items-center gap-1 bg-rose-500 hover:bg-rose-400 text-white text-xs px-3 py-1.5 rounded-xl transition-colors font-bold">
                      <Play size={12} /> Watch
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 6: Categories Grid ────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <Grid size={18} className="text-blue-400" />
              Browse Categories
            </h2>
            <Link to="/categories" className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="group flex flex-col items-center gap-2 p-3 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-sm)]"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl shadow-lg`}>
                  {cat.emoji}
                </div>
                <span className="text-[var(--text-main)] text-xs font-medium text-center leading-tight">{cat.name}</span>
                <span className="text-[var(--text-faint)] text-xs">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 7: Recommended For You ────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-violet-400" />
              {isAuthenticated ? `Picked for You, ${user?.name?.split(' ')[0] || 'You'}` : 'Recommended For You'}
            </h2>
            <Link to="/trending" className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              More <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...TRENDING].slice(0, 4).map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all hover:-translate-y-1 overflow-hidden group">
                <div className="h-36 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center text-5xl">
                  {p.image}
                </div>
                <div className="p-3">
                  <p className="text-[var(--text-main)] text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[var(--text-main)] font-bold">${p.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 8: Nearby Stores ───────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <MapPin size={18} className="text-emerald-400" />
              Nearby Stores
            </h2>
            <Link to="/nearby-stores" className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              View map <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {NEARBY_STORES.map(store => (
              <div key={store.id} className="flex-shrink-0 w-48 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all p-4 hover:-translate-y-1">
                <div className="text-4xl mb-2">{store.avatar}</div>
                <p className="text-[var(--text-main)] font-semibold text-sm">{store.name}</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{store.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-[var(--text-main)] text-xs font-bold">{store.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-faint)] text-xs">
                    <MapPin size={10} /> {store.distance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 9: Community Posts ────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <Users size={18} className="text-cyan-400" />
              Community
            </h2>
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMMUNITY_POSTS.map(post => (
              <div key={post.id} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--border-hover)] transition-all">
                <div className="h-40 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center text-7xl">
                  {post.image}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm">{post.avatar}</div>
                    <span className="text-[var(--text-main)] text-sm font-medium">{post.user}</span>
                    <span className="text-[var(--text-faint)] text-xs ml-auto">{post.time}</span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed line-clamp-2">{post.caption}</p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-rose-400 transition-colors text-xs">
                      <Heart size={14} /> {post.likes.toLocaleString()}
                    </button>
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors text-xs">
                      <MessageCircle size={14} /> {post.comments}
                    </button>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-faint)]">{post.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 10: Collections ────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text-main)] font-bold text-lg flex items-center gap-2">
              <Package size={18} className="text-amber-400" />
              Curated Collections
            </h2>
            <Link to="/collections" className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">
              All collections <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLLECTIONS.map(col => (
              <Link
                key={col.id}
                to={`/collections`}
                className={`relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br ${col.gradient} group`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="text-4xl mb-2">{col.emoji}</div>
                  <h3 className="text-white font-bold text-lg leading-tight">{col.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/70 text-sm">{col.items} items</span>
                    <span className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                      Shop <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
