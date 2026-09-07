import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ShieldCheck, Star, MapPin, Package, ShoppingBag, MessageCircle,
  Phone, Share2, Search, ChevronRight, ChevronLeft,
  Zap, Clock, CheckCircle, Shield, Sparkles, ArrowRight,
  Heart, TrendingUp, Grid2x2, LayoutList, Award, Gem,
  Globe, Headphones, RefreshCw, Lock, Building2, Users, BarChart3
} from 'lucide-react';

/* ─── Motion Variants ─── */
const fadeUp = { hidden:{opacity:0,y:30}, visible:{opacity:1,y:0,transition:{duration:0.7,ease:[0.22,1,0.36,1]}} };
const fadeLeft = { hidden:{opacity:0,x:-30}, visible:{opacity:1,x:0,transition:{duration:0.7,ease:[0.22,1,0.36,1]}} };
const fadeRight = { hidden:{opacity:0,x:30}, visible:{opacity:1,x:0,transition:{duration:0.7,ease:[0.22,1,0.36,1]}} };
const scaleIn = { hidden:{opacity:0,scale:0.9}, visible:{opacity:1,scale:1,transition:{duration:0.6,ease:[0.22,1,0.36,1]}} };
const stagger = { visible:{ transition:{ staggerChildren:0.09 } } };

