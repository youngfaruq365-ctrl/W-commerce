import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Star, MapPin, Package, ShoppingBag, MessageCircle,
  Phone, Share2, Search, Filter, SortAsc, ChevronRight, ChevronLeft,
  Zap, Clock, Users, CheckCircle, Shield, Crown, Sparkles,
  ArrowRight, Mail, Bell
} from 'lucide-react';

/* ─── fade/slide variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Premium Banner ─── */
const PremiumBanner = ({ store, isFollowing, followersCount, onFollow }) => (
  <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
    className="relative w-full h-52 md:h-60 rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-950 via-purple-950 to-zinc-950 shadow-2xl">
    <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 500 240" preserveAspectRatio="none">
      <path d="M0,140 C80,50 190,200 300,105 C400,20 440,170 500,90 L500,240 L0,240 Z" fill="#7c3aed" fillOpacity="0.6"/>
      <path d="M0,175 C110,110 215,195 340,145 C445,100 468,170 500,130 L500,240 L0,240 Z" fill="#7c3aed" fillOpacity="0.3"/>
      <path d="M0,200 C130,155 230,210 360,170 C460,135 480,195 500,165 L500,240 L0,240 Z" fill="#6d28d9" fillOpacity="0.2"/>
    </svg>
    {/* Glowing orbs */}
    <div className="absolute top-3 sm:p-4 right-24 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl"/>
    <div className="absolute bottom-0 left-1/3 w-48 h-24 bg-violet-500/10 rounded-full blur-3xl"/>
    {store?.bannerUrl && (
      <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-15"/>
    )}
    <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-10">
      <div className="w-24 h-24 rounded-2xl border-2 border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-2xl overflow-hidden ring-2 ring-purple-500/30">
        {store?.logoUrl
          ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
          : <span className="text-3xl font-black text-white">{store?.storeName?.charAt(0) || 'S'}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate drop-shadow-lg">{store?.storeName || 'Store'}</h1>
          {store?.isVerified && <ShieldCheck size={18} className="text-purple-400 flex-shrink-0"/>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-600/70 text-purple-100 backdrop-blur border border-purple-500/20">
            <Crown size={11}/> Ultra Store
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600/30 text-green-300 backdrop-blur border border-green-500/20">
            <ShieldCheck size={10}/> Verified Seller
          </span>
          <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
            <Star size={12} fill="currentColor"/> {store?.averageRating||'4.9'} ({store?.totalReviews||'3.2'}k)
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
          <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Nigeria'}</span>
          <span className="font-semibold text-white/80">{(followersCount||0).toLocaleString()} Followers</span>
          <span className="flex items-center gap-1"><Clock size={11}/> Response in 2 mins</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={onFollow}
          className={`px-5 py-2 rounded-full text-sm font-bold shadow-xl ${isFollowing ? 'bg-white/15 text-white border border-white/30' : 'bg-purple-500 text-white hover:bg-purple-400'}`}>
          {isFollowing ? '✓ Following' : '♡ Follow Store'}
        </motion.button>
        <button onClick={() => navigator.share?.({ title:store?.storeName, url:window.location.href })}
          className="px-5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition flex items-center gap-1 justify-center">
          <Share2 size={11}/> Share Store
        </button>
      </div>
    </div>
  </motion.div>
);

/* ─── Countdown ─── */
const useCountdown = (h=2,m=24,s=31) => {
  const [t,setT] = useState({h,m,s});
  useEffect(() => {
    const id = setInterval(() => {
      setT(prev => {
        if (prev.s > 0) return {...prev, s: prev.s-1};
        if (prev.m > 0) return {...prev, m: prev.m-1, s: 59};
        if (prev.h > 0) return {h: prev.h-1, m: 59, s: 59};
        return {h:0,m:0,s:0};
      });
    }, 1000);
    return () => clearInterval(id);
  },[]);
  return t;
};

/* ─── Product Card ─── */
const ProductCard = ({ product, onAddToCart, index = 0 }) => (
  <motion.div variants={fadeUp} custom={index}
    className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all duration-300 group flex flex-col">
    <div className="aspect-square bg-[#1a1a1a] overflow-hidden relative">
      <img src={product.images?.[0]?.url || PLACEHOLDER_IMAGE} alt={product.title}
        onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
      <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}}
        onClick={(e) => onAddToCart(e, product.id)}
        className="absolute bottom-3 right-3 w-9 h-9 bg-purple-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg font-black text-lg">
        +
      </motion.button>
    </div>
    <div className="p-3 flex flex-col flex-1">
      <p className="text-sm font-semibold text-white/90 line-clamp-2 mb-1">{product.title}</p>
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <Star size={10} fill="#fbbf24" className="text-yellow-400"/>
        {product.averageRating||'4.9'}
      </div>
      <p className="text-base font-black text-purple-300 mt-auto">₦{Number(product.price||0).toLocaleString()}</p>
    </div>
  </motion.div>
);

