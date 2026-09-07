import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
import {
  ShieldCheck, Star, MapPin, Package, ShoppingBag, MessageCircle,
  Phone, Share2, Search, Filter, SortAsc, ChevronRight, ChevronLeft,
  Zap, Clock, Users, CheckCircle, Grid, List, ExternalLink, Shield
} from 'lucide-react';

/* ─── Premium Banner ─── */
const PremiumBanner = ({ store, isFollowing, followersCount, onFollow }) => (
  <div className="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-r from-gray-950 via-blue-950 to-gray-950 shadow-2xl">
    <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 500 220" preserveAspectRatio="none">
      <path d="M0,130 C80,50 180,190 290,100 C390,20 430,160 500,80 L500,220 L0,220 Z" fill="#1d4ed8" fillOpacity="0.5"/>
      <path d="M0,165 C110,105 210,185 330,135 C430,85 465,160 500,120 L500,220 L0,220 Z" fill="#1d4ed8" fillOpacity="0.25"/>
    </svg>
    {store?.bannerUrl && (
      <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-20"/>
    )}
    <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-10">
      <div className="w-22 h-22 rounded-2xl border-2 border-white/20 bg-black/40 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-2xl overflow-hidden" style={{width:'80px',height:'80px',borderRadius:'16px'}}>
        {store?.logoUrl
          ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
          : <span className="text-2xl font-black text-white">{store?.storeName?.charAt(0) || 'S'}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate">{store?.storeName || 'Store'}</h1>
          {store?.isVerified && <ShieldCheck size={18} className="text-blue-400 flex-shrink-0"/>}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/80 text-blue-100 backdrop-blur">⚡ Pro Store</span>
          <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold"><Star size={12} fill="currentColor"/> {store?.averageRating||'4.9'} ({store?.totalReviews||'0'}k)</span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
          <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Nigeria'}</span>
          <span className="font-semibold text-white/80">Response in 2 mins</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button onClick={onFollow}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-xl ${isFollowing ? 'bg-white/15 text-white border border-white/30' : 'bg-white text-gray-900 hover:bg-blue-50'}`}>
          {isFollowing ? '✓ Following' : '♡ Follow Store'}
        </button>
        <button onClick={() => navigator.share?.({ title: store?.storeName, url: window.location.href })}
          className="px-5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition flex items-center gap-1 justify-center">
          <Share2 size={12}/> Share Store
        </button>
      </div>
    </div>
  </div>
);

/* ─── Flash Sale Countdown ─── */
const useCountdown = (hours=2, minutes=34, seconds=11) => {
  const [time, setTime] = useState({ h: hours, m: minutes, s: seconds });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s-1 };
        if (m > 0) return { h, m: m-1, s: 59 };
        if (h > 0) return { h: h-1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
};

const FlashSale = ({ products = [] }) => {
  const time = useCountdown(2, 34, 11);
  const saleProduct = products[0];
  if (!saleProduct) return null;
  return (
    <div className="bg-[#111] rounded-2xl p-3 sm:p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-yellow-400"/>
        <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">Flash Sale</span>
        <span className="text-xs text-gray-500 ml-1">Limited time offer</span>
      </div>
      <div className="flex gap-2 mb-3">
        {[{ label: 'Hrs', val: time.h }, { label: 'Mins', val: time.m }, { label: 'Secs', val: time.s }].map(t => (
          <div key={t.label} className="text-center">
            <div className="bg-black text-white text-lg font-black w-12 h-10 flex items-center justify-center rounded-lg border border-white/10">
              {String(t.val).padStart(2, '0')}
            </div>
            <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 sm:p-4">
        <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
          <img src={saleProduct.images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'} alt={saleProduct.title}
            onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
            className="w-full h-full object-cover"/>
        </div>
        <div>
          <p className="text-white font-bold text-sm line-clamp-1">{saleProduct.title}</p>
          <p className="text-yellow-400 font-black text-lg">₦{Number(saleProduct.price||0).toLocaleString()}</p>
          <p className="text-gray-500 text-xs">{saleProduct.description?.slice(0,50) || 'Limited stock available'}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Product Card Dark ─── */
const DarkProductCard = ({ product, onAddToCart }) => (
  <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/15 transition-all group flex flex-col">
    <div className="aspect-square bg-[#1a1a1a] overflow-hidden relative">
      <img src={product.images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'} alt={product.title}
        onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
      <button onClick={(e) => onAddToCart(e, product.id)}
        className="absolute bottom-2 right-2 w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-black shadow">
        +
      </button>
    </div>
    <div className="p-3 flex flex-col flex-1">
      <p className="text-sm font-semibold text-white/90 line-clamp-2 mb-1">{product.title}</p>
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <Star size={10} fill="#fbbf24" className="text-yellow-400"/>
        {product.averageRating||'4.9'}
      </div>
      <p className="text-base font-black text-yellow-400 mt-auto">₦{Number(product.price||0).toLocaleString()}</p>
    </div>
  </div>
);

/* ─── Categories Pill ─── */
const CATEGORIES = ['All Products','Phones','Accessories','Laptops','Wearables','Audio','Gaming'];

/* ─── PRO PORTFOLIO ─── */
const ProPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All Products');
  const [currentPage, setCurrentPage] = useState(1);
  const [priceRange, setPriceRange] = useState(5000000);
  const ITEMS_PER_PAGE = 8;

  const products = store?.products || [];
  const filtered = products.filter(p => {
    const matchSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCat === 'All Products' || p.category?.toLowerCase().includes(activeCat.toLowerCase());
    const matchPrice = Number(p.price || 0) <= priceRange;
    return matchSearch && matchCat && matchPrice;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedProducts = filtered.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);

  const TABS = [
    { id: 'home', label: 'Home' },
    { id: 'products', label: 'Products' },
    { id: 'collections', label: 'Collections' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'about', label: 'About Store' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0a] text-white font-sans">
      {/* Banner */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <PremiumBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow}/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <nav className="flex overflow-x-auto gap-1 border-b border-white/10 pb-0 scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0 ${activeTab===t.id ? 'border-white text-white bg-white/5 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* ── HOME TAB ── */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
              {[
                { label: 'Followers', value: `${(followersCount||0).toLocaleString()}` },
                { label: 'Products', value: products.length },
                { label: 'Positive Reviews', value: store?.metrics?.rating ? `${Math.round((store.metrics.rating/5)*100)}%` : '0%' },
                { label: 'Response Time', value: '2 mins' },
              ].map(s => (
                <div key={s.label} className="bg-[#111] rounded-xl p-3 sm:p-4 border border-white/5 text-center">
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-6">
              {/* Left: Flash Sale + About */}
              <div className="lg:col-span-1 space-y-5">
                <FlashSale products={products}/>

                {/* About snippet */}
                <div className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5">
                  <h3 className="text-sm font-black text-white/80 uppercase tracking-wider mb-3">About The Store</h3>
                  <p className="text-gray-400 text-sm mb-4">{store?.description || 'Global marketplace store.'}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Total Orders</span><span className="text-white font-semibold">{store?.metrics?.totalOrders || '12.6K'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Items Sold</span><span className="text-white font-semibold">{store?.metrics?.itemsSold || '28.2K'}</span></div>
                  </div>
                  <button onClick={() => setActiveTab('about')} className="mt-4 text-xs text-blue-400 font-semibold hover:underline">Learn More →</button>
                </div>

                {/* Contact Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: MessageCircle, label: 'Chat Now', action: () => {} },
                    { icon: Phone, label: 'Call', action: () => brandConfig?.contactNumber && (window.location.href = `tel:${brandConfig.contactNumber}`) },
                    { icon: () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.18-.01-.373-.012-.57-.012-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>, label: 'WhatsApp', action: () => brandConfig?.whatsappNumber && window.open(`https://wa.me/${brandConfig.whatsappNumber}`, '_blank') },
                    { icon: Share2, label: 'Share', action: () => navigator.share?.({ title: store?.storeName, url: window.location.href }) },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} className="flex flex-col items-center gap-1 bg-[#111] hover:bg-white/5 rounded-xl p-3 border border-white/5 transition">
                      <Icon size={20} className="text-gray-400"/>
                      <span className="text-[11px] sm:text-xs text-gray-500">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Featured Product */}
              <div className="lg:col-span-2">
                {products[0] && (
                  <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden h-full flex flex-col justify-between p-4 sm:p-6">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Featured Product</div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:p-5 items-center">
                      <div className="w-full sm:w-56 h-56 rounded-xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                        <img src={products[0].images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-white mb-2">{products[0].title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#fbbf24" className="text-yellow-400"/>)}
                          </div>
                          <span className="text-xs text-gray-500">4.9 (1.2k reviews)</span>
                        </div>
                        <p className="text-3xl font-black text-white mb-3">₦{Number(products[0].price||0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500 mb-4">{products[0].description?.slice(0,100) || 'Premium quality product.'}</p>
                        <button onClick={(e) => handleAddToCart(e, products[0].id)}
                          className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition">
                          View Details <ChevronRight size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white">Top Categories</h2>
                <button className="text-sm text-blue-400 font-semibold hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {CATEGORIES.filter(c => c !== 'All Products').map(cat => (
                  <button key={cat} onClick={() => { setActiveCat(cat); setActiveTab('products'); }}
                    className="bg-[#111] rounded-xl p-3 border border-white/5 hover:border-white/20 transition group text-center">
                    <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl mx-auto mb-2 flex items-center justify-center">
                      <Package size={20} className="text-gray-400 group-hover:text-blue-400 transition"/>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 group-hover:text-white transition">{cat}</p>
                    <p className="text-[11px] sm:text-xs text-gray-600">{products.filter(p => p.category?.toLowerCase().includes(cat.toLowerCase())).length}+ items</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <div className="flex flex-col lg:flex-row gap-3 sm:p-5">
            {/* Sidebar */}
            <div className="lg:w-48 flex-shrink-0">
              <div className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-4 sticky top-3 sm:p-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setActiveCat(cat); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex justify-between items-center ${activeCat===cat ? 'bg-white/10 text-white font-semibold' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                      <span>{cat}</span>
                      <span className="text-xs text-gray-600">{cat === 'All Products' ? products.length : products.filter(p => p.category?.toLowerCase().includes(cat.toLowerCase())).length}</span>
                    </button>
                  ))}
                </div>

                {/* Price Range */}
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mt-5 mb-3">Price Range</h3>
                <input type="range" min={0} max={5000000} value={priceRange}
                  onChange={e => { setPriceRange(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full accent-blue-500"/>
                <div className="flex justify-between text-[11px] sm:text-[11px] sm:text-xs text-gray-500 mt-1">
                  <span>₦0</span><span>₦{(priceRange/1000).toFixed(0)}k</span>
                </div>
                <button onClick={() => { setActiveCat('All Products'); setPriceRange(5000000); }}
                  className="w-full mt-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                  Apply Filter
                </button>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row gap-3 mb-5 items-center">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                  <input type="text" placeholder="Search products..." value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#111] border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-white/30 placeholder-gray-600"/>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="px-3 py-2.5 bg-[#111] border border-white/10 text-gray-400 rounded-xl text-sm flex items-center gap-1 hover:border-white/30 transition"><Filter size={14}/>Filter</button>
                  <button className="px-3 py-2.5 bg-[#111] border border-white/10 text-gray-400 rounded-xl text-sm flex items-center gap-1 hover:border-white/30 transition"><SortAsc size={14}/>Sort</button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">All Products ({filtered.length})</p>

              {paginatedProducts.length === 0 ? (
                <div className="py-20 text-center text-gray-600"><Package size={48} className="mx-auto mb-4 opacity-30"/><p>No products found.</p></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                  {paginatedProducts.map(p => <DarkProductCard key={p.id} product={p} onAddToCart={handleAddToCart}/>)}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}
                    className="p-2 rounded-lg bg-[#111] border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/30 transition"><ChevronLeft size={16}/></button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition ${currentPage===page ? 'bg-white text-black' : 'bg-[#111] border border-white/10 text-gray-400 hover:border-white/30'}`}>
                        {page}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-gray-600 text-sm">... {totalPages}</span>}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}
                    className="p-2 rounded-lg bg-[#111] border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/30 transition"><ChevronRight size={16}/></button>
                </div>
              )}

              {/* Promo Banner */}
              <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/5 p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black text-lg">Big Savings on Top Brands</h3>
                  <p className="text-gray-400 text-sm">Up to 30% off on selected items</p>
                </div>
                <button className="px-5 py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition">Shop Now</button>
              </div>
            </div>
          </div>
        )}

        {/* ── COLLECTIONS TAB ── */}
        {activeTab === 'collections' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-5">
            {CATEGORIES.filter(c => c !== 'All Products').map(cat => {
              const catProducts = products.filter(p => p.category?.toLowerCase().includes(cat.toLowerCase()));
              return (
                <button key={cat} onClick={() => { setActiveCat(cat); setActiveTab('products'); }}
                  className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/15 transition-all group text-left">
                  <div className="h-36 bg-[#1a1a1a] relative overflow-hidden">
                    {catProducts[0]?.images?.[0]?.url && (
                      <img src={catProducts[0].images[0].url} alt={cat} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"/>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white drop-shadow">{cat}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex justify-between items-center">
                    <span className="text-sm text-gray-400">{catProducts.length} items</span>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition"/>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-[#111] rounded-2xl border border-white/5 p-4 sm:p-6 flex items-center gap-4 sm:p-6">
              <div className="text-center">
                <div className="text-5xl font-black text-white">{store?.averageRating || '4.9'}</div>
                <div className="flex justify-center mt-1">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#fbbf24" className="text-yellow-400"/>)}
                </div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{store?.totalReviews || 0} reviews</div>
              </div>
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(n => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3">{n}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{width: `${n===5?75:n===4?15:5}%`}}/>
                    </div>
                    <span className="text-xs text-gray-600 w-8">{n===5?'75%':n===4?'15%':'5%'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center py-12 text-gray-600">
              <Star size={40} className="mx-auto mb-3 opacity-20"/>
              <p className="text-sm">Reviews will appear here once customers review this store.</p>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 max-w-4xl">
            {/* Left */}
            <div className="space-y-5">
              <div className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5 flex gap-3 sm:p-4">
                <div className="flex-1">
                  <h2 className="text-lg font-black text-white mb-2">About {store?.storeName?.toUpperCase()}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{store?.description || 'We are committed to providing the best quality products, unbeatable prices, and exceptional customer service.'}</p>
                </div>
                {store?.bannerUrl && (
                  <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
                    <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Years in Business', value: '2+' },
                  { label: 'Happy Customers', value: '50K+' },
                  { label: 'Satisfaction', value: '100%' },
                  { label: 'Based in', value: store?.country || 'Nigeria' },
                ].map(s => (
                  <div key={s.label} className="bg-[#111] rounded-xl p-3 border border-white/5 text-center">
                    <div className="text-xl font-black text-white">{s.value}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5">
                <h3 className="font-black text-white mb-2">Our Story</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{store?.description || 'Founded with a simple mission: to bring premium quality products closer to everyone. We believe in trust, quality, and long-term relationships.'}</p>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-5">
              {/* Verified & Trusted */}
              <div className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5">
                <h3 className="font-black text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400"/> Verified &amp; Trusted
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'CAC Registered', sub: 'RC: 1234567890', icon: Shield },
                    { label: 'Verified Seller', sub: 'W-Commerce Verified', icon: ShieldCheck },
                    { label: 'Secure Payments', sub: 'Paystack Protected', icon: CheckCircle },
                  ].map(({ label, sub, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <Icon size={16} className="text-blue-400 flex-shrink-0"/>
                      <div>
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {[
                  { icon: Star, label: 'Positive Reviews', value: store?.metrics?.rating ? `${Math.round((store.metrics.rating/5)*100)}%` : '0%' },
                  { icon: Clock, label: 'Avg. Response', value: '2 mins' },
                  { icon: MessageCircle, label: 'Customer Support', value: '24/7' },
                  { icon: Package, label: 'Easy Returns', value: '7 Days' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-[#111] rounded-xl p-3 border border-white/5 text-center">
                    <Icon size={18} className="mx-auto mb-1.5 text-gray-500"/>
                    <div className="text-base font-black text-white">{value}</div>
                    <div className="text-[11px] sm:text-xs text-gray-600 mt-0.5">{label}</div>
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

export default ProPortfolio;