/* ─── Animated Counter ─── */
const Counter = ({ target, suffix='' }) => {
  const [val,setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref,{once:true});
  useEffect(()=>{
    if(!inView) return;
    const n = parseFloat(String(target).replace(/[^0-9.]/g,''))||0;
    let cur=0; const step=n/55;
    const id=setInterval(()=>{
      cur=Math.min(cur+step,n);
      setVal(Math.floor(cur));
      if(cur>=n) clearInterval(id);
    },22);
    return ()=>clearInterval(id);
  },[inView,target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* ─── Enterprise White-Label Banner ─── */
const EnterpriseBanner = ({ store, isFollowing, followersCount, onFollow, accentColor='#6366f1', brandConfig={} }) => {
  const accent2 = accentColor + 'cc';
  const showWaves = brandConfig?.showBannerWaves !== false;
  
  return (
    <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.8,ease:[0.22,1,0.36,1]}}
      className="relative w-full h-56 md:h-68 rounded-3xl shadow-2xl mb-[120px]"
      style={{minHeight:'224px'}}>
      
      <div className="absolute inset-0 rounded-3xl overflow-hidden" style={{background:`linear-gradient(135deg,#0a0014 0%,#10002e 35%,#0a0014 70%,#060010 100%)`}}>
      
      {/* Animated curved wave - conditionally rendered */}
      {showWaves && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 240" preserveAspectRatio="none">
          <path d="M0,145 C85,50 190,215 305,115 C405,25 445,175 500,88 L500,240 L0,240 Z" fill={accentColor} fillOpacity="0.5"/>
          <path d="M0,178 C108,110 218,205 342,152 C446,107 470,172 500,132 L500,240 L0,240 Z" fill={accentColor} fillOpacity="0.28"/>
          <path d="M0,208 C134,164 238,218 362,178 C462,144 482,202 500,172 L500,240 L0,240 Z" fill={accentColor} fillOpacity="0.12"/>
        </svg>
      )}
      
      {/* Glow orbs */}
      <div className="absolute top-3 sm:p-5 right-32 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{background:`${accentColor}18`}}/>
      <div className="absolute -bottom-6 left-1/4 w-64 h-32 rounded-full blur-3xl pointer-events-none" style={{background:`${accentColor}0e`}}/>
      
      {/* Subtle particles */}
      {showWaves && [...Array(10)].map((_,i)=>(
        <motion.div key={i}
          animate={{y:[0,-10,0],opacity:[0.2,0.6,0.2]}}
          transition={{duration:3+i*0.4,repeat:Infinity,delay:i*0.35}}
          className="absolute w-1 h-1 rounded-full"
          style={{background:accentColor,left:`${8+i*9}%`,top:`${15+Math.sin(i*1.2)*55}%`}}/>
      ))}
      
      {/* No W-Commerce branding — white-label */}
      {store?.bannerUrl && (
        <div className="absolute right-0 top-0 h-full w-1/2 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0014] to-transparent z-10 w-1/3"></div>
          <img src={store.bannerUrl} alt="" className="w-full h-full object-cover object-center opacity-100"/>
        </div>
      )}
      </div>

      <div className="relative z-10 h-full flex items-center gap-3 sm:p-5 px-6 md:px-12">
        <div className="relative flex-shrink-0 translate-y-[140%] z-50">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-50" style={{background:accentColor,transform:'scale(1.15)'}}/>
          <div className="relative w-24 h-24 rounded-2xl border-2 overflow-hidden shadow-2xl"
            style={{borderColor:`${accentColor}50`,background:`${accentColor}15`,backdropFilter:'blur(12px)'}}>
            {store?.logoUrl
              ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
              : <span className="w-full h-full flex items-center justify-center text-3xl font-black" style={{color:accentColor}}>{store?.storeName?.charAt(0)||'S'}</span>
            }
          </div>
          {/* Enterprise badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg border" style={{background:accentColor,borderColor:'transparent'}}>
            <Gem size={13} className="text-white"/>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-4xl font-black text-white truncate tracking-tight">{store?.storeName||'Store Name'}</h1>
            {store?.isVerified && <ShieldCheck size={20} style={{color:accentColor}} className="flex-shrink-0"/>}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border"
              style={{background:`${accentColor}20`,borderColor:`${accentColor}40`,color:accentColor}}>
              <Gem size={10}/> Ultra2Pro Enterprise
            </span>
            <span className="inline-flex items-center gap-1 text-yellow-400 text-sm font-bold">
              <Star size={12} fill="currentColor"/> {store?.averageRating||'4.9'} ({store?.totalReviews||'3.2'}k)
            </span>
          </div>
          <div className="flex items-center gap-3 sm:p-4 mt-2 text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
            <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Global'}</span>
            <span className="font-bold" style={{color:'rgba(255,255,255,0.65)'}}>{(followersCount||0).toLocaleString()} Followers</span>
            <span className="flex items-center gap-1"><Clock size={11}/> 2 min response</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <motion.button whileHover={{scale:1.06}} whileTap={{scale:0.94}} onClick={onFollow}
            className="px-6 py-2.5 rounded-full text-sm font-black shadow-2xl transition"
            style={isFollowing
              ?{background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)'}
              :{background:accentColor,color:'white',boxShadow:`0 0 24px ${accentColor}50`}}>
            {isFollowing ? '✓ Following' : '♡ Follow Store'}
          </motion.button>
          <button onClick={()=>navigator.share?.({title:store?.storeName,url:window.location.href})}
            className="px-6 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 justify-center transition"
            style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.12)'}}>
            <Share2 size={11}/> Share
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Countdown ─── */
const useCountdown = (h=3,m=12,s=5) => {
  const [t,setT] = useState({h,m,s});
  useEffect(()=>{
    const id=setInterval(()=>setT(prev=>{
      if(prev.s>0) return {...prev,s:prev.s-1};
      if(prev.m>0) return {...prev,m:prev.m-1,s:59};
      if(prev.h>0) return {h:prev.h-1,m:59,s:59};
      return {h:0,m:0,s:0};
    }),1000);
    return()=>clearInterval(id);
  },[]);
  return t;
};

/* ─── Product Card Enterprise ─── */
const EnterpriseCard = ({ product, onAddToCart, accent='#6366f1', i=0 }) => {
  const [liked,setLiked] = useState(false);
  return (
    <motion.div variants={fadeUp} custom={i}
      className="rounded-2xl border overflow-hidden group flex flex-col transition-all duration-300"
      style={{background:'#0d0020',borderColor:'rgba(99,102,241,0.1)'}}
      whileHover={{borderColor:`${accent}35`,boxShadow:`0 0 24px ${accent}0c`}}>
      <div className="aspect-square overflow-hidden relative" style={{background:'#150030'}}>
        <img src={product.images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt={product.title}
          onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{background:'linear-gradient(to top, rgba(13,0,32,0.85) 0%, transparent 60%)'}}/>
        <button onClick={()=>setLiked(v=>!v)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{background:liked?'#ef4444':'rgba(13,0,32,0.6)',color:liked?'white':'rgba(255,255,255,0.35)'}}>
          <Heart size={13} fill={liked?'white':'none'}/>
        </button>
        <motion.button whileTap={{scale:0.88}} onClick={(e)=>onAddToCart(e,product.id)}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-black text-lg text-white shadow-lg"
          style={{background:accent,boxShadow:`0 0 12px ${accent}60`}}>
          +
        </motion.button>
        {product.isFlashSale && <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">SALE</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold line-clamp-2 mb-1" style={{color:'rgba(255,255,255,0.85)'}}>{product.title}</p>
        <div className="flex items-center gap-1 text-xs mb-2" style={{color:'rgba(255,255,255,0.3)'}}>
          <Star size={10} fill="#fbbf24" className="text-yellow-400"/> {product.averageRating||'4.9'}
        </div>
        <p className="text-base font-black mt-auto" style={{color:accent}}>₦{Number(product.price||0).toLocaleString()}</p>
      </div>
    </motion.div>
  );
};

const CATS = ['All','Phones','Accessories','Laptops','Wearables','Audio','Gaming'];

/* ═══ ULTRA2PRO PORTFOLIO ═══ */
const Ultra2ProPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount }) => {
  const [tab, setTab] = useState('home');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const time = useCountdown();
  const PER = 8;

  // Use brandConfig accent or default to indigo
  const accent = brandConfig?.primaryColor || '#6366f1';

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
    <div className="min-h-screen font-sans" style={{background:'#08000f',color:'white'}}>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <EnterpriseBanner store={store} isFollowing={isFollowing} followersCount={followersCount} onFollow={handleFollow} accentColor={accent} brandConfig={brandConfig}/>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <nav className="flex overflow-x-auto gap-1 scrollbar-hide" style={{borderBottom:`1px solid ${accent}18`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0"
              style={tab===t.id
                ?{borderBottomColor:accent,color:accent,background:`${accent}08`,borderRadius:'8px 8px 0 0'}
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
            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
              {[
                {l:'Followers',v:followersCount||2300,n:true},
                {l:'Products',v:products.length,n:true},
                {l:'Positive Reviews',v:98,suf:'%',n:true},
                {l:'Response Time',v:'2 mins'},
              ].map(s=>(
                <div key={s.l} className="rounded-2xl p-3 sm:p-4 border text-center transition"
                  style={{background:'#0d0020',borderColor:`${accent}15`}}>
                  <div className="text-2xl font-black text-white">
                    {s.n ? <Counter target={s.v} suffix={s.suf||''}/> : s.v}
                  </div>
                  <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.28)'}}>{s.l}</div>
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:p-5">
              {/* Left */}
              <div className="space-y-4">
                {/* Flash Sale */}
                <motion.div variants={fadeLeft} className="rounded-2xl p-3 sm:p-4 border" style={{background:'#0d0020',borderColor:`${accent}18`}}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={13} style={{color:'#fbbf24'}}/>
                    <span className="text-xs font-black uppercase tracking-wider" style={{color:'#fbbf24'}}>Flash Sale</span>
                    <span className="ml-auto text-xs font-semibold" style={{color:accent}}>VIP Access</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[{l:'Hrs',v:time.h},{l:'Mins',v:time.m},{l:'Secs',v:time.s}].map(t=>(
                      <div key={t.l} className="flex-1 text-center">
                        <motion.div key={t.v} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}
                          className="text-xl font-black h-12 flex items-center justify-center rounded-xl border"
                          style={{background:'#08000f',borderColor:`${accent}20`,color:accent}}>
                          {String(t.v).padStart(2,'0')}
                        </motion.div>
                        <div className="text-[11px] sm:text-xs mt-0.5" style={{color:'rgba(255,255,255,0.22)'}}>{t.l}</div>
                      </div>
                    ))}
                  </div>
                  {products[0] && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{background:'#08000f',borderColor:`${accent}15`}}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border" style={{borderColor:`${accent}15`}}>
                        <img src={products[0].images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt="" onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{products[0].title}</p>
                        <p className="font-black text-sm" style={{color:accent}}>₦{Number(products[0].price||0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* About snippet */}
                <motion.div variants={fadeLeft} className="rounded-2xl border p-3 sm:p-4" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                  <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{color:`${accent}90`}}>About The Store</h3>
                  <p className="text-sm mb-3 line-clamp-3" style={{color:'rgba(255,255,255,0.38)'}}>{store?.description||'Enterprise-grade commerce platform.'}</p>
                  <div className="space-y-1.5 text-xs mb-3">
                    {[['Total Orders',store?.metrics?.totalOrders||'12.6K'],['Items Sold',store?.metrics?.itemsSold||'28.2K']].map(([k,v])=>(
                      <div key={k} className="flex justify-between py-1" style={{borderBottom:`1px solid ${accent}12`}}>
                        <span style={{color:'rgba(255,255,255,0.25)'}}>{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setTab('about')} className="text-xs font-semibold hover:underline" style={{color:accent}}>Learn More →</button>
                </motion.div>

                {/* VIP Concierge */}
                <motion.div variants={fadeLeft} className="rounded-2xl border p-3 sm:p-4" style={{background:`${accent}12`,borderColor:`${accent}30`}}>
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones size={14} style={{color:accent}}/>
                    <span className="text-xs font-black" style={{color:accent}}>VIP Concierge Support</span>
                  </div>
                  <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.35)'}}>24/7 dedicated support with priority escalation for all enterprise clients.</p>
                  <button className="w-full py-2 rounded-xl text-xs font-bold text-white transition" style={{background:accent}}>
                    Contact Concierge
                  </button>
                </motion.div>

                {/* Contact */}
                <motion.div variants={fadeLeft} className="grid grid-cols-3 gap-2">
                  {[{l:'Chat',I:MessageCircle},{l:'Call',I:Phone},{l:'Share',I:Share2}].map(({l,I})=>(
                    <button key={l} className="flex flex-col items-center gap-1 rounded-xl p-3 border transition" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                      <I size={17} style={{color:'rgba(255,255,255,0.3)'}}/>
                      <span className="text-[11px] sm:text-xs" style={{color:'rgba(255,255,255,0.25)'}}>{l}</span>
                    </button>
                  ))}
                </motion.div>

                {/* Trust */}
                <motion.div variants={fadeLeft} className="grid grid-cols-2 gap-2">
                  {['✅ Original Products','🔒 Secure Payments','🌍 Global Delivery','💬 24/7 Support'].map(b=>(
                    <div key={b} className="rounded-xl p-2.5 border text-[11px] sm:text-xs" style={{background:'#0d0020',borderColor:`${accent}12`,color:'rgba(255,255,255,0.3)'}}>{b}</div>
                  ))}
                </motion.div>
              </div>

              {/* Right: Featured Product */}
              <motion.div variants={scaleIn} className="lg:col-span-2">
                {products[0] ? (
                  <div className="rounded-2xl border overflow-hidden h-full flex flex-col p-4 sm:p-6" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                    <div className="text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{color:`${accent}70`}}>
                      <Sparkles size={12} style={{color:accent}}/> Featured Product
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:p-5 items-center flex-1">
                      <div className="w-full sm:w-64 h-64 rounded-2xl overflow-hidden flex-shrink-0 border shadow-2xl"
                        style={{background:'#150030',borderColor:`${accent}20`,boxShadow:`0 0 40px ${accent}18`}}>
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
                        <p className="text-sm mb-6 leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{products[0].description?.slice(0,130)||'Flagship product. Unmatched quality.'}</p>
                        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}}
                          onClick={(e)=>handleAddToCart(e,products[0].id)}
                          className="flex items-center gap-2 font-black px-6 py-3 rounded-xl text-white transition shadow-lg"
                          style={{background:accent,boxShadow:`0 0 24px ${accent}40`}}>
                          View Details <ArrowRight size={16}/>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border h-full flex items-center justify-center" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                    <div className="text-center" style={{color:'rgba(255,255,255,0.15)'}}><Package size={48} className="mx-auto mb-3 opacity-20"/><p>No featured product</p></div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Top Categories */}
            <motion.div variants={fadeUp}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white">Top Categories</h2>
                <button onClick={()=>setTab('collections')} className="text-xs font-semibold hover:underline" style={{color:accent}}>View All</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {CATS.filter(c=>c!=='All').map(c=>(
                  <button key={c} onClick={()=>{setCat(c);setTab('products');}}
                    className="rounded-xl p-3 border transition group text-center"
                    style={{background:'#0d0020',borderColor:`${accent}12`}}>
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center border" style={{background:'#08000f',borderColor:`${accent}15`}}>
                      <Package size={15} style={{color:'rgba(255,255,255,0.25)'}} className="group-hover:opacity-100 transition"/>
                    </div>
                    <p className="text-xs font-semibold" style={{color:'rgba(255,255,255,0.35)'}}>{c}</p>
                    <p className="text-[9px] mt-0.5" style={{color:'rgba(255,255,255,0.18)'}}>{products.filter(p=>p.category?.toLowerCase().includes(c.toLowerCase())).length}+</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Enterprise Features Banner */}
            <motion.div variants={fadeUp} className="rounded-2xl border p-4 sm:p-6" style={{background:`linear-gradient(135deg,${accent}18,${accent}08)`,borderColor:`${accent}25`}}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:p-5">
                {[
                  {icon:Globe,title:'Global Commerce',desc:'Sell across 50+ countries with multi-currency support'},
                  {icon:Lock,title:'Enterprise Security',desc:'Bank-grade encryption and fraud protection'},
                  {icon:BarChart3 || TrendingUp,title:'Advanced Analytics',desc:'Real-time insights and performance dashboards'},
                ].map(({icon:Icon,title,desc})=>(
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${accent}25`}}>
                      <Icon size={18} style={{color:accent}}/>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Newsletter */}
            <motion.div variants={fadeUp} className="rounded-2xl border p-4 sm:p-6" style={{background:'#0d0020',borderColor:`${accent}20`}}>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:p-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white mb-1">Get Exclusive Offers &amp; Updates</h3>
                  <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Join our VIP newsletter for priority access to deals</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="email" placeholder="Enter your email address"
                    className="flex-1 sm:w-64 text-white placeholder-opacity-30 text-sm rounded-xl px-4 py-2.5 focus:outline-none"
                    style={{background:'#08000f',border:`1px solid ${accent}25`,color:'white'}}/>
                  <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-white flex-shrink-0" style={{background:accent}}>
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
                  className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition flex-shrink-0"
                  style={cat===c?{background:accent,color:'white',boxShadow:`0 0 14px ${accent}40`}:{background:'#0d0020',border:`1px solid ${accent}15`,color:'rgba(255,255,255,0.4)'}}>
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'rgba(255,255,255,0.25)'}}/>
                <input type="text" placeholder="Search products..." value={search}
                  onChange={e=>{setSearch(e.target.value);setPage(1);}}
                  className="w-full pl-9 pr-4 py-2.5 text-white text-sm rounded-xl focus:outline-none"
                  style={{background:'#0d0020',border:`1px solid ${accent}15`}}/>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setViewMode('grid')} className="p-2.5 rounded-xl border transition"
                  style={viewMode==='grid'?{background:accent,border:'none',color:'white'}:{background:'#0d0020',borderColor:`${accent}15`,color:'rgba(255,255,255,0.3)'}}>
                  <Grid2x2 size={16}/>
                </button>
                <button onClick={()=>setViewMode('list')} className="p-2.5 rounded-xl border transition"
                  style={viewMode==='list'?{background:accent,border:'none',color:'white'}:{background:'#0d0020',borderColor:`${accent}15`,color:'rgba(255,255,255,0.3)'}}>
                  <LayoutList size={16}/>
                </button>
              </div>
            </div>

            <p className="text-sm mb-4" style={{color:'rgba(255,255,255,0.28)'}}>All Products ({filtered.length})</p>

            {paged.length===0
              ? <div className="py-20 text-center" style={{color:'rgba(255,255,255,0.15)'}}><Package size={48} className="mx-auto mb-4 opacity-15"/><p>No products found.</p></div>
              : viewMode==='grid'
                ? <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                    {paged.map((p,i)=><EnterpriseCard key={p.id} product={p} onAddToCart={handleAddToCart} accent={accent} i={i}/>)}
                  </motion.div>
                : <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                    {paged.map((p,i)=>(
                      <motion.div key={p.id} variants={fadeUp} className="flex gap-3 sm:p-4 rounded-2xl border p-3 sm:p-4 transition"
                        style={{background:'#0d0020',borderColor:`${accent}15`}}>
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{background:'#150030'}}>
                          <img src={p.images?.[0]?.url||'/assets/splash_3d_box_1781971684931.png'} alt={p.title}
                            onError={e=>{e.target.onerror=null;e.target.src='/assets/splash_3d_box_1781971684931.png';}}
                            className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{p.title}</p>
                          <p className="font-black text-lg" style={{color:accent}}>₦{Number(p.price||0).toLocaleString()}</p>
                        </div>
                        <button onClick={(e)=>handleAddToCart(e,p.id)} className="self-center px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:accent}}>Add</button>
                      </motion.div>
                    ))}
                  </motion.div>
            }

            {total>1&&(
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="p-2 rounded-xl border disabled:opacity-30 transition" style={{background:'#0d0020',borderColor:`${accent}15`,color:'rgba(255,255,255,0.4)'}}>
                  <ChevronLeft size={16}/>
                </button>
                {[...Array(Math.min(total,5))].map((_,i)=>(
                  <button key={i+1} onClick={()=>setPage(i+1)}
                    className="w-10 h-10 rounded-xl text-sm font-bold transition"
                    style={page===i+1?{background:accent,color:'white'}:{background:'#0d0020',border:`1px solid ${accent}15`,color:'rgba(255,255,255,0.4)'}}>
                    {i+1}
                  </button>
                ))}
                {total>5&&<span className="text-sm" style={{color:'rgba(255,255,255,0.2)'}}>...{total}</span>}
                <button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}
                  className="p-2 rounded-xl border disabled:opacity-30 transition" style={{background:'#0d0020',borderColor:`${accent}15`,color:'rgba(255,255,255,0.4)'}}>
                  <ChevronRight size={16}/>
                </button>
              </div>
            )}

            <div className="mt-8 rounded-2xl p-4 sm:p-6 flex items-center justify-between border" style={{background:`linear-gradient(135deg,${accent}18,${accent}0a)`,borderColor:`${accent}25`}}>
              <div>
                <h3 className="text-white font-black text-lg">Big Savings on Top Brands</h3>
                <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Up to 30% off — VIP members get early access</p>
              </div>
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2" style={{background:accent}}>
                Shop Now <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ─── COLLECTIONS ─── */}
        {tab==='collections' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-5">
            {CATS.filter(c=>c!=='All').map(c=>{
              const cp=products.filter(p=>p.category?.toLowerCase().includes(c.toLowerCase()));
              return (
                <motion.button key={c} variants={scaleIn} onClick={()=>{setCat(c);setTab('products');}}
                  className="rounded-2xl border overflow-hidden transition-all group text-left"
                  style={{background:'#0d0020',borderColor:`${accent}15`}}>
                  <div className="h-36 relative overflow-hidden" style={{background:'#150030'}}>
                    {cp[0]?.images?.[0]?.url&&<img src={cp[0].images[0].url} alt={c} className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"/>}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white drop-shadow">{c}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex justify-between items-center">
                    <span className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>{cp.length} items</span>
                    <ChevronRight size={16} style={{color:'rgba(255,255,255,0.2)'}} className="group-hover:translate-x-1 transition"/>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ─── REVIEWS ─── */}
        {tab==='reviews' && (
          <div className="max-w-2xl space-y-5">
            <div className="rounded-2xl border p-4 sm:p-6 flex items-center gap-4 sm:p-6" style={{background:'#0d0020',borderColor:`${accent}15`}}>
              <div className="text-center">
                <div className="text-5xl font-black text-white">{store?.averageRating||'4.9'}</div>
                <div className="flex justify-center mt-1">{[1,2,3,4,5].map(i=><Star key={i} size={14} fill="#fbbf24" className="text-yellow-400"/>)}</div>
                <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.28)'}}>{store?.totalReviews||0} reviews</div>
              </div>
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(n=>(
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs w-3" style={{color:'rgba(255,255,255,0.28)'}}>{n}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:`${accent}10`}}>
                      <div className="h-full rounded-full" style={{width:`${n===5?80:n===4?13:4}%`,background:accent}}/>
                    </div>
                    <span className="text-xs w-8" style={{color:'rgba(255,255,255,0.22)'}}>{n===5?'80%':n===4?'13%':'4%'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center py-12" style={{color:'rgba(255,255,255,0.15)'}}>
              <Star size={40} className="mx-auto mb-3 opacity-15"/>
              <p className="text-sm">No reviews yet. Be the first to review!</p>
            </div>
          </div>
        )}

        {/* ─── ABOUT ─── */}
        {tab==='about' && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 max-w-5xl">
            <div className="space-y-5">
              <motion.div variants={fadeLeft} className="rounded-2xl border p-4 sm:p-6 flex gap-3 sm:p-5" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white mb-2">About {store?.storeName?.toUpperCase()}</h2>
                  <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.38)'}}>{store?.description||'Premium Quality • Trust • Innovation. We are committed to providing the best products and exceptional enterprise-grade customer service.'}</p>
                </div>
                <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 border flex items-center justify-center"
                  style={{background:'#150030',borderColor:`${accent}18`}}>
                  {store?.bannerUrl
                    ? <img src={store.bannerUrl} alt="Store" className="w-full h-full object-cover"/>
                    : <span className="text-white font-black text-center text-xs px-2">{store?.storeName}</span>
                  }
                </div>
              </motion.div>
              <motion.div variants={fadeLeft} className="grid grid-cols-2 gap-3">
                {[['Years in Business','2+'],['Happy Customers','50K+'],['Satisfaction','100%'],['Based in',store?.country||'Global']].map(([l,v])=>(
                  <div key={l} className="rounded-xl p-3 sm:p-4 border text-center" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                    <div className="text-xl font-black text-white">{v}</div>
                    <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.28)'}}>{l}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div variants={fadeLeft} className="rounded-2xl border p-3 sm:p-5" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                <h3 className="font-black text-white mb-2">Our Story</h3>
                <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{store?.description||'Founded with a mission: to bring premium quality products to everyone. We believe in trust, quality, and long-term relationships backed by enterprise-grade infrastructure.'}</p>
              </motion.div>
            </div>
            <div className="space-y-5">
              <motion.div variants={fadeRight} className="rounded-2xl border p-3 sm:p-5" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                <h3 className="font-black text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={16} style={{color:accent}}/> Verified &amp; Trusted
                </h3>
                <div className="space-y-3">
                  {[{l:'CAC Registered',s:'RC: 1234567890',I:Shield},{l:'Verified Seller',s:'W-Commerce Verified',I:ShieldCheck},{l:'Secure Payments',s:'Paystack Protected',I:CheckCircle},{l:'API Access',s:'Enterprise Integration',I:Globe}].map(({l,s,I})=>(
                    <div key={l} className="flex items-center gap-3 py-2.5" style={{borderBottom:`1px solid ${accent}12`}}>
                      <I size={16} style={{color:accent}} className="flex-shrink-0"/>
                      <div><p className="text-sm font-semibold text-white">{l}</p><p className="text-xs" style={{color:'rgba(255,255,255,0.28)'}}>{s}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={fadeRight} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:p-4">
                {[{I:Star,l:'Positive Reviews',v:'98%'},{I:Clock,l:'Avg. Response',v:'2 mins'},{I:MessageCircle,l:'Support',v:'24/7'},{I:Package,l:'Returns',v:'7 Days'}].map(({I,l,v})=>(
                  <div key={l} className="rounded-xl p-3 border text-center transition" style={{background:'#0d0020',borderColor:`${accent}15`}}>
                    <I size={18} className="mx-auto mb-1.5" style={{color:accent}}/>
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

export default Ultra2ProPortfolio;
