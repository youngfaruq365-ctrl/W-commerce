import React, { useState } from 'react';
import { ShieldCheck, Star, MapPin, Package, Users, ShoppingBag, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

/* ─────────────── SHARED: Premium Banner ─────────────── */
const PremiumBanner = ({ store, isFollowing, followersCount, onFollow, tier = 'free' }) => {
  const tierConfig = {
    free:    { label: 'Free Store',    gem: '🏪', bg: 'from-slate-800 via-slate-700 to-slate-900',   wave: '#64748b', badge: 'bg-slate-600 text-slate-200' },
    premium: { label: 'Premium Store', gem: '💎', bg: 'from-zinc-900 via-yellow-950 to-zinc-900',     wave: '#b8860b', badge: 'bg-yellow-700/80 text-yellow-200' },
    pro:     { label: 'Pro Store',     gem: '⚡', bg: 'from-gray-950 via-blue-950 to-gray-950',       wave: '#1d4ed8', badge: 'bg-blue-800/80 text-blue-200' },
    ultra:   { label: 'Ultra Store',   gem: '👑', bg: 'from-zinc-950 via-purple-950 to-zinc-950',     wave: '#7c3aed', badge: 'bg-purple-800/80 text-purple-200' },
  };
  const cfg = tierConfig[tier] || tierConfig.free;

  return (
    <div className={`relative w-full h-44 md:h-52 rounded-2xl overflow-hidden bg-gradient-to-r ${cfg.bg} shadow-2xl`}>
      {/* Wave SVG */}
      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 500 200" preserveAspectRatio="none">
        <path d="M0,120 C80,60 180,180 280,100 C380,20 420,160 500,80 L500,200 L0,200 Z" fill={cfg.wave} fillOpacity="0.5"/>
        <path d="M0,150 C100,90 200,170 320,120 C420,70 460,150 500,110 L500,200 L0,200 Z" fill={cfg.wave} fillOpacity="0.3"/>
      </svg>

      {/* Product silhouette right side */}
      {store?.bannerUrl && (
        <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-1/2 object-cover object-left opacity-30"/>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-8">
        {/* Logo */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/20 bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-xl overflow-hidden">
          {store?.logoUrl
            ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
            : <span className="text-3xl font-black text-white">{store?.storeName?.charAt(0) || 'S'}</span>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate drop-shadow">{store?.storeName || 'Store Name'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
              {cfg.gem} {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
              <Star size={13} fill="currentColor"/> {store?.averageRating || '4.9'} ({store?.totalReviews || '0'}k)
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-white/70 text-xs">
            <span className="flex items-center gap-1"><MapPin size={12}/>{store?.country || 'Global'}</span>
            <span className="font-semibold text-white/90">{followersCount?.toLocaleString() || '0'} Followers</span>
          </div>
        </div>

        {/* Follow btn */}
        <button
          onClick={onFollow}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg ${isFollowing ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
        >
          {isFollowing ? 'Following' : 'Follow Store'}
        </button>
      </div>
    </div>
  );
};

/* ─────────────── FREE: Product Grid ─────────────── */
const ProductCard = ({ product, onAddToCart, index = 0 }) => (
  <motion.div variants={fadeUp} custom={index} className="group border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300 flex flex-col">
    <div className="aspect-square bg-gray-50 overflow-hidden relative">
      <img
        src={product.images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'}
        alt={product.title}
        onError={e => { e.target.onerror = null; e.target.src = '/assets/splash_3d_box_1781971684931.png'; }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>
    <div className="p-3 flex flex-col flex-1">
      <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.title}</p>
      <p className="text-base font-black text-gray-900 mt-auto">₦{Number(product.price || 0).toLocaleString()}</p>
      <button
        onClick={(e) => onAddToCart(e, product.id)}
        className="w-full mt-2 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  </motion.div>
);

/* ─────────────── FREE PORTFOLIO ─────────────── */
const FreePortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [activeTab, setActiveTab] = useState('home');
  const products = store?.products || [];

  const TABS = ['home', 'about'];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900 font-sans">
      {/* Banner */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <PremiumBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow} tier="free"/>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-5">
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {tab === 'about' ? 'About Store' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 pb-20">
        {activeTab === 'home' && (
          <div>
            {products.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 text-gray-200"/>
                <p className="font-semibold">No products listed yet.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-5">Featured Products</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:p-4">
                  {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart}/>)}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">About {store?.storeName}</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">{store?.description || 'No description provided.'}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:p-4 mb-8">
              {[
                { icon: ShoppingBag, label: 'Total Orders', value: store?.totalOrders || '0' },
                { icon: Package, label: 'Products', value: products.length },
                { icon: Calendar, label: 'Joined', value: store?.createdAt ? new Date(store.createdAt).getFullYear() : '2024' },
                { icon: Star, label: 'Rating', value: store?.averageRating || '0.0' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 text-center shadow-sm">
                  <Icon size={20} className="mx-auto mb-2 text-gray-400"/>
                  <div className="text-xl font-black text-gray-900">{value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-gray-400"/>
                <span className="text-sm font-semibold text-gray-600">Store Details</span>
              </div>
              {store?.country && <p className="text-sm text-gray-600 flex items-center gap-1"><MapPin size={14}/> {store.country}</p>}
              {store?.isVerified && <p className="text-sm text-green-600 flex items-center gap-1 mt-1"><ShieldCheck size={14}/> Verified Store</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreePortfolio;