const CATS = ['All','Phones','Accessories','Laptops','Wearables','Audio','Gaming'];

/* ─── ULTRA PORTFOLIO ─── */
const UltraPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState('');
  const PER_PAGE = 8;
  const time = useCountdown();
  const products = store?.products || [];
  const filtered = products.filter(p => {
    const s = p.title?.toLowerCase().includes(search.toLowerCase());
    const c = cat === 'All' || p.category?.toLowerCase().includes(cat.toLowerCase());
    return s && c;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const TABS = [
    { id:'home', label:'Home' },
    { id:'products', label:'Products' },
    { id:'about', label:'About' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080808] text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <PremiumBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow}/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <nav className="flex overflow-x-auto gap-1 border-b border-white/10 scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0 ${activeTab===t.id ? 'border-purple-500 text-purple-300 bg-purple-500/5 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* ─── HOME ─── */}
        {activeTab === 'home' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            {/* Stats Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
              {[
                { label:'Followers', value:(followersCount||2300).toLocaleString() },
                { label:'Products', value: products.length || '1.2K' },
                { label:'Positive Reviews', value: store?.metrics?.rating ? `${Math.round((store.metrics.rating/5)*100)}%` : '0%' },
                { label:'Response Time', value:'2 mins' },
              ].map(s => (
                <div key={s.label} className="bg-[#111] rounded-2xl p-3 sm:p-4 border border-white/5 text-center hover:border-purple-500/20 transition">
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:p-5">
              {/* Left Panel */}
              <div className="lg:col-span-1 space-y-4">
                {/* Flash Sale */}
                <motion.div variants={fadeUp} className="bg-[#111] rounded-2xl p-3 sm:p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-yellow-400"/>
                    <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">Flash Sale</span>
                    <span className="text-xs text-gray-600 ml-auto">Premium products at unbeatable prices</span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[{l:'Hrs',v:time.h},{l:'Mins',v:time.m},{l:'Secs',v:time.s}].map(t => (
                      <div key={t.l} className="text-center flex-1">
                        <motion.div key={t.v} initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}}
                          className="bg-black text-white text-xl font-black h-12 flex items-center justify-center rounded-xl border border-white/10">
                          {String(t.v).padStart(2,'0')}
                        </motion.div>
                        <div className="text-[11px] sm:text-xs text-gray-600 mt-0.5">{t.l}</div>
                      </div>
                    ))}
                    <div className="self-start mt-1 flex-shrink-0">
                      <button className="w-8 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition">
                        <ChevronRight size={14} className="text-gray-500"/>
                      </button>
                    </div>
                  </div>
                  {products[0] && (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                        <img src={products[0].images?.[0]?.url||PLACEHOLDER_IMAGE} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold line-clamp-1">{products[0].title}</p>
                        <p className="text-purple-300 font-black">₦{Number(products[0].price||0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* About snippet */}
                <motion.div variants={fadeUp} className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-4">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">About The Store</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-3">{store?.description || 'Global marketplace redefined.'}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {[
                      ['Years in Business','2+'],
                      ['Happy Customers','50K+'],
                      ['Store Satisfaction','100%'],
                      ['Based in', store?.country||'Nigeria'],
                    ].map(([label,val]) => (
                      <div key={label}>
                        <div className="text-gray-600">{label}</div>
                        <div className="text-white font-bold">{val}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('about')} className="text-xs text-purple-400 font-semibold hover:underline">Learn More →</button>
                </motion.div>

                {/* Trust badges */}
                <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
                  {[
                    '✅ 100% Authentic — Original products',
                    '🔒 Secure Payments — Safe & protected',
                    '🚀 Fast Delivery — Across Nigeria',
                    '💬 24/7 Support — Here to help',
                  ].map(b => (
                    <div key={b} className="bg-[#111] rounded-xl p-2.5 border border-white/5 text-[11px] sm:text-xs text-gray-500 leading-tight">{b}</div>
                  ))}
                </motion.div>

                {/* Contact */}
                <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
                  {[
                    { label:'Chat Now', icon: MessageCircle },
                    { label:'Call', icon: Phone },
                    { label:'WhatsApp', icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.18-.01-.373-.012-.57-.012-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
                  ].map(({ label, icon: Icon }) => (
                    <button key={label} className="flex flex-col items-center gap-1 bg-[#111] hover:bg-purple-900/20 rounded-xl p-3 border border-white/5 hover:border-purple-500/20 transition">
                      <Icon size={18} className="text-gray-400"/>
                      <span className="text-[11px] sm:text-xs text-gray-600">{label}</span>
                    </button>
                  ))}
                </motion.div>
              </div>

              {/* Right: Featured product large */}
              <motion.div variants={fadeUp} className="lg:col-span-2">
                {products[0] ? (
                  <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden h-full flex flex-col p-4 sm:p-6">
                    <div className="text-xs text-gray-600 uppercase tracking-wider font-black mb-3 flex items-center gap-2">
                      <Sparkles size={12} className="text-purple-400"/> Featured Product
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:p-5 items-center flex-1">
                      <div className="w-full sm:w-60 h-60 rounded-2xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5 shadow-2xl">
                        <img src={products[0].images?.[0]?.url||PLACEHOLDER_IMAGE} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-2">{products[0].title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">{[1,2,3,4,5].map(i=><Star key={i} size={12} fill="#fbbf24" className="text-yellow-400"/>)}</div>
                          <span className="text-xs text-gray-500">4.9 (1.2k reviews)</span>
                        </div>
                        <p className="text-4xl font-black text-white mb-2">₦{Number(products[0].price||0).toLocaleString()}</p>
                        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{products[0].description?.slice(0,120) || 'Premium quality. Limited stock available.'}</p>
                        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                          onClick={(e) => handleAddToCart(e, products[0].id)}
                          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-purple-500/20">
                          View Details <ArrowRight size={16}/>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111] rounded-2xl border border-white/5 h-full flex items-center justify-center">
                    <div className="text-center text-gray-700">
                      <Package size={48} className="mx-auto mb-3 opacity-30"/>
                      <p>No featured product yet</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Newsletter */}
            <motion.div variants={fadeUp} className="bg-gradient-to-r from-purple-900/30 via-violet-900/30 to-purple-900/30 rounded-2xl border border-purple-500/20 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:p-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white mb-1">Get Exclusive Offers &amp; Updates</h3>
                  <p className="text-sm text-gray-400">Subscribe to our newsletter for exclusive deals</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="email" placeholder="Enter your email address" value={email} onChange={e=>setEmail(e.target.value)}
                    className="flex-1 sm:w-64 bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"/>
                  <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                    className="px-5 py-2.5 bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center gap-1 hover:bg-purple-400 transition">
                    <ArrowRight size={16}/>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── PRODUCTS ─── */}
        {activeTab === 'products' && (
          <div>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
              {CATS.map(c => (
                <button key={c} onClick={() => { setCat(c); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${cat===c ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-[#111] text-gray-500 border border-white/10 hover:border-purple-500/30 hover:text-gray-300'}`}>
                  {c}
                </button>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input type="text" placeholder="Search products..." value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#111] border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-purple-500/30 placeholder-gray-600"/>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2.5 bg-[#111] border border-white/10 text-gray-400 rounded-xl text-sm flex items-center gap-1 hover:border-purple-500/30 transition"><Filter size={14}/>Filters</button>
                <button className="px-3 py-2.5 bg-[#111] border border-white/10 text-gray-400 rounded-xl text-sm flex items-center gap-1 hover:border-purple-500/30 transition"><SortAsc size={14}/>Sort</button>
              </div>
            </div>

            {paginated.length === 0 ? (
              <div className="py-20 text-center text-gray-600"><Package size={48} className="mx-auto mb-4 opacity-20"/><p>No products found.</p></div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {paginated.map((p,i) => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} index={i}/>)}
              </motion.div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="p-2 rounded-xl bg-[#111] border border-white/10 text-gray-400 disabled:opacity-30 hover:border-purple-500/30 transition"><ChevronLeft size={16}/></button>
                {[...Array(Math.min(totalPages,5))].map((_,i) => (
                  <button key={i+1} onClick={() => setPage(i+1)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition ${page===i+1 ? 'bg-purple-500 text-white' : 'bg-[#111] border border-white/10 text-gray-400 hover:border-purple-500/30'}`}>
                    {i+1}
                  </button>
                ))}
                {totalPages > 5 && <span className="text-gray-600 text-sm">... {totalPages}</span>}
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="p-2 rounded-xl bg-[#111] border border-white/10 text-gray-400 disabled:opacity-30 hover:border-purple-500/30 transition"><ChevronRight size={16}/></button>
              </div>
            )}

            {/* Promo Banner */}
            <div className="mt-8 rounded-2xl bg-gradient-to-r from-purple-900/30 to-violet-900/30 border border-purple-500/20 p-4 sm:p-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-lg">Big Savings on Top Brands</h3>
                <p className="text-gray-500 text-sm">Up to 30% off on selected items</p>
              </div>
              <button className="px-5 py-2.5 bg-purple-500 text-white font-bold rounded-xl text-sm hover:bg-purple-400 transition flex items-center gap-2">
                Shop Now <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ─── ABOUT ─── */}
        {activeTab === 'about' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 max-w-5xl">
            <div className="space-y-5">
              <motion.div variants={fadeUp} className="bg-[#111] rounded-2xl border border-white/5 p-4 sm:p-6 flex gap-3 sm:p-5">
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white mb-2">About {store?.storeName?.toUpperCase()}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{store?.description || 'Premium Quality • Trust • Innovation. We are committed to providing the best quality products, unbeatable prices, and exceptional customer service.'}</p>
                </div>
                <div className="w-32 h-32 rounded-2xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5 flex items-center justify-center">
                  {store?.bannerUrl
                    ? <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                    : <div className="text-center"><p className="text-lg font-black text-white">{store?.storeName?.toUpperCase()?.replace(/ /g,'\n')}</p></div>
                  }
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
                {[
                  ['Years in Business','2+'],
                  ['Happy Customers','50K+'],
                  ['Satisfaction','100%'],
                  ['Based in', store?.country||'Nigeria'],
                ].map(([label,val]) => (
                  <div key={label} className="bg-[#111] rounded-xl p-3 sm:p-4 border border-white/5 text-center hover:border-purple-500/20 transition">
                    <div className="text-xl font-black text-white">{val}</div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5">
                <h3 className="font-black text-white mb-2">Our Story</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{store?.description || 'Allexs-Store was founded with a simple mission: to bring premium quality tech products closer to everyone in Nigeria. We believe in trust, quality, and long-term relationships.'}</p>
              </motion.div>
            </div>

            <div className="space-y-5">
              <motion.div variants={fadeUp} className="bg-[#111] rounded-2xl border border-white/5 p-3 sm:p-5">
                <h3 className="font-black text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={16} className="text-purple-400"/> Verified &amp; Trusted
                </h3>
                <div className="space-y-3">
                  {[
                    { label:'CAC Registered', sub:'RC: 1234567890', icon: Shield },
                    { label:'Verified Seller', sub:'W-Commerce Verified', icon: ShieldCheck },
                    { label:'Secure Payments', sub:'Paystack Protected', icon: CheckCircle },
                  ].map(({ label, sub, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                      <Icon size={16} className="text-purple-400 flex-shrink-0"/>
                      <div>
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {[
                  { icon: Star, label:'Positive Reviews', val:'98%' },
                  { icon: Clock, label:'Avg. Response', val:'2 mins' },
                  { icon: MessageCircle, label:'Customer Support', val:'24/7' },
                  { icon: Package, label:'Easy Returns', val:'7 Days' },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="bg-[#111] rounded-xl p-3 border border-white/5 text-center hover:border-purple-500/20 transition">
                    <Icon size={18} className="mx-auto mb-1.5 text-purple-400"/>
                    <div className="text-sm font-black text-white">{val}</div>
                    <div className="text-[11px] sm:text-xs text-gray-600 mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default UltraPortfolio;
