import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState } from 'react';
import { ShieldCheck, Star, MapPin, Package, ShoppingBag, Calendar, Search, Grid, List, Filter, SortAsc } from 'lucide-react';

/* ─── Shared Premium Banner ─── */
const PremiumBanner = ({ store, isFollowing, followersCount, onFollow, tier = 'premium' }) => {
  const tierConfig = {
    free:    { label: 'Free Store',    gem: '🏪', bg: 'from-slate-800 via-slate-700 to-slate-900',   wave: '#64748b', badge: 'bg-slate-600 text-slate-200' },
    premium: { label: 'Premium Store', gem: '💎', bg: 'from-zinc-900 via-yellow-950 to-zinc-900',     wave: '#b8860b', badge: 'bg-yellow-600/90 text-yellow-100' },
    pro:     { label: 'Pro Store',     gem: '⚡', bg: 'from-gray-950 via-blue-950 to-gray-950',       wave: '#1d4ed8', badge: 'bg-blue-800/80 text-blue-200' },
    ultra:   { label: 'Ultra Store',   gem: '👑', bg: 'from-zinc-950 via-purple-950 to-zinc-950',     wave: '#7c3aed', badge: 'bg-purple-800/80 text-purple-200' },
  };
  const cfg = tierConfig[tier] || tierConfig.premium;

  return (
    <div className={`relative w-full h-48 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-r ${cfg.bg} shadow-2xl`}>
      <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 500 220" preserveAspectRatio="none">
        <path d="M0,130 C80,50 180,190 290,100 C390,20 430,160 500,80 L500,220 L0,220 Z" fill={cfg.wave} fillOpacity="0.6"/>
        <path d="M0,160 C100,100 210,180 330,130 C430,80 460,160 500,120 L500,220 L0,220 Z" fill={cfg.wave} fillOpacity="0.35"/>
      </svg>
      {store?.bannerUrl && (
        <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-25"/>
      )}
      <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-10">
        <div className="w-22 h-22 md:w-28 md:h-28 rounded-full border-4 border-white/25 bg-black/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-2xl overflow-hidden" style={{width:'88px',height:'88px'}}>
          {store?.logoUrl
            ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
            : <span className="text-3xl font-black text-white">{store?.storeName?.charAt(0) || 'S'}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate drop-shadow-lg">{store?.storeName || 'Store Name'}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badge} backdrop-blur`}>
              {cfg.gem} {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
              <Star size={13} fill="currentColor"/> {store?.averageRating || '4.9'} ({store?.totalReviews || '0'}k)
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
            <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country || 'Global'}</span>
            <span className="font-semibold text-white/80">{(followersCount||0).toLocaleString()} Followers</span>
          </div>
        </div>
        <button
          onClick={onFollow}
          className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-xl ${isFollowing ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
        >
          {isFollowing ? '✓ Following' : '+ Follow Store'}
        </button>
      </div>
    </div>
  );
};

/* ─── Product Card ─── */
const ProductCard = ({ product, onAddToCart, view = 'grid' }) => {
  if (view === 'list') {
    return (
      <div className="flex gap-3 sm:p-4 bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all group">
        <div className="w-20 h-20 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
          <img src={product.images?.[0]?.url || PLACEHOLDER_IMAGE} alt={product.title}
            onError={e => { e.target.onerror=null; e.target.src={PLACEHOLDER_IMAGE}; }}
            className="w-full h-full object-cover"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{product.title}</p>
          <p className="text-yellow-600 font-black text-lg">₦{Number(product.price||0).toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Star size={11} fill="#fbbf24" className="text-yellow-400"/>
            {product.averageRating || '4.5'} ({product._count?.reviews || 0})
          </div>
        </div>
        <button onClick={(e) => onAddToCart(e, product.id)}
          className="self-center px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 transition-colors">
          Add
        </button>
      </div>
    );
  }
  return (
    <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        <img src={product.images?.[0]?.url || PLACEHOLDER_IMAGE} alt={product.title}
          onError={e => { e.target.onerror=null; e.target.src={PLACEHOLDER_IMAGE}; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        {product.isFlashSale && <span className="absolute top-2 left-2 bg-red-500 text-white text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-full">SALE</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.title}</p>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
          <Star size={10} fill="#fbbf24" className="text-yellow-400"/>
          {product.averageRating || '4.5'}
        </div>
        <p className="text-base font-black text-yellow-700 mt-auto">₦{Number(product.price||0).toLocaleString()}</p>
        <button onClick={(e) => onAddToCart(e, product.id)}
          className="w-full mt-2 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-yellow-600 transition-colors">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

/* ─── PREMIUM PORTFOLIO ─── */
const PremiumPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const products = store?.products || [];
  const filteredProducts = products.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const TABS = ['home', 'products', 'about'];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 font-sans">
      {/* Banner */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <PremiumBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow} tier="premium"/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-5">
        <nav className="flex gap-1 border-b border-gray-200">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-yellow-600 text-yellow-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              {tab === 'about' ? 'About Store' : tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {/* ── HOME ── */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:p-4">
              {[
                { label: 'Followers', value: (followersCount||0).toLocaleString() },
                { label: 'Products', value: products.length },
                { label: 'Positive Reviews', value: store?.totalReviews ? `${store.totalReviews}%` : '98%' },
                { label: 'Response Time', value: '2 mins' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm text-center">
                  <div className="text-2xl font-black text-gray-900">{s.value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Featured Products */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
                <button onClick={() => setActiveTab('products')} className="text-sm text-yellow-700 font-semibold hover:underline">View all →</button>
              </div>
              {products.length === 0 ? (
                <div className="py-16 text-center text-gray-400"><Package size={48} className="mx-auto mb-4 text-gray-200"/><p>No products yet.</p></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:p-4">
                  {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart}/>)}
                </div>
              )}
            </div>

            {/* About snippet */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">About {store?.storeName}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{store?.description || 'Quality products, unbeatable prices, exceptional customer service.'}</p>
              <button onClick={() => setActiveTab('about')} className="mt-3 text-sm text-yellow-700 font-semibold hover:underline">Learn more →</button>
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" placeholder="Search products..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30"/>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg border transition ${viewMode==='grid' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}><Grid size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg border transition ${viewMode==='list' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}><List size={16}/></button>
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">All Products ({filteredProducts.length})</p>
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-gray-400"><Package size={48} className="mx-auto mb-4 text-gray-200"/><p>No products found.</p></div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:p-4">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} view="grid"/>)}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} view="list"/>)}
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT ── */}
        {activeTab === 'about' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row gap-4 sm:p-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">About {store?.storeName}</h2>
                <p className="text-gray-600 leading-relaxed">{store?.description || 'We are committed to providing quality products and exceptional customer service.'}</p>
              </div>
              {store?.bannerUrl && (
                <div className="w-full md:w-48 h-32 md:h-auto rounded-xl overflow-hidden flex-shrink-0">
                  <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:p-4">
              {[
                { label: 'Years in Business', value: store?.createdAt ? `${new Date().getFullYear() - new Date(store.createdAt).getFullYear()}+` : '2+' },
                { label: 'Happy Customers', value: `${store?.totalOrders || '50'}k+` },
                { label: 'Satisfaction', value: '100%' },
                { label: 'Location', value: store?.country || 'Nigeria' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-gray-900">{s.value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-2xl border border-yellow-100 p-3 sm:p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-yellow-600"/> Verified &amp; Trusted</h3>
              <div className="space-y-2">
                {[
                  { icon: ShieldCheck, text: 'W-Commerce Verified Seller', color: 'text-yellow-600' },
                  { icon: ShoppingBag, text: 'Secure Payments — Paystack Protected', color: 'text-green-600' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={16} className={color}/>
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumPortfolio;
