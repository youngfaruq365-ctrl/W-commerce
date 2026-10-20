import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Star, ShoppingCart, Heart, Sparkles, Tag, X, Plus, TrendingUp, Users, Package } from 'lucide-react';
import { WButton, WCard, WBadge, WSkeleton } from '../../design/components';
import { apiClient as axios } from '@/utils/apiClient';

const PRODUCTS = [
  { id: 1, name: 'Sony WH-1000XM5 Headphones', price: 279.99, originalPrice: 349.99, rating: 4.9, reviews: 12400, category: 'Electronics', badge: 'Best Seller' },
  { id: 2, name: 'Nike Air Zoom Pegasus 40', price: 119.99, originalPrice: 130.00, rating: 4.7, reviews: 8900, category: 'Footwear', badge: 'Trending' },
  { id: 3, name: 'Kindle Paperwhite (16GB)', price: 139.99, originalPrice: 159.99, rating: 4.8, reviews: 22000, category: 'Electronics', badge: 'Top Rated' },
  { id: 4, name: 'Levi\'s 501 Original Jeans', price: 59.99, originalPrice: 79.99, rating: 4.5, reviews: 5600, category: 'Fashion', badge: null },
  { id: 5, name: 'Instant Pot Duo 7-in-1', price: 89.95, originalPrice: 99.95, rating: 4.8, reviews: 31000, category: 'Kitchen', badge: 'Fan Favorite' },
  { id: 6, name: 'Apple AirPods Pro 2nd Gen', price: 199.99, originalPrice: 249.99, rating: 4.8, reviews: 45000, category: 'Electronics', badge: 'New' },
  { id: 7, name: 'LEGO Technic Bugatti Chiron', price: 349.99, originalPrice: 379.99, rating: 4.9, reviews: 3400, category: 'Toys', badge: null },
  { id: 8, name: 'Patagonia Better Sweater Fleece', price: 99.00, originalPrice: 119.00, rating: 4.6, reviews: 7200, category: 'Outdoor', badge: 'Eco-Friendly' },
];

const TRENDING = [
  { id: 9, name: 'Dyson V15 Detect Vacuum', price: 649.99, originalPrice: 749.99, rating: 4.8, reviews: 9800, category: 'Home', badge: 'Hot' },
  { id: 10, name: 'Samsung 32" Curved Monitor', price: 329.00, originalPrice: 399.00, rating: 4.7, reviews: 4100, category: 'Electronics', badge: 'Deal' },
  { id: 11, name: 'Hydroflask 32oz Wide Mouth', price: 44.95, originalPrice: 54.95, rating: 4.7, reviews: 18700, category: 'Outdoor', badge: 'Popular' },
  { id: 12, name: 'Oura Ring Gen 3', price: 299.00, originalPrice: null, rating: 4.5, reviews: 6200, category: 'Wellness', badge: 'New' },
];

const DEFAULT_TAGS = ['Electronics', 'Gaming', 'Fashion', 'Outdoor Gear', 'Books', 'Home Decor'];

const COLORS = ['from-purple-800 to-blue-900', 'from-emerald-800 to-teal-900', 'from-orange-800 to-red-900', 'from-pink-800 to-rose-900', 'from-indigo-800 to-violet-900', 'from-amber-800 to-yellow-900', 'from-cyan-800 to-sky-900', 'from-fuchsia-800 to-pink-900'];

function ProductCard({ product, idx }) {
  const [wished, setWished] = useState(false);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  return (
    <div className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-1">
      <div className={`h-36 bg-gradient-to-br ${COLORS[idx % COLORS.length]} relative flex items-center justify-center`}>
        <Package size={32} className="text-white/30" />
        {product.badge && <span className="absolute top-2 left-2 text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-medium">{product.badge}</span>}
        {discount > 0 && <span className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">-{discount}%</span>}
        <button onClick={() => setWished(!wished)} className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${wished ? 'bg-red-500' : 'bg-black/30 hover:bg-black/50'}`}>
          <Heart size={13} className={wished ? 'fill-white text-white' : 'text-white'} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide mb-1">{product.category}</p>
        <h3 className="text-[var(--text-main)] text-sm font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={11} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[var(--text-faint)] text-xs">{product.rating} ({(product.reviews / 1000).toFixed(1)}k)</span>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <div>
            <span className="text-white font-bold text-sm">₦{product.price}</span>
            {product.originalPrice && <span className="text-[var(--text-faint)] text-xs line-through ml-1">₦{product.originalPrice}</span>}
          </div>
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-7 h-7 rounded-lg bg-[var(--accent-gray-dim)] hover:bg-[var(--text-main)] flex items-center justify-center transition-all group/btn">
            <ShoppingCart size={13} className="text-[var(--text-main)] group-hover/btn:text-[var(--bg-primary)] transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, products, cols = 4 }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-gray-dim)] flex items-center justify-center">
          <Icon size={15} className="text-[var(--text-main)]" />
        </div>
        <h2 className="text-[var(--text-main)] font-bold text-lg">{title}</h2>
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`}>
        {products.map((p, i) => <ProductCard key={p.id} product={p} idx={i} />)}
      </div>
    </div>
  );
}

export default function AIProductRecommendations() {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [newTag, setNewTag] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/ai/recommendations', { withCredentials: true });
      if (res.data.success) {
        // Usage tracking or recommendations update
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to refresh recommendations');
    }
    setTimeout(() => { setLoading(false); setRefreshKey(k => k + 1); }, 1200);
  };

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));
  const addTag = () => { if (newTag.trim() && !tags.includes(newTag.trim())) { setTags(prev => [...prev, newTag.trim()]); setNewTag(''); } };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">AI-Powered</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent">Curated Just For You</h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">Personalized picks based on your browsing, wishlist, and purchase history.</p>
          </div>
          <WButton variant="ghost" icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />} onClick={refresh} loading={loading}>
            Refresh Recommendations
          </WButton>
        </div>

        {/* Interest Tags */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-[var(--text-muted)]" />
            <p className="text-[var(--text-main)] font-semibold text-sm">AI-Detected Interests</p>
            <span className="text-[var(--text-faint)] text-xs ml-1">· Click × to remove or add new tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1.5 bg-[var(--accent-gray-dim)] text-[var(--text-main)] text-xs px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add interest..." className="bg-transparent text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none w-28 border-b border-[var(--border-color)] pb-0.5" />
              <button onClick={addTag} className="w-5 h-5 rounded-full bg-[var(--accent-gray-dim)] hover:bg-[var(--text-main)] flex items-center justify-center transition-all group">
                <Plus size={10} className="text-[var(--text-main)] group-hover:text-[var(--bg-primary)] transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <WSkeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : (
          <>
            <Section key={`browse-${refreshKey}`} icon={Package} title="Based on Your Browsing" products={PRODUCTS.slice(0, 4)} />
            <Section key={`trending-${refreshKey}`} icon={TrendingUp} title="Trending in Your Interests" products={TRENDING} />
            <Section key={`also-${refreshKey}`} icon={Users} title="People Like You Also Bought" products={PRODUCTS.slice(4, 8)} />
            <Section key={`complete-${refreshKey}`} icon={ShoppingCart} title="Complete Your Collection" products={[...TRENDING.slice(2), ...PRODUCTS.slice(0, 2)]} />
          </>
        )}
      </div>
    </div>
  );
}
