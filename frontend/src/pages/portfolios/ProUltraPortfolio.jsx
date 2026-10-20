import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ShieldCheck, Star, MapPin, Package, ShoppingBag, MessageCircle,
  Phone, Share2, Search, Filter, ChevronRight, ChevronLeft,
  Zap, Clock, CheckCircle, Shield, Crown, Sparkles, ArrowRight,
  BookmarkPlus, TrendingUp, Award, Grid2x2, LayoutList, Heart
} from 'lucide-react';

/* ─── Animation Variants ─── */
const fadeUp = { hidden:{opacity:0,y:24}, visible:{opacity:1,y:0,transition:{duration:0.55,ease:[0.22,1,0.36,1]}} };
const scaleIn = { hidden:{opacity:0,scale:0.92}, visible:{opacity:1,scale:1,transition:{duration:0.5,ease:[0.22,1,0.36,1]}} };
const stagger = { visible:{ transition:{ staggerChildren:0.07 } } };

/* ─── Counter Animation ─── */
const AnimatedStat = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const num = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = num / 40;
    const t = setInterval(() => {
      start = Math.min(start + step, num);
      setCount(Math.floor(start));
      if (start >= num) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [inView, num]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─── Premium Banner ─── */
const PremiumBanner = ({ store, isFollowing, followersCount, onFollow }) => (
  <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:[0.22,1,0.36,1]}}
    className="relative w-full h-52 md:h-64 rounded-3xl overflow-hidden shadow-2xl" style={{background:'linear-gradient(135deg,#0f0500 0%,#1a0a00 30%,#0f0500 60%,#0a0000 100%)'}}>
    {/* Animated gold wave */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 256" preserveAspectRatio="none">
      <path d="M0,140 C80,50 185,210 300,110 C400,20 445,170 500,85 L500,256 L0,256 Z" fill="#b8860b" fillOpacity="0.55"/>
      <path d="M0,175 C105,105 215,195 340,145 C445,100 468,165 500,125 L500,256 L0,256 Z" fill="#d4a017" fillOpacity="0.3"/>
      <path d="M0,205 C130,160 235,215 360,175 C460,140 480,200 500,170 L500,256 L0,256 Z" fill="#ffd700" fillOpacity="0.1"/>
    </svg>
    {/* Glowing orbs */}
    <div className="absolute top-3 sm:p-4 right-36 w-40 h-40 bg-yellow-600/15 rounded-full blur-3xl pointer-events-none"/>
    <div className="absolute bottom-0 left-1/4 w-56 h-24 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"/>
    {store?.bannerUrl && (
      <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-15"/>
    )}
    {/* Particles */}
    {[...Array(8)].map((_,i) => (
      <motion.div key={i}
        animate={{ y:[0,-8,0], opacity:[0.3,0.7,0.3] }}
        transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
        className="absolute w-1 h-1 rounded-full bg-yellow-400"
        style={{ left:`${10+i*12}%`, top:`${20+Math.sin(i)*40}%` }}/>
    ))}
    {/* Content */}
    <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-10">
      <div className="relative flex-shrink-0">
        <div className="w-24 h-24 rounded-2xl border-2 border-yellow-500/30 bg-black/50 backdrop-blur-md overflow-hidden shadow-2xl ring-2 ring-yellow-600/20">
          {store?.logoUrl
            ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
            : <span className="w-full h-full flex items-center justify-center text-3xl font-black text-yellow-400">{store?.storeName?.charAt(0)||'S'}</span>
          }
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
          <Crown size={14} className="text-black"/>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-4xl font-black text-white truncate drop-shadow-xl">{store?.storeName||'Store Name'}</h1>
          {store?.isVerified && <ShieldCheck size={20} className="text-yellow-400 flex-shrink-0"/>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-yellow-700/70 to-amber-700/70 text-yellow-200 backdrop-blur border border-yellow-600/20">
            <Crown size={11}/> Pro Ultra Store
          </span>
          <span className="inline-flex items-center gap-1 text-yellow-400 text-sm font-bold">
            <Star size={12} fill="currentColor"/> {store?.averageRating||'4.9'} ({store?.totalReviews||'3.2'}k)
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-white/50 text-xs">
          <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Nigeria'}</span>
          <span className="font-bold text-white/70">{(followersCount||0).toLocaleString()} Followers</span>
          <span className="flex items-center gap-1"><Clock size={11}/> 2 min response</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <motion.button whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onFollow}
          className={`px-5 py-2.5 rounded-full text-sm font-black shadow-xl transition ${isFollowing ? 'bg-white/15 text-white border border-white/30' : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400 shadow-yellow-500/20'}`}>
          {isFollowing ? '✓ Following' : '♡ Follow Store'}
        </motion.button>
        <button onClick={()=>navigator.share?.({title:store?.storeName,url:window.location.href})}
          className="px-5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition flex items-center gap-1 justify-center">
          <Share2 size={11}/> Share Store
        </button>
      </div>
    </div>
  </motion.div>
);

/* ─── Countdown ─── */
const useCountdown = (h=1,m=48,s=22) => {
  const [t,setT] = useState({h,m,s});
  useEffect(()=>{
    const id = setInterval(()=>{
      setT(prev=>{
        if(prev.s>0) return {...prev,s:prev.s-1};
        if(prev.m>0) return {...prev,m:prev.m-1,s:59};
        if(prev.h>0) return {h:prev.h-1,m:59,s:59};
        return {h:0,m:0,s:0};
      });
    },1000);
    return ()=>clearInterval(id);
  },[]);
  return t;
};

/* ─── Product Card Gold ─── */
const GoldProductCard = ({ product, onAddToCart, i=0 }) => {
  const [liked, setLiked] = useState(false);
  return (
    <motion.div variants={fadeUp} custom={i}
      className="bg-[#0f0a00] rounded-2xl border border-yellow-900/20 overflow-hidden hover:border-yellow-600/30 transition-all duration-300 group flex flex-col shadow-lg hover:shadow-yellow-900/20 hover:shadow-xl">
      <div className="aspect-square bg-[#1a1000] overflow-hidden relative">
        <img src={product.images?.[0]?.url||PLACEHOLDER_IMAGE} alt={product.title}
          onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
        <button onClick={()=>setLiked(v=>!v)}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${liked?'bg-red-500 text-white':'bg-black/40 text-white/50 hover:bg-black/60'}`}>
          <Heart size={14} fill={liked?'white':'none'}/>
        </button>
        <motion.button whileTap={{scale:0.9}} onClick={(e)=>onAddToCart(e,product.id)}
          className="absolute bottom-2 right-2 w-9 h-9 bg-gradient-to-br from-yellow-500 to-amber-600 text-black rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg font-black text-lg">
          +
        </motion.button>
        {product.isFlashSale && <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">SALE</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold text-white/90 line-clamp-2 mb-1">{product.title}</p>
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <Star size={10} fill="#fbbf24" className="text-yellow-500"/> {product.averageRating||'4.9'}
        </div>
        <p className="text-base font-black text-yellow-400 mt-auto">₦{Number(product.price||0).toLocaleString()}</p>
      </div>
    </motion.div>
  );
};

const CATS = ['All','Phones','Accessories','Laptops','Wearables','Audio','Gaming'];

/* ═══ PRO ULTRA PORTFOLIO ═══ */
const ProUltraPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [tab, setTab] = useState('home');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const time = useCountdown();
  const PER = 8;

  const products = store?.products || [];
  const filtered = products.filter(p => {
    const s = p.title?.toLowerCase().includes(search.toLowerCase());
    const c = cat==='All'||p.category?.toLowerCase().includes(cat.toLowerCase());
    return s && c;
  });
  const total = Math.max(1, Math.ceil(filtered.length/PER));
  const paged = filtered.slice((page-1)*PER, page*PER);

  const TABS = [
    {id:'home',label:'Home'},
    {id:'products',label:'Products'},
    {id:'collections',label:'Collections'},
    {id:'reviews',label:'Reviews'},
    {id:'about',label:'About Store'},
  ];

  return (
    <div className="min-h-screen font-sans" style={{background:'#060300',color:'white'}}>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <PremiumBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow}/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <nav className="flex overflow-x-auto gap-1 border-b border-yellow-900/30 scrollbar-hide">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0 ${tab===t.id?'border-yellow-500 text-yellow-400 bg-yellow-500/5 rounded-t-lg':'border-transparent text-gray-600 hover:text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">

        {/* ─── HOME ─── */}
        {tab==='home' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
              {[
                {label:'Followers', value:followersCount||2300, suffix:''},
                {label:'Products', value:products.length||1200, suffix:''},
                {label:'Positive Reviews', value: store?.metrics?.rating ? Math.round((store.metrics.rating/5)*100) : 0, suffix:'%'},
                {label:'Response Time', value:'2 mins'},
              ].map(s=>(
                <div key={s.label} className="rounded-2xl p-3 sm:p-4 border border-yellow-900/20 text-center hover:border-yellow-600/30 transition" style={{background:'#0f0a00'}}>
                  <div className="text-2xl font-black text-white">
                    {typeof s.value==='number' ? <AnimatedStat value={s.value} suffix={s.suffix||''}/> : s.value}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:p-5">
              {/* Left sidebar */}
              <div className="lg:col-span-1 space-y-4">
                {/* Flash Sale */}
                <motion.div variants={fadeUp} className="rounded-2xl p-3 sm:p-4 border border-yellow-900/20" style={{background:'#0f0a00'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-yellow-500"/>
                    <span className="text-xs font-black text-yellow-500 uppercase tracking-wider">Flash Sale</span>
                    <span className="text-xs text-gray-600 ml-auto">Ends soon!</span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[{l:'Hrs',v:time.h},{l:'Mins',v:time.m},{l:'Secs',v:time.s}].map(t=>(
                      <div key={t.l} className="flex-1 text-center">
                        <motion.div key={t.v} initial={{rotateX:-90}} animate={{rotateX:0}} transition={{duration:0.3}}
                          className="text-xl font-black h-11 flex items-center justify-center rounded-xl border border-yellow-900/30 text-yellow-400" style={{background:'#1a1000'}}>
                          {String(t.v).padStart(2,'0')}
                        </motion.div>
                        <div className="text-[11px] sm:text-xs text-gray-600 mt-0.5">{t.l}</div>
                      </div>
                    ))}
                  </div>
                  {products[0] && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-900/20" style={{background:'#1a1000'}}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={products[0].images?.[0]?.url||PLACEHOLDER_IMAGE} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold line-clamp-1">{products[0].title}</p>
                        <p className="text-yellow-400 font-black text-sm">₦{Number(products[0].price||0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* About */}
                <motion.div variants={fadeUp} className="rounded-2xl border border-yellow-900/20 p-3 sm:p-4" style={{background:'#0f0a00'}}>
                  <h3 className="text-xs font-black text-yellow-600/70 uppercase tracking-wider mb-2">About The Store</h3>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-3">{store?.description||'Global marketplace redefined.'}</p>
                  <div className="space-y-1.5 text-xs mb-3">
                    {[['Total Orders',store?.metrics?.totalOrders||'12.6K'],['Items Sold',store?.metrics?.itemsSold||'28.2K']].map(([k,v])=>(
                      <div key={k} className="flex justify-between border-b border-yellow-900/20 pb-1">
                        <span className="text-gray-600">{k}</span><span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setTab('about')} className="text-xs text-yellow-500 font-semibold hover:underline">Learn More →</button>
                </motion.div>

                {/* Contact */}
                <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
                  {[
                    {label:'Chat',icon:MessageCircle},
                    {label:'Call',icon:Phone},
                    {label:'Share',icon:Share2},
                    {label:'Save',icon:BookmarkPlus},
                  ].map(({label,icon:Icon})=>(
                    <button key={label} className="flex flex-col items-center gap-1 rounded-xl p-3 border border-yellow-900/20 hover:border-yellow-600/30 transition" style={{background:'#0f0a00'}}>
                      <Icon size={18} className="text-gray-500"/>
                      <span className="text-[11px] sm:text-xs text-gray-600">{label}</span>
                    </button>
                  ))}
                </motion.div>

                {/* Trust */}
                <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
                  {['✅ Original Products','🔒 Secure Payments','🚀 Fast Delivery','💬 24/7 Support'].map(b=>(
                    <div key={b} className="rounded-xl p-2.5 border border-yellow-900/20 text-[11px] sm:text-xs text-gray-600" style={{background:'#0f0a00'}}>{b}</div>
                  ))}
                </motion.div>
              </div>

              {/* Right: Featured Product */}
              <motion.div variants={scaleIn} className="lg:col-span-2">
                {products[0] ? (
                  <div className="rounded-2xl border border-yellow-900/20 overflow-hidden h-full flex flex-col p-4 sm:p-6" style={{background:'#0f0a00'}}>
                    <div className="text-xs text-yellow-700 uppercase tracking-wider font-black mb-3 flex items-center gap-2">
                      <TrendingUp size={12} className="text-yellow-600"/> Featured Product
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:p-5 items-center flex-1">
                      <div className="w-full sm:w-60 h-60 rounded-2xl overflow-hidden flex-shrink-0 border border-yellow-900/20 shadow-2xl" style={{background:'#1a1000'}}>
                        <img src={products[0].images?.[0]?.url||PLACEHOLDER_IMAGE} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-2">{products[0].title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">{[1,2,3,4,5].map(i=><Star key={i} size={12} fill="#fbbf24" className="text-yellow-500"/>)}</div>
                          <span className="text-xs text-gray-600">4.9 (1.2k reviews)</span>
                        </div>
                        <p className="text-4xl font-black text-yellow-400 mb-2">₦{Number(products[0].price||0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500 mb-5 leading-relaxed">{products[0].description?.slice(0,120)||'Premium quality product.'}</p>
                        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                          onClick={(e)=>handleAddToCart(e,products[0].id)}
                          className="flex items-center gap-2 font-black px-6 py-3 rounded-xl transition shadow-lg text-black"
                          style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
                          View Details <ArrowRight size={16}/>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-yellow-900/20 h-full flex items-center justify-center" style={{background:'#0f0a00'}}>
                    <div className="text-center text-gray-700"><Package size={48} className="mx-auto mb-3 opacity-30"/><p>No featured product yet</p></div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Categories */}
            <motion.div variants={fadeUp}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white">Top Categories</h2>
                <button onClick={()=>setTab('collections')} className="text-xs text-yellow-600 font-semibold hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {CATS.filter(c=>c!=='All').map(cat=>(
                  <button key={cat} onClick={()=>{setCat(cat);setTab('products');}}
                    className="rounded-xl p-3 border border-yellow-900/20 hover:border-yellow-600/30 transition group text-center" style={{background:'#0f0a00'}}>
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center border border-yellow-900/20" style={{background:'#1a1000'}}>
                      <Package size={16} className="text-gray-600 group-hover:text-yellow-500 transition"/>
                    </div>
                    <p className="text-xs font-semibold text-gray-600 group-hover:text-yellow-400 transition">{cat}</p>
                    <p className="text-[9px] text-gray-700 mt-0.5">{products.filter(p=>p.category?.toLowerCase().includes(cat.toLowerCase())).length}+ items</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Newsletter */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-yellow-800/30 p-4 sm:p-6" style={{background:'linear-gradient(135deg,#1a0e00,#100800)'}}>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:p-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white mb-1">Get Exclusive Offers &amp; Updates</h3>
                  <p className="text-sm text-gray-500">Subscribe to our newsletter</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="email" placeholder="Enter your email address"
                    className="flex-1 sm:w-64 border border-yellow-900/30 text-white placeholder-gray-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-yellow-600/50"
                    style={{background:'#0a0600'}}/>
                  <button className="px-5 py-2.5 font-bold text-sm rounded-xl text-black flex-shrink-0"
                    style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
                    <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── PRODUCTS ─── */}
        {tab==='products' && (
          <div>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
              {CATS.map(c=>(
                <button key={c} onClick={()=>{setCat(c);setPage(1);}}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${cat===c?'text-black shadow-lg':'border border-yellow-900/30 text-gray-500 hover:border-yellow-600/40 hover:text-gray-300'}`}
                  style={cat===c?{background:'linear-gradient(135deg,#f59e0b,#d97706)'}:{background:'#0f0a00'}}>
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
                <input type="text" placeholder="Search products..." value={search}
                  onChange={e=>{setSearch(e.target.value);setPage(1);}}
                  className="w-full pl-9 pr-4 py-2.5 border border-yellow-900/20 text-white text-sm rounded-xl focus:outline-none focus:border-yellow-600/40 placeholder-gray-700"
                  style={{background:'#0f0a00'}}/>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setViewMode('grid')} className={`p-2.5 rounded-xl border transition ${viewMode==='grid'?'text-black border-yellow-600':'border-yellow-900/20 text-gray-600 hover:border-yellow-600/40'}`}
                  style={viewMode==='grid'?{background:'linear-gradient(135deg,#f59e0b,#d97706)'}:{background:'#0f0a00'}}>
                  <Grid2x2 size={16}/>
                </button>
                <button onClick={()=>setViewMode('list')} className={`p-2.5 rounded-xl border transition ${viewMode==='list'?'text-black border-yellow-600':'border-yellow-900/20 text-gray-600 hover:border-yellow-600/40'}`}
                  style={viewMode==='list'?{background:'linear-gradient(135deg,#f59e0b,#d97706)'}:{background:'#0f0a00'}}>
                  <LayoutList size={16}/>
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">All Products ({filtered.length})</p>

            {paged.length===0 ? (
              <div className="py-20 text-center text-gray-700"><Package size={48} className="mx-auto mb-4 opacity-20"/><p>No products found.</p></div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="visible"
                className={viewMode==='grid'?'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:p-4':'space-y-3'}>
                {paged.map((p,i)=> viewMode==='grid' ? (
                  <GoldProductCard key={p.id} product={p} onAddToCart={handleAddToCart} i={i}/>
                ) : (
                  <motion.div key={p.id} variants={fadeUp} className="flex gap-3 sm:p-4 rounded-2xl border border-yellow-900/20 p-3 sm:p-4 hover:border-yellow-600/30 transition" style={{background:'#0f0a00'}}>
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{background:'#1a1000'}}>
                      <img src={p.images?.[0]?.url||PLACEHOLDER_IMAGE} alt={p.title}
                        onError={e=>{e.target.onerror=null;e.target.src={PLACEHOLDER_IMAGE};}}
                        className="w-full h-full object-cover"/>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{p.title}</p>
                      <p className="text-yellow-400 font-black text-lg">₦{Number(p.price||0).toLocaleString()}</p>
                    </div>
                    <button onClick={(e)=>handleAddToCart(e,p.id)}
                      className="self-center px-4 py-2 rounded-xl text-sm font-bold text-black"
                      style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>Add</button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {total>1&&(
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="p-2 rounded-xl border border-yellow-900/20 text-gray-600 disabled:opacity-30 hover:border-yellow-600/40 transition" style={{background:'#0f0a00'}}><ChevronLeft size={16}/></button>
                {[...Array(Math.min(total,5))].map((_,i)=>(
                  <button key={i+1} onClick={()=>setPage(i+1)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition ${page===i+1?'text-black':'border border-yellow-900/20 text-gray-500 hover:border-yellow-600/40'}`}
                    style={page===i+1?{background:'linear-gradient(135deg,#f59e0b,#d97706)'}:{background:'#0f0a00'}}>
                    {i+1}
                  </button>
                ))}
                {total>5&&<span className="text-gray-700 text-sm">...{total}</span>}
                <button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}
                  className="p-2 rounded-xl border border-yellow-900/20 text-gray-600 disabled:opacity-30 hover:border-yellow-600/40 transition" style={{background:'#0f0a00'}}><ChevronRight size={16}/></button>
              </div>
            )}
          </div>
        )}

        {/* ─── COLLECTIONS ─── */}
        {tab==='collections' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-5">
            {CATS.filter(c=>c!=='All').map(cat=>{
              const catProds = products.filter(p=>p.category?.toLowerCase().includes(cat.toLowerCase()));
              return (
                <motion.button key={cat} variants={fadeUp} initial="hidden" animate="visible"
                  onClick={()=>{setCat(cat);setTab('products');}}
                  className="rounded-2xl border border-yellow-900/20 overflow-hidden hover:border-yellow-600/30 transition-all group text-left" style={{background:'#0f0a00'}}>
                  <div className="h-36 relative overflow-hidden" style={{background:'#1a1000'}}>
                    {catProds[0]?.images?.[0]?.url&&(
                      <img src={catProds[0].images[0].url} alt={cat} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"/>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white drop-shadow">{cat}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{catProds.length} items</span>
                    <ChevronRight size={16} className="text-gray-700 group-hover:text-yellow-500 transition"/>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ─── REVIEWS ─── */}
        {tab==='reviews' && (
          <div className="max-w-2xl space-y-5">
            <div className="rounded-2xl border border-yellow-900/20 p-4 sm:p-6 flex items-center gap-4 sm:p-6" style={{background:'#0f0a00'}}>
              <div className="text-center">
                <div className="text-5xl font-black text-white">{store?.averageRating||'4.9'}</div>
                <div className="flex justify-center mt-1">{[1,2,3,4,5].map(i=><Star key={i} size={14} fill="#f59e0b" className="text-yellow-500"/>)}</div>
                <div className="text-xs text-gray-600 mt-1">{store?.totalReviews||0} reviews</div>
              </div>
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(n=>(
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-3">{n}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'#1a1000'}}>
                      <div className="h-full rounded-full" style={{width:`${n===5?78:n===4?14:4}%`,background:'linear-gradient(90deg,#f59e0b,#d97706)'}}/>
                    </div>
                    <span className="text-xs text-gray-600 w-8">{n===5?'78%':n===4?'14%':'4%'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center py-12 text-gray-700">
              <Star size={40} className="mx-auto mb-3 opacity-15"/>
              <p className="text-sm">No reviews yet. Be the first to review!</p>
            </div>
          </div>
        )}

        {/* ─── ABOUT ─── */}
        {tab==='about' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 max-w-5xl">
            <div className="space-y-5">
              <motion.div variants={fadeUp} className="rounded-2xl border border-yellow-900/20 p-4 sm:p-6 flex gap-3 sm:p-5" style={{background:'#0f0a00'}}>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white mb-2">About {store?.storeName?.toUpperCase()}</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">{store?.description||'Premium Quality • Trust • Innovation. Committed to providing the best products and exceptional customer service.'}</p>
                </div>
                <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 border border-yellow-900/20 flex items-center justify-center" style={{background:'#1a1000'}}>
                  {store?.bannerUrl
                    ? <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                    : <span className="text-white font-black text-center text-sm">{store?.storeName}</span>
                  }
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
                {[['Years in Business','2+'],['Happy Customers','50K+'],['Satisfaction','100%'],['Based in',store?.country||'Nigeria']].map(([l,v])=>(
                  <div key={l} className="rounded-xl p-3 sm:p-4 border border-yellow-900/20 text-center" style={{background:'#0f0a00'}}>
                    <div className="text-xl font-black text-white">{v}</div>
                    <div className="text-xs text-gray-600 mt-1">{l}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div variants={fadeUp} className="rounded-2xl border border-yellow-900/20 p-3 sm:p-5" style={{background:'#0f0a00'}}>
                <h3 className="font-black text-white mb-2">Our Story</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{store?.description||'Founded with a simple mission: to bring premium quality products closer to everyone. We believe in trust, quality, and long-term relationships.'}</p>
              </motion.div>
            </div>
            <div className="space-y-5">
              <motion.div variants={fadeUp} className="rounded-2xl border border-yellow-900/20 p-3 sm:p-5" style={{background:'#0f0a00'}}>
                <h3 className="font-black text-white mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-yellow-500"/> Verified &amp; Trusted</h3>
                <div className="space-y-3">
                  {[{l:'CAC Registered',s:'RC: 1234567890',I:Shield},{l:'Verified Seller',s:'W-Commerce Verified',I:ShieldCheck},{l:'Secure Payments',s:'Paystack Protected',I:CheckCircle}].map(({l,s,I})=>(
                    <div key={l} className="flex items-center gap-3 py-2.5 border-b border-yellow-900/20 last:border-0">
                      <I size={16} className="text-yellow-500 flex-shrink-0"/>
                      <div><p className="text-sm font-semibold text-white">{l}</p><p className="text-xs text-gray-600">{s}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {[{I:Star,l:'Positive Reviews',v:'98%'},{I:Clock,l:'Avg. Response',v:'2 mins'},{I:MessageCircle,l:'Support',v:'24/7'},{I:Package,l:'Easy Returns',v:'7 Days'}].map(({I,l,v})=>(
                  <div key={l} className="rounded-xl p-3 border border-yellow-900/20 text-center hover:border-yellow-600/30 transition" style={{background:'#0f0a00'}}>
                    <I size={18} className="mx-auto mb-1.5 text-yellow-600"/>
                    <div className="text-sm font-black text-white">{v}</div>
                    <div className="text-[11px] sm:text-xs text-gray-600 mt-0.5">{l}</div>
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

export default ProUltraPortfolio;
