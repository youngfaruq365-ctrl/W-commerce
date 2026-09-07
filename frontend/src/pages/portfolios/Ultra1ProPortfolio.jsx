import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, Star, MapPin, Package, ShoppingBag, MessageCircle,
  Phone, Share2, Search, Filter, ChevronRight, ChevronLeft,
  Zap, Clock, CheckCircle, Shield, Crown, Sparkles, ArrowRight,
  Heart, TrendingUp, Brain, Grid2x2, LayoutList, RefreshCw,
  Cpu, Wifi, BarChart3, Activity
} from 'lucide-react';

/* ─── Variants ─── */
const fadeUp = { hidden:{opacity:0,y:24}, visible:{opacity:1,y:0,transition:{duration:0.6,ease:[0.22,1,0.36,1]}} };
const fadeLeft = { hidden:{opacity:0,x:-24}, visible:{opacity:1,x:0,transition:{duration:0.6,ease:[0.22,1,0.36,1]}} };
const stagger = { visible:{ transition:{ staggerChildren:0.07 } } };

/* ─── Animated Counter ─── */
const Counter = ({ target, suffix='' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once:true });
  useEffect(() => {
    if (!inView) return;
    const n = parseFloat(String(target).replace(/[^0-9.]/g,'')) || 0;
    let cur = 0; const step = n/50;
    const id = setInterval(() => {
      cur = Math.min(cur+step, n);
      setVal(Math.floor(cur));
      if (cur >= n) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* ─── Neon Banner ─── */
const NeonBanner = ({ store, isFollowing, followersCount, onFollow }) => (
  <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:[0.22,1,0.36,1]}}
    className="relative w-full h-56 md:h-64 rounded-3xl overflow-hidden shadow-2xl"
    style={{background:'linear-gradient(135deg,#000d1a 0%,#001833 40%,#000d1a 100%)'}}>
    {/* Animated neon grid */}
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 500 256" preserveAspectRatio="none">
      {[0,60,120,180,240].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="256" stroke="#00d4ff" strokeWidth="0.5"/>)}
      {[0,64,128,192,256].map(y => <line key={`h${y}`} x1="0" y1={y} x2="500" y2={y} stroke="#00d4ff" strokeWidth="0.5"/>)}
    </svg>
    {/* Cyan wave */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 256" preserveAspectRatio="none">
      <path d="M0,145 C90,55 190,210 305,115 C405,25 445,175 500,90 L500,256 L0,256 Z" fill="#0ea5e9" fillOpacity="0.45"/>
      <path d="M0,180 C110,110 215,200 340,150 C445,105 468,170 500,130 L500,256 L0,256 Z" fill="#06b6d4" fillOpacity="0.25"/>
    </svg>
    {/* Glowing orbs */}
    <div className="absolute top-4 sm:p-6 right-28 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{background:'#0ea5e920'}}/>
    <div className="absolute -bottom-4 left-1/3 w-60 h-28 rounded-full blur-3xl pointer-events-none" style={{background:'#06b6d415'}}/>
    {/* AI badge top-right */}
    <div className="absolute top-3 sm:p-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black" style={{background:'#001833',borderColor:'#0ea5e930',color:'#0ea5e9'}}>
      <Brain size={12}/> AI-Powered Store
    </div>
    {store?.bannerUrl && (
      <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-10"/>
    )}
    {/* Scanning line animation */}
    <motion.div animate={{y:[-10,256+10]}} transition={{duration:3,repeat:Infinity,ease:'linear',repeatDelay:1}}
      className="absolute left-0 right-0 h-px opacity-40 pointer-events-none" style={{background:'linear-gradient(90deg,transparent,#00d4ff,transparent)'}}/>

    <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-10">
      {/* Logo with neon ring */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 rounded-2xl blur-md opacity-60" style={{background:'#0ea5e9',transform:'scale(1.1)'}}/>
        <div className="relative w-24 h-24 rounded-2xl border overflow-hidden shadow-2xl" style={{borderColor:'#0ea5e940',background:'#001833'}}>
          {store?.logoUrl
            ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
            : <span className="w-full h-full flex items-center justify-center text-3xl font-black" style={{color:'#0ea5e9'}}>{store?.storeName?.charAt(0)||'S'}</span>
          }
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg" style={{background:'#0ea5e9'}}>
          <Cpu size={13} className="text-black"/>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate">{store?.storeName||'Store Name'}</h1>
          {store?.isVerified && <ShieldCheck size={18} style={{color:'#0ea5e9'}} className="flex-shrink-0"/>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border" style={{background:'#0ea5e915',borderColor:'#0ea5e930',color:'#0ea5e9'}}>
            <Cpu size={10}/> Ultra1Pro Store
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border" style={{background:'#10b98115',borderColor:'#10b98130',color:'#10b981'}}>
            <ShieldCheck size={10}/> Verified
          </span>
          <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
            <Star size={12} fill="currentColor"/> {store?.averageRating||'4.9'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
          <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Nigeria'}</span>
          <span className="font-bold" style={{color:'rgba(255,255,255,0.6)'}}>{(followersCount||0).toLocaleString()} Followers</span>
          <span className="flex items-center gap-1" style={{color:'#0ea5e9'}}><Activity size={11}/> Online Now</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <motion.button whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onFollow}
          className="px-5 py-2.5 rounded-full text-sm font-black shadow-xl transition"
          style={isFollowing
            ? {background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)'}
            : {background:'#0ea5e9',color:'white',boxShadow:'0 0 20px #0ea5e940'}}>
          {isFollowing ? '✓ Following' : '♡ Follow'}
        </motion.button>
        <button onClick={()=>navigator.share?.({title:store?.storeName,url:window.location.href})}
          className="px-5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 justify-center"
          style={{background:'rgba(255,255,255,0.07)',color:'white',border:'1px solid rgba(255,255,255,0.15)'}}>
          <Share2 size={11}/> Share
        </button>
      </div>
    </div>
  </motion.div>
);

/* ─── Countdown ─── */
const useCountdown = (h=0,m=58,s=44) => {
  const [t,setT] = useState({h,m,s});
  useEffect(()=>{
    const id=setInterval(()=>{
      setT(prev=>{
        if(prev.s>0) return {...prev,s:prev.s-1};
        if(prev.m>0) return {...prev,m:prev.m-1,s:59};
        if(prev.h>0) return {h:prev.h-1,m:59,s:59};
        return {h:0,m:0,s:0};
      });
    },1000);
    return()=>clearInterval(id);
  },[]);
  return t;
};

/* ─── Product Card Neon ─── */
const NeonCard = ({ product, onAddToCart, i=0 }) => {
  const [liked,setLiked] = useState(false);
  return (
    <motion.div variants={fadeUp} custom={i}
      className="rounded-2xl border overflow-hidden transition-all duration-300 group flex flex-col"
      style={{background:'#001020',borderColor:'rgba(14,165,233,0.1)'}}
      whileHover={{borderColor:'rgba(14,165,233,0.35)',boxShadow:'0 0 20px rgba(14,165,233,0.08)'}}>
      <div className="aspect-square overflow-hidden relative" style={{background:'#001830'}}>
        <img src={product.images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt={product.title}
          onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background:'linear-gradient(to top, rgba(0,16,32,0.8) 0%, transparent 60%)'}}/>
        <button onClick={()=>setLiked(v=>!v)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{background:liked?'#ef4444':'rgba(0,16,32,0.6)',color:liked?'white':'rgba(255,255,255,0.4)'}}>
          <Heart size={13} fill={liked?'white':'none'}/>
        </button>
        <motion.button whileTap={{scale:0.88}} onClick={(e)=>onAddToCart(e,product.id)}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 font-black text-lg text-white shadow-lg"
          style={{background:'#0ea5e9',boxShadow:'0 0 12px #0ea5e960'}}>
          +
        </motion.button>
        {product.isFlashSale && (
          <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full" style={{background:'#ef4444',color:'white'}}>SALE</span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold line-clamp-2 mb-1" style={{color:'rgba(255,255,255,0.85)'}}>{product.title}</p>
        <div className="flex items-center gap-1 text-xs mb-2" style={{color:'rgba(255,255,255,0.3)'}}>
          <Star size={10} fill="#fbbf24" className="text-yellow-400"/> {product.averageRating||'4.9'}
        </div>
        <p className="text-base font-black mt-auto" style={{color:'#0ea5e9'}}>₦{Number(product.price||0).toLocaleString()}</p>
      </div>
    </motion.div>
  );
};

const CATS = ['All','Phones','Accessories','Laptops','Wearables','Audio','Gaming'];

/* ═══ ULTRA1PRO PORTFOLIO ═══ */
const Ultra1ProPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [tab, setTab] = useState('home');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('trending'); // trending | price_asc | price_desc | newest
  const time = useCountdown();
  const PER = 8;

  const products = store?.products || [];

  // AI Smart Sorting
  const sorted = [...products].sort((a,b) => {
    if (sortBy==='price_asc') return Number(a.price||0)-Number(b.price||0);
    if (sortBy==='price_desc') return Number(b.price||0)-Number(a.price||0);
    if (sortBy==='newest') return new Date(b.createdAt||0)-new Date(a.createdAt||0);
    return (b.viewCount||0)-(a.viewCount||0); // trending
  });

  const filtered = sorted.filter(p => {
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

  const neon = '#0ea5e9';
  const neonDim = 'rgba(14,165,233,0.15)';
  const bg = '#000d1a';
  const card = '#001020';
  const border = 'rgba(14,165,233,0.12)';

  return (
    <div className="min-h-screen font-sans" style={{background:bg,color:'white'}}>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <NeonBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow}/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <nav className="flex overflow-x-auto gap-1 scrollbar-hide" style={{borderBottom:`1px solid ${border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0"
              style={tab===t.id
                ?{borderBottomColor:neon,color:neon,background:`${neon}08`,borderRadius:'8px 8px 0 0'}
                :{borderBottomColor:'transparent',color:'rgba(255,255,255,0.3)'}}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">

        {/* ─── HOME ─── */}
        {tab==='home' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            {/* Stats Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
              {[
                {label:'Followers',value:followersCount||2300,suffix:''},
                {label:'Products',value:products.length,suffix:''},
                {label:'Positive Reviews',value:98,suffix:'%'},
                {label:'Response',value:'2 mins'},
              ].map(s=>(
                <div key={s.label} className="rounded-2xl p-3 sm:p-4 border text-center transition"
                  style={{background:card,borderColor:border}}>
                  <div className="text-2xl font-black text-white">
                    {typeof s.value==='number' ? <Counter target={s.value} suffix={s.suffix||''}/> : s.value}
                  </div>
                  <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{s.label}</div>
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:p-5">
              {/* Left */}
              <div className="space-y-4">
                {/* Flash Sale */}
                <motion.div variants={fadeUp} className="rounded-2xl p-3 sm:p-4 border" style={{background:card,borderColor:border}}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={13} style={{color:'#fbbf24'}}/>
                    <span className="text-xs font-black uppercase tracking-wider" style={{color:'#fbbf24'}}>Flash Sale</span>
                    <span className="ml-auto flex items-center gap-1 text-xs" style={{color:neon}}><Wifi size={10}/> Live</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[{l:'Hrs',v:time.h},{l:'Mins',v:time.m},{l:'Secs',v:time.s}].map(t=>(
                      <div key={t.l} className="flex-1 text-center">
                        <motion.div key={t.v} initial={{y:-8,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.2}}
                          className="text-xl font-black h-11 flex items-center justify-center rounded-xl border"
                          style={{background:'#000d1a',borderColor:border,color:neon,boxShadow:`0 0 8px ${neon}20`}}>
                          {String(t.v).padStart(2,'0')}
                        </motion.div>
                        <div className="text-[11px] sm:text-xs mt-0.5" style={{color:'rgba(255,255,255,0.25)'}}>{t.l}</div>
                      </div>
                    ))}
                  </div>
                  {products[0] && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{background:'#000d1a',borderColor:border}}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border" style={{borderColor:border}}>
                        <img src={products[0].images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt="" onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{products[0].title}</p>
                        <p className="font-black text-sm" style={{color:neon}}>₦{Number(products[0].price||0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* About */}
                <motion.div variants={fadeUp} className="rounded-2xl border p-3 sm:p-4" style={{background:card,borderColor:border}}>
                  <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{color:`${neon}99`}}>About The Store</h3>
                  <p className="text-sm mb-3 leading-relaxed line-clamp-3" style={{color:'rgba(255,255,255,0.4)'}}>{store?.description||'Next-generation commerce experience.'}</p>
                  <div className="space-y-1.5 text-xs mb-3">
                    {[['Total Orders',store?.metrics?.totalOrders||'12.6K'],['Items Sold',store?.metrics?.itemsSold||'28.2K']].map(([k,v])=>(
                      <div key={k} className="flex justify-between py-1" style={{borderBottom:`1px solid ${border}`}}>
                        <span style={{color:'rgba(255,255,255,0.25)'}}>{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setTab('about')} className="text-xs font-semibold hover:underline" style={{color:neon}}>Learn More →</button>
                </motion.div>

                {/* Contact */}
                <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
                  {[
                    {l:'Chat',I:MessageCircle},
                    {l:'Call',I:Phone},
                    {l:'Share',I:Share2},
                    {l:'Analytics',I:BarChart3},
                  ].map(({l,I})=>(
                    <button key={l} className="flex flex-col items-center gap-1 rounded-xl p-3 border transition"
                      style={{background:card,borderColor:border}}>
                      <I size={17} style={{color:'rgba(255,255,255,0.3)'}}/>
                      <span className="text-[11px] sm:text-xs" style={{color:'rgba(255,255,255,0.25)'}}>{l}</span>
                    </button>
                  ))}
                </motion.div>

                {/* AI badge */}
                <motion.div variants={fadeUp} className="rounded-2xl border p-3 sm:p-4" style={{background:card,borderColor:`${neon}30`}}>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={14} style={{color:neon}}/>
                    <span className="text-xs font-black" style={{color:neon}}>AI Smart Sorting Active</span>
                  </div>
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>Products are dynamically ranked by trending score, pricing intelligence, and real-time demand signals.</p>
                </motion.div>
              </div>

              {/* Right: Featured Product */}
              <motion.div variants={fadeUp} className="lg:col-span-2">
                {products[0] ? (
                  <div className="rounded-2xl border overflow-hidden h-full flex flex-col p-4 sm:p-6" style={{background:card,borderColor:border}}>
                    <div className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:`${neon}80`}}>
                      <Sparkles size={12} style={{color:neon}}/> Featured Product
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:p-5 items-center flex-1">
                      <div className="w-full sm:w-60 h-60 rounded-2xl overflow-hidden flex-shrink-0 border shadow-2xl"
                        style={{background:'#001830',borderColor:border,boxShadow:`0 0 30px ${neon}15`}}>
                        <img src={products[0].images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt={products[0].title}
                          onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
                          className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-2">{products[0].title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">{[1,2,3,4,5].map(i=><Star key={i} size={12} fill="#fbbf24" className="text-yellow-400"/>)}</div>
                          <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>4.9 (1.2k)</span>
                        </div>
                        <p className="text-4xl font-black text-white mb-2">₦{Number(products[0].price||0).toLocaleString()}</p>
                        <p className="text-sm mb-5 leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{products[0].description?.slice(0,120)||'Premium quality product.'}</p>
                        <motion.button whileHover={{scale:1.04,boxShadow:`0 0 24px ${neon}50`}} whileTap={{scale:0.96}}
                          onClick={(e)=>handleAddToCart(e,products[0].id)}
                          className="flex items-center gap-2 font-black px-6 py-3 rounded-xl transition text-white"
                          style={{background:neon}}>
                          View Details <ArrowRight size={16}/>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border h-full flex items-center justify-center" style={{background:card,borderColor:border}}>
                    <div className="text-center" style={{color:'rgba(255,255,255,0.2)'}}><Package size={48} className="mx-auto mb-3 opacity-30"/><p>No featured product</p></div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Top Categories */}
            <motion.div variants={fadeUp}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white">Top Categories</h2>
                <button onClick={()=>setTab('collections')} className="text-xs font-semibold hover:underline" style={{color:neon}}>View All</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {CATS.filter(c=>c!=='All').map(c=>(
                  <button key={c} onClick={()=>{setCat(c);setTab('products');}}
                    className="rounded-xl p-3 border transition group text-center"
                    style={{background:card,borderColor:border}}>
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center border transition-all" style={{background:'#000d1a',borderColor:border}}>
                      <Package size={15} style={{color:'rgba(255,255,255,0.3)'}} className="group-hover:text-[#0ea5e9] transition"/>
                    </div>
                    <p className="text-xs font-semibold transition" style={{color:'rgba(255,255,255,0.4)'}}>{c}</p>
                    <p className="text-[9px] mt-0.5" style={{color:'rgba(255,255,255,0.2)'}}>{products.filter(p=>p.category?.toLowerCase().includes(c.toLowerCase())).length}+</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── PRODUCTS ─── */}
        {tab==='products' && (
          <div>
            {/* Sort bar */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
              <span className="text-xs font-black flex-shrink-0" style={{color:`${neon}80`}}><Brain size={12} className="inline mr-1"/>AI Sort:</span>
              {[{id:'trending',label:'🔥 Trending'},{id:'newest',label:'✨ Newest'},{id:'price_asc',label:'💰 Price ↑'},{id:'price_desc',label:'💰 Price ↓'}].map(s=>(
                <button key={s.id} onClick={()=>setSortBy(s.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex-shrink-0"
                  style={sortBy===s.id?{background:neon,color:'white'}:{background:card,borderColor:border,color:'rgba(255,255,255,0.4)',border:'1px solid rgba(14,165,233,0.12)'}}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
              {CATS.map(c=>(
                <button key={c} onClick={()=>{setCat(c);setPage(1);}}
                  className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition flex-shrink-0"
                  style={cat===c?{background:neon,color:'white',boxShadow:`0 0 12px ${neon}40`}:{background:card,border:`1px solid ${border}`,color:'rgba(255,255,255,0.4)'}}>
                  {c}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'rgba(255,255,255,0.25)'}}/>
                <input type="text" placeholder="Search products..." value={search}
                  onChange={e=>{setSearch(e.target.value);setPage(1);}}
                  className="w-full pl-9 pr-4 py-2.5 text-white text-sm rounded-xl focus:outline-none placeholder-opacity-30"
                  style={{background:card,border:`1px solid ${border}`,color:'white'}}/>
              </div>
              <button className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-1 transition border"
                style={{background:card,borderColor:border,color:'rgba(255,255,255,0.4)'}}>
                <Filter size={14}/> Filter
              </button>
            </div>

            <p className="text-sm mb-4" style={{color:'rgba(255,255,255,0.3)'}}>All Products ({filtered.length})</p>

            {paged.length===0
              ? <div className="py-20 text-center" style={{color:'rgba(255,255,255,0.2)'}}><Package size={48} className="mx-auto mb-4 opacity-20"/><p>No products found.</p></div>
              : <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                  {paged.map((p,i)=><NeonCard key={p.id} product={p} onAddToCart={handleAddToCart} i={i}/>)}
                </motion.div>
            }

            {total>1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="p-2 rounded-xl border disabled:opacity-30 transition" style={{background:card,borderColor:border,color:'rgba(255,255,255,0.4)'}}>
                  <ChevronLeft size={16}/>
                </button>
                {[...Array(Math.min(total,5))].map((_,i)=>(
                  <button key={i+1} onClick={()=>setPage(i+1)}
                    className="w-10 h-10 rounded-xl text-sm font-bold transition"
                    style={page===i+1?{background:neon,color:'white'}:{background:card,border:`1px solid ${border}`,color:'rgba(255,255,255,0.4)'}}>
                    {i+1}
                  </button>
                ))}
                {total>5 && <span className="text-sm" style={{color:'rgba(255,255,255,0.25)'}}>...{total}</span>}
                <button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}
                  className="p-2 rounded-xl border disabled:opacity-30 transition" style={{background:card,borderColor:border,color:'rgba(255,255,255,0.4)'}}>
                  <ChevronRight size={16}/>
                </button>
              </div>
            )}

            {/* Promo */}
            <div className="mt-8 rounded-2xl p-4 sm:p-6 flex items-center justify-between border" style={{background:`linear-gradient(135deg,${neon}15,rgba(6,182,212,0.1))`,borderColor:`${neon}20`}}>
              <div>
                <h3 className="text-white font-black text-lg">Big Savings on Top Brands</h3>
                <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Up to 30% off on selected items</p>
              </div>
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2" style={{background:neon}}>
                Shop Now <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ─── COLLECTIONS ─── */}
        {tab==='collections' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-5">
            {CATS.filter(c=>c!=='All').map(c=>{
              const cp = products.filter(p=>p.category?.toLowerCase().includes(c.toLowerCase()));
              return (
                <motion.button key={c} variants={fadeUp} onClick={()=>{setCat(c);setTab('products');}}
                  className="rounded-2xl border overflow-hidden transition-all group text-left"
                  style={{background:card,borderColor:border}}>
                  <div className="h-36 relative overflow-hidden" style={{background:'#001830'}}>
                    {cp[0]?.images?.[0]?.url && <img src={cp[0].images[0].url} alt={c} className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"/>}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white drop-shadow">{c}</span>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{background:`linear-gradient(to top,${neon}20,transparent)`}}/>
                  </div>
                  <div className="p-3 sm:p-4 flex justify-between items-center">
                    <span className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>{cp.length} items</span>
                    <ChevronRight size={16} style={{color:'rgba(255,255,255,0.2)'}} className="group-hover:text-[#0ea5e9] transition"/>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ─── REVIEWS ─── */}
        {tab==='reviews' && (
          <div className="max-w-2xl space-y-5">
            <div className="rounded-2xl border p-4 sm:p-6 flex items-center gap-4 sm:p-6" style={{background:card,borderColor:border}}>
              <div className="text-center">
                <div className="text-5xl font-black text-white">{store?.averageRating||'4.9'}</div>
                <div className="flex justify-center mt-1">{[1,2,3,4,5].map(i=><Star key={i} size={14} fill="#fbbf24" className="text-yellow-400"/>)}</div>
                <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{store?.totalReviews||0} reviews</div>
              </div>
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(n=>(
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs w-3" style={{color:'rgba(255,255,255,0.3)'}}>{n}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(14,165,233,0.08)'}}>
                      <div className="h-full rounded-full" style={{width:`${n===5?79:n===4?13:4}%`,background:neon}}/>
                    </div>
                    <span className="text-xs w-8" style={{color:'rgba(255,255,255,0.25)'}}>{n===5?'79%':n===4?'13%':'4%'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center py-12" style={{color:'rgba(255,255,255,0.15)'}}><Star size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">No reviews yet.</p></div>
          </div>
        )}

        {/* ─── ABOUT ─── */}
        {tab==='about' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 max-w-5xl">
            <div className="space-y-5">
              <motion.div variants={fadeUp} className="rounded-2xl border p-4 sm:p-6 flex gap-3 sm:p-5" style={{background:card,borderColor:border}}>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white mb-2">About {store?.storeName?.toUpperCase()}</h2>
                  <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{store?.description||'Premium Quality • Trust • Innovation. Committed to providing the best products and exceptional customer service.'}</p>
                </div>
                <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 border flex items-center justify-center"
                  style={{background:'#001830',borderColor:border}}>
                  {store?.bannerUrl
                    ? <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                    : <span className="text-white font-black text-center text-xs">{store?.storeName}</span>
                  }
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
                {[['Years in Business','2+'],['Happy Customers','50K+'],['Satisfaction','100%'],['Based in',store?.country||'Nigeria']].map(([l,v])=>(
                  <div key={l} className="rounded-xl p-3 sm:p-4 border text-center transition" style={{background:card,borderColor:border}}>
                    <div className="text-xl font-black text-white">{v}</div>
                    <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{l}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div variants={fadeUp} className="rounded-2xl border p-3 sm:p-5" style={{background:card,borderColor:border}}>
                <h3 className="font-black text-white mb-2">Our Story</h3>
                <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{store?.description||'Founded with a mission: to bring premium quality products closer to everyone. We believe in trust, quality, and long-term relationships.'}</p>
              </motion.div>
            </div>
            <div className="space-y-5">
              <motion.div variants={fadeUp} className="rounded-2xl border p-3 sm:p-5" style={{background:card,borderColor:border}}>
                <h3 className="font-black text-white mb-4 flex items-center gap-2"><CheckCircle size={16} style={{color:neon}}/> Verified &amp; Trusted</h3>
                <div className="space-y-3">
                  {[{l:'CAC Registered',s:'RC: 1234567890',I:Shield},{l:'Verified Seller',s:'W-Commerce Verified',I:ShieldCheck},{l:'Secure Payments',s:'Paystack Protected',I:CheckCircle}].map(({l,s,I})=>(
                    <div key={l} className="flex items-center gap-3 py-2.5" style={{borderBottom:`1px solid ${border}`}}>
                      <I size={16} style={{color:neon}} className="flex-shrink-0"/>
                      <div><p className="text-sm font-semibold text-white">{l}</p><p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>{s}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {[{I:Star,l:'Positive Reviews',v:'98%'},{I:Clock,l:'Avg. Response',v:'2 mins'},{I:MessageCircle,l:'Support',v:'24/7'},{I:Package,l:'Returns',v:'7 Days'}].map(({I,l,v})=>(
                  <div key={l} className="rounded-xl p-3 border text-center transition" style={{background:card,borderColor:border}}>
                    <I size={18} className="mx-auto mb-1.5" style={{color:neon}}/>
                    <div className="text-sm font-black text-white">{v}</div>
                    <div className="text-[11px] sm:text-xs mt-0.5" style={{color:'rgba(255,255,255,0.25)'}}>{l}</div>
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

export default Ultra1ProPortfolio;
