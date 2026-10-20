import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, MapPin, Package, Users, ShoppingBag, Calendar, MessageSquare, LayoutGrid, Heart, ShoppingCart, Layout, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../utils/apiClient';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';
import LayoutEngine from '../../components/storefront/LayoutEngine';
import { toast } from 'react-hot-toast';
import { NIGERIA_LOCATIONS } from '../../utils/nigeriaLocations';
import { GoogleMapProvider } from '../../maps/GoogleMapProvider';
import { PolylineF } from '@react-google-maps/api';
import { SmartProductCard } from '../../components/shared/SmartProductCard';
import BanningRateCard from '../../components/storefront/BanningRateCard';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

/* ─────────────── SHARED: Dynamic Banner Engine ─────────────── */
export const generateBannerStyle = (styleId = 'Premium1', customColors = {}) => {
  let category = styleId.replace(/[0-9]/g, '');
  category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  const variation = parseInt(styleId.replace(/[^0-9]/g, '') || 1);
  const v = variation;
  const mod = v * 20;

  // ViewBox: 0 0 1000 300
  let path = '';
  let strokeColor = '#b8860b';
  let leftFill = '#09090b';
  let strokeWidth = 4;
  let logoShape = 'rounded-full';

  switch(category) {
    case 'Geometric':
      const topX = 300 + (v * 30);
      const bottomX = 600 - (v * 20);
      path = `M 0 0 L ${topX} 0 L ${bottomX} 300 L 0 300 Z`;
      strokeColor = `hsl(${v * 36}, 80%, 60%)`;
      logoShape = v % 2 === 0 ? 'rounded-xl' : 'rounded-none';
      break;
    case 'Organic':
      path = `M 0 0 L ${200+mod} 0 C ${400+mod} 0, ${300+mod} 300, ${600+mod} 300 L 0 300 Z`;
      strokeColor = `hsl(${120 + v * 10}, 70%, 50%)`;
      break;
    case 'Premium':
      path = `M 0 0 L ${150+(v*10)} 0 Q ${350+(v*15)} 0, ${500+(v*15)} 300 L 0 300 Z`;
      strokeColor = '#eab308'; // Gold
      leftFill = '#000000'; // Pure black
      break;
    case 'Abstract':
      path = `M 0 0 L ${100+mod} 0 C ${500+mod} 100, ${100+mod} 200, ${500+mod} 300 L 0 300 Z`;
      strokeColor = `hsl(${280 + v * 15}, 80%, 60%)`;
      break;
    case 'Tech':
      path = `M 0 0 L ${200+mod} 0 L ${250+mod} 150 L ${400+mod} 150 L ${450+mod} 300 L 0 300 Z`;
      strokeColor = '#06b6d4';
      strokeWidth = 2;
      logoShape = 'rounded-none';
      break;
    case 'Fashion':
      path = `M 0 0 L ${300+mod} 0 L ${400+mod} 300 L 0 300 Z`;
      strokeColor = '#f43f5e';
      strokeWidth = 1;
      leftFill = '#1c1917';
      break;
    case 'Corporate':
      path = `M 0 0 L ${400+mod} 0 L ${400+mod} 300 L 0 300 Z`;
      strokeColor = '#3b82f6';
      logoShape = 'rounded-md';
      break;
    case 'Playful':
      path = `M 0 0 L ${200+mod} 0 Q ${300+mod} 150, ${200+mod} 300 L 0 300 Z`;
      strokeColor = `hsl(${v * 45}, 90%, 60%)`;
      logoShape = 'rounded-[2rem]';
      break;
    case 'Elegant':
      path = `M 0 0 L ${350+mod} 0 Q ${450+mod} 150, ${350+mod} 300 L 0 300 Z`;
      strokeColor = '#94a3b8';
      strokeWidth = 1;
      break;
    case 'Futuristic':
      path = `M 0 0 L ${100+mod} 0 L ${500+mod} 150 L ${100+mod} 300 L 0 300 Z`;
      strokeColor = '#a855f7';
      leftFill = '#020617';
      logoShape = 'rounded-tl-2xl rounded-br-2xl';
      break;
    case 'Minimal':
    case 'Classic':
    case 'Modern':
    case 'Bold':
    case 'Vibrant':
      // 1-SIDE layout: Path covers nothing or a very tiny sliver, effectively no split
      path = `M 0 0 L 0 0 Z`; 
      strokeColor = category === 'Vibrant' ? `hsl(${v * 36}, 90%, 60%)` : '#ffffff';
      leftFill = 'transparent';
      strokeWidth = 0;
      logoShape = category === 'Modern' ? 'rounded-3xl' : 'rounded-full';
      break;

    case 'Splitsolid':
    case 'Splitfade':
    case 'Splitneon':
      // 2-SIDE with custom colors (we use hues based on variation if custom isn't provided)
      const primary = customColors?.primary || `hsl(${v * 40}, 80%, 50%)`;
      const secondary = customColors?.secondary || `hsl(${200 + v * 30}, 80%, 50%)`;
      path = `M 0 0 L ${300+mod} 0 L ${200+mod} 300 L 0 300 Z`;
      if (category === 'Splitneon') {
        path = `M 0 0 L ${200+mod} 0 Q ${400+mod} 150, ${200+mod} 300 L 0 300 Z`;
      }
      strokeColor = secondary;
      leftFill = primary;
      strokeWidth = category === 'Splitneon' ? 4 : 2;
      break;

    case 'Darkglass':
    case 'Neonedge':
      // 20 Unique Advanced 3D Styles (Seller Profile Style)
      // DarkGlass is heavily glossy, NeonEdge is sharp and bright
      if (category === 'Neonedge') {
        path = `M 0 0 L ${150+(v*20)} 0 L ${250+(v*20)} 150 L ${150+(v*20)} 300 L 0 300 Z`;
        strokeColor = `hsl(${v * 36}, 100%, 50%)`; // pure neon
        leftFill = '#050505';
        strokeWidth = 3;
        logoShape = 'rounded-none';
      } else {
        path = `M 0 0 L ${250+(v*10)} 0 C ${450+(v*10)} 50, ${150+(v*10)} 250, ${350+(v*10)} 300 L 0 300 Z`;
        strokeColor = '#333333';
        leftFill = '#111111';
        strokeWidth = 1;
        logoShape = 'rounded-2xl';
      }
      break;

    case 'Default':
    default:
      // Legacy layout emulation
      const tierMap = {
        free: '#64748b',
        premium: '#eab308',
        pro: '#3b82f6',
        ultra: '#a855f7',
        proultra: '#f43f5e',
        ultra1pro: '#ec4899',
        ultra2pro: '#8b5cf6'
      };
      const tColor = customColors?.primary || tierMap[customColors?.tier] || '#a855f7';
      path = `M0,140 C80,50 190,200 300,105 C400,20 440,170 500,90 L500,300 L0,300 Z`; 
      strokeColor = tColor;
      leftFill = `${tColor}33`; // Transparent tint for the wavy background
      strokeWidth = 0;
      logoShape = 'rounded-2xl';
      break;
  }

  return { path, strokeColor, leftFill, strokeWidth, logoShape };
}

const DynamicBannerEngine = ({ store, brandConfig, isFollowing, followersCount, onFollow, tier = 'free', styleId = 'Premium1', onOpenBanRatingModal, isOwner = false, onManageStore }) => {
  const style = generateBannerStyle(styleId, { primary: store?.primaryColor, secondary: store?.secondaryColor, tier: tier?.toLowerCase() });
  
  const isDefault = styleId === 'Default';
  const logoTopMargin = brandConfig?.logoMarginTop ? `${brandConfig.logoMarginTop}px` : '0px';
  const logoBottomMarginNum = brandConfig?.logoMarginBottom !== undefined ? Number(brandConfig.logoMarginBottom) : (isDefault ? -40 : 0);
  const logoBottomMargin = `${logoBottomMarginNum}px`;
  const logoLeftMargin = brandConfig?.logoMarginLeft ? `${brandConfig.logoMarginLeft}px` : '0px';
  const logoRightMargin = brandConfig?.logoMarginRight ? `${brandConfig.logoMarginRight}px` : '0px';

  const tierConfig = {
    free:    { label: 'Free Store',    gem: '🏪', badge: 'bg-slate-600 text-slate-200' },
    premium: { label: 'Premium Store', gem: '💎', badge: 'bg-yellow-700/80 text-yellow-200' },
    pro:     { label: 'Pro Store',     gem: '⚡', badge: 'bg-blue-800/80 text-blue-200' },
    ultra:   { label: 'Ultra Store',   gem: '👑', badge: 'bg-yellow-950/50 text-yellow-200 border border-yellow-900/50' },
  };
  const cfg = tierConfig[tier?.toLowerCase()] || tierConfig.free;

  // If the logo drops below the banner (negative margin), we need to add matching margin-bottom 
  // to the entire banner so the tabs underneath are pushed down and not covered.
  const bannerMarginBottom = logoBottomMarginNum < 0 ? `${Math.abs(logoBottomMarginNum)}px` : '0px';

  return (
    <div 
      className={`relative w-full h-52 md:h-60 rounded-3xl group shadow-[0_0_5px_#ffffff] ${
        isDefault ? 'bg-white/10 backdrop-blur-[24px] border border-white/10' : 'bg-slate-900'
      }`}
      style={{ marginBottom: bannerMarginBottom }}
    >
      
      {/* Clipped Backgrounds & Overlays */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {/* Background Image (Right side) */}
        {!isDefault ? (
          <div className="absolute inset-0 w-full h-full">
            {store?.bannerUrl ? (
              <img src={store.bannerUrl} alt="" className="w-full h-full object-cover object-center opacity-80"/>
            ) : (
              <div className="w-full h-full bg-slate-800" />
            )}
          </div>
        ) : (
          <>
            {store?.bannerUrl && (
              <img src={store.bannerUrl} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover object-left opacity-15"/>
            )}
            {/* Glowing orbs */}
            <div className="absolute top-3 sm:p-4 right-24 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl"/>
            <div className="absolute bottom-0 left-1/3 w-48 h-24 bg-violet-500/10 rounded-full blur-3xl"/>
          </>
        )}
        
        {!isDefault && (
          <>
            {/* Overlay gradient for the right side */}
            <div className="absolute inset-0 opacity-40 mix-blend-color" style={{ background: `linear-gradient(to right, transparent, ${style.strokeColor})` }}></div>
            <div className="absolute inset-0 bg-black/10"></div>
          </>
        )}

        {/* SVG Split Divider (Left side) */}
        {!isDefault ? (
          <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 1000 300" preserveAspectRatio="none">
            {/* Solid left fill */}
            <path d={style.path} fill={style.leftFill} fillOpacity="0.95" />
            {/* Optional crisp border stroke without glow */}
            {style.strokeWidth > 0 && <path d={style.path} fill="none" stroke={style.strokeColor} strokeWidth={style.strokeWidth} vectorEffect="non-scaling-stroke" opacity="0.8" />}
          </svg>
        ) : (
          <svg className="absolute inset-0 w-full h-full opacity-60 z-10" viewBox="0 0 500 240" preserveAspectRatio="none">
            <path d="M0,140 C80,50 190,200 300,105 C400,20 440,170 500,90 L500,240 L0,240 Z" fill="#7c3aed" fillOpacity="0.6"/>
            <path d="M0,175 C110,110 215,195 340,145 C445,100 468,170 500,130 L500,240 L0,240 Z" fill="#7c3aed" fillOpacity="0.3"/>
            <path d="M0,200 C130,155 230,210 360,170 C460,135 480,195 500,165 L500,240 L0,240 Z" fill="#6d28d9" fillOpacity="0.2"/>
          </svg>
        )}
      </div>

      {/* Content (Over the dark left area) */}
      <div className="relative z-50 h-full flex items-center gap-5 sm:p-6 px-6 md:px-10 w-[85%] md:w-3/4">
        {/* Logo */}
        <div 
          className={`w-20 h-20 md:w-[104px] md:h-[104px] ${style.logoShape} border-2 border-white/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_5px_#ffffff] overflow-hidden relative backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_10px_#ffffff]`} 
          style={{ 
            backgroundColor: `${style.leftFill}e6`,
            marginTop: `${brandConfig?.logoMarginTop || 0}px`,
            marginBottom: `${brandConfig?.logoMarginBottom || 0}px`,
            marginLeft: `${brandConfig?.logoMarginLeft || 0}px`,
            marginRight: `${brandConfig?.logoMarginRight || 0}px`
          }}
        >
          {store?.logoUrl
            ? <img src={store.logoUrl} alt="logo" className="w-full h-full object-cover"/>
            : <span className="text-4xl font-black text-white">{store?.storeName?.charAt(0) || 'S'}</span>
          }
          {/* verified badge */}
          {store?.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-black text-white">
              <ShieldCheck size={12} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center mt-2">
          <h1 className="text-xl md:text-2xl font-black text-black truncate uppercase tracking-widest leading-tight">{store?.storeName || 'Store Name'}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider ${cfg.badge}`}>
              {cfg.gem} {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-gray-300 text-xs font-semibold">
              <Star size={12} fill="currentColor" className="text-white"/> {store?.averageRating || '4.9'} ({store?.totalReviews || '8.2'}k)
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-white/60 text-xs flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={11}/>{store?.country||'Nigeria'}</span>
            <span className="font-semibold text-white/80">{(followersCount||0).toLocaleString()} Followers</span>
            <button 
              type="button"
              onClick={onOpenBanRatingModal}
              title="Click to check store suspension risk"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white border border-white/20 backdrop-blur-sm shadow-sm hover:bg-black/90 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <AlertTriangle size={11} className="text-red-400" />
              Banning Rate: <span className={(store?.banningRate ?? 0) >= 50 ? 'text-red-400 font-black' : (store?.banningRate ?? 0) >= 30 ? 'text-amber-400 font-black' : 'text-emerald-400 font-black'}>{store?.banningRate ?? 0}%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Follow / Owner Action Button (Right aligned in the banner) */}
      <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
        {isOwner ? (
          <motion.button 
            whileHover={{ scale:1.05 }} 
            whileTap={{ scale:0.95 }} 
            onClick={onManageStore}
            className="px-5 py-2.5 rounded-full text-sm font-bold shadow-xl backdrop-blur-sm transition-all duration-300 bg-white text-black hover:bg-gray-100 hover:shadow-2xl flex items-center gap-2 cursor-pointer"
          >
            <span>⚙️</span> Manage Store
          </motion.button>
        ) : (
          <motion.button 
            whileHover={{ scale:1.05 }} 
            whileTap={{ scale:0.95 }} 
            onClick={onFollow}
            className={`px-5 py-2.5 rounded-full text-sm font-bold shadow-xl backdrop-blur-sm transition-all duration-300 cursor-pointer ${isFollowing ? 'bg-white/15 text-white border border-white/30' : 'bg-white text-black hover:bg-gray-100 hover:shadow-2xl'}`}
          >
            {isFollowing ? '✓ Following' : 'Follow Store'}
          </motion.button>
        )}
      </div>
    </div>
  );
};

/* ─────────────── PRODUCT GRID ─────────────── */
const ProductCard = ({ product, onAddToCart, onClick, index = 0, themeColor, isDark, showPrice = true, showAddToCart = true }) => (
  <motion.div variants={fadeUp} custom={index}>
    <SmartProductCard product={product} onAddToCart={(product) => onAddToCart(null, product?.id)} />
  </motion.div>
);

/* ─────────────── UNIFIED PORTFOLIO ─────────────── */


const UnifiedPortfolio = ({ store, brandConfig, handleAddToCart, handleFollow, isFollowing, followersCount, tier, isOwner = false, onManageStore }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showBanRatingModal, setShowBanRatingModal] = useState(false);
  const navigate = useNavigate();
  const { cartItems, addToCart } = useCartStore();
  const [wishlist, setWishlist] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  // Parse legacy locationDescription into deliveryRoute if not present
  let activeDeliveryRoute = brandConfig?.aboutConfig?.deliveryRoute || [];
  if (activeDeliveryRoute.length === 0 && brandConfig?.aboutConfig?.locationDescription) {
    const rawStops = (brandConfig.aboutConfig.locationDescription || "Lagos-Ibadan-Akinyele-Oyo-Owode-Dansaria-Daccamca-Surulere").split(/[-]+/);
    activeDeliveryRoute = rawStops.map(stopName => {
      const match = NIGERIA_LOCATIONS.find(loc => loc.name.toLowerCase() === stopName.trim().toLowerCase() || loc.id.toLowerCase() === stopName.trim().toLowerCase());
      if (match) return match;
      return null;
    }).filter(Boolean);
  }
  const [collections, setCollections] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  
  const products = store?.products || [];

  const storeConfig = brandConfig?.storeConfig || {};
  const promoConfig = brandConfig?.promoConfig || {};
  const reviewsConfig = brandConfig?.reviewsConfig || { showReviews: true };
  const animConfig = brandConfig || {};

  const isPremiumStore = tier === 'pro' || tier === 'ultra';
  const isDark = tier === 'ultra';

  const currentFont = storeConfig.font || brandConfig?.fontFamily || 'Inter';
  const primaryColor = storeConfig.primaryColor || store?.primaryColor;
  const secondaryColor = storeConfig.secondaryColor || store?.secondaryColor || (isDark ? '#050505' : '#f9fafb');
  const storeName = storeConfig.storeName || store?.storeName || 'Store Name';
  const productCount = storeConfig.productCount || 4;
  const productLayoutType = storeConfig.productLayout || brandConfig?.productLayout || 'premium-coverflow';

  useEffect(() => {
    const fetchExtras = async () => {
      if (!store?.id) return;
      try {
        setLoadingExtras(true);
        // We will build these endpoints on the backend
        const [revRes, colRes] = await Promise.all([
          apiClient.get(`/api/v1/stores/${store.id}/reviews`),
          apiClient.get(`/api/v1/stores/${store.id}/collections`)
        ]);
        
        if (revRes.data.success) setReviews(revRes.data.reviews || []);
        if (colRes.data.success) setCollections(colRes.data.collections || []);
      } catch (err) {
        console.error("Failed to fetch store extras", err);
      } finally {
        setLoadingExtras(false);
      }
    };
    
    fetchExtras();
  }, [store?.id]);

  // Dynamically load Google Font
  useEffect(() => {
    if (currentFont && currentFont !== 'monospace') {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${currentFont.replace(/ /g, '+')}:wght@400;600;700;800;900&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => { 
        if (document.head.contains(link)) {
          document.head.removeChild(link); 
        }
      };
    }
  }, [currentFont]);

  // Extract dynamic theme color from the selected layout style
  const styleParams = generateBannerStyle(brandConfig?.style || 'Default', { 
    primary: primaryColor, 
    secondary: secondaryColor,
    tier: tier?.toLowerCase()
  });
  const themeColor = styleParams.strokeColor;

  const TABS = ['home', 'products', 'collections', ...(reviewsConfig.showReviews !== false ? ['reviews'] : []), 'about'];

  return (
    <div 
      className={`min-h-screen overflow-x-hidden pb-24 ${isDark ? 'text-white' : 'text-gray-900'}`}
      style={{ fontFamily: `'${currentFont}', sans-serif`, backgroundColor: secondaryColor }}
    >
      {/* Announcement Bar */}
      {promoConfig?.announcementBar && (
        <div className="max-w-5xl mx-auto px-4 pt-6 z-50 relative">
          <div 
            className={`w-full text-center py-2.5 px-4 text-sm font-bold rounded-2xl transition-all ${
              isDark 
                ? 'bg-white/10 backdrop-blur-[24px] border border-white/10 shadow-[0_0_5px_#ffffff] text-white' 
                : 'shadow-lg text-white'
            }`}
            style={isDark ? {} : { backgroundColor: promoConfig.announcementBg || themeColor }}
          >
            {promoConfig.announcementText}
          </div>
        </div>
      )}

      {/* Banner */}
      <div className={`max-w-5xl mx-auto px-4 ${promoConfig?.announcementBar ? 'pt-4' : 'pt-6'}`}>
        <DynamicBannerEngine 
          store={{ ...store, storeName }} 
          brandConfig={brandConfig} 
          isFollowing={isFollowing} 
          followersCount={followersCount} 
          onFollow={handleFollow} 
          tier={tier} 
          styleId={brandConfig?.style || 'Default'}
          onOpenBanRatingModal={() => setShowBanRatingModal(true)}
          isOwner={isOwner}
          onManageStore={onManageStore || (() => navigate('/seller/dashboard'))}
        />
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-5">
        <div className={`flex border-b overflow-x-auto no-scrollbar ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold capitalize whitespace-nowrap transition-all border-b-2 -mb-px 
                  ${!isActive 
                    ? (isDark ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600')
                    : ''
                  }`}
                style={isActive ? { borderColor: themeColor, color: themeColor } : {}}
              >
                {tab === 'about' ? 'About Store' : tab}
              </button>
              );
            })}
          </div>
        </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div 
          className={isDark ? 'relative bg-white/10 backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-[2.5rem] p-6 sm:p-8 overflow-hidden' : 'relative bg-white border border-gray-200 shadow-xl rounded-[2.5rem] p-6 sm:p-8'}
        >
          {isDark && (
            <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)' }} />
          )}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
            {/* HOME TAB */}
            {activeTab === 'home' && (
              <div>
                {products.length === 0 ? (
                  <div className={`py-20 text-center ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                    <Package size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-200'}`}/>
                    <p className="font-semibold">No products listed yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Featured Products</h2>
                        <button onClick={() => setActiveTab('products')} className="text-sm font-semibold hover:underline" style={{ color: themeColor }}>View All</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:p-4 mb-12">
                      {products.slice(0, productCount).map(p => (
                        <ProductCard 
                          key={p.id} 
                          product={p} 
                          onAddToCart={handleAddToCart} 
                          themeColor={themeColor} 
                          isDark={isDark}
                          showPrice={storeConfig.showPrice !== false}
                          showAddToCart={storeConfig.showAddToCart !== false}
                        />
                      ))}
                    </div>

                    {/* Buyer Trust & Store Safety Section (Positioned at Bottom) */}
                    <div className="mt-8 pt-8 border-t border-gray-200/40 dark:border-white/10">
                      <div className="flex flex-col lg:flex-row items-stretch gap-6">
                        <div className="w-full lg:w-96 shrink-0">
                          <BanningRateCard banningRate={store?.banningRate ?? 0} />
                        </div>
                        <div className={`flex-1 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between ${
                          isDark 
                            ? 'bg-white/5 border-white/10 text-white' 
                            : 'bg-gradient-to-br from-gray-50 to-white border-gray-200 text-gray-900 shadow-sm'
                        }`}>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldCheck className="w-6 h-6 text-emerald-500" />
                              <h3 className="font-bold text-lg">Verified Store Health & Buyer Protection</h3>
                            </div>
                            <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              Check this seller's banning risk before placing an order. Stores with low suspension rates consistently fulfill orders on time and maintain clean dispute records.
                            </p>
                          </div>
                          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <div>
                              <span className="text-xs text-gray-400 block font-medium">Platform Escrow</span>
                              <span className="font-bold text-emerald-500 text-sm">100% Protected</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400 block font-medium">Customer Rating</span>
                              <span className="font-bold text-sm flex items-center gap-1 mt-0.5">
                                <Star size={13} fill="currentColor" className="text-amber-400" />
                                {store?.averageRating || '5.0'}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-xs text-gray-400 block font-medium">Account Status</span>
                              <span className="font-bold text-sm text-blue-500">
                                {store?.approvalStatus || 'APPROVED'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div>
                <h2 className={`text-xl font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>All Products</h2>
                {products.length === 0 ? (
                  <div className={`py-20 text-center ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                    <Package size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-200'}`}/>
                    <p className="font-semibold">No products listed yet.</p>
                  </div>
                ) : (
                  isPremiumStore ? (
                    <div className="-mx-4 sm:mx-0">
                      <LayoutEngine 
                          section={{ type: productLayoutType, title: '' }} 
                          products={products} 
                          addToCart={handleAddToCart} 
                          animationConfig={{ hoverEffect: 'lift', buttonStyle: 'magnetic' }}
                      />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="w-full py-20 text-center">
                      <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-500'}`}>No products available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:p-4">
                      {products.map((p, i) => (
                        <ProductCard 
                          key={p.id} 
                          product={p} 
                          index={i} 
                          onClick={() => navigate(`/product/${p.id}`)}
                          onAddToCart={handleAddToCart} 
                          themeColor={themeColor} 
                          isDark={isDark}
                          showPrice={storeConfig.showPrice !== false}
                          showAddToCart={storeConfig.showAddToCart !== false}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* COLLECTIONS TAB */}
            {activeTab === 'collections' && (
              <div>
                <h2 className={`text-xl font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Store Collections</h2>
                {loadingExtras ? (
                   <div className={`py-10 text-center animate-pulse ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className={`py-20 text-center ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                    <Layout size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-200'}`}/>
                    <p className="font-semibold">No collections created yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {collections.map(col => (
                      <div key={col.id} className={`group relative h-48 rounded-xl overflow-hidden cursor-pointer ${isDark ? 'shadow-[0_0_5px_#ffffff]' : 'shadow-sm'}`}>
                          <img src={col.imageUrl || PLACEHOLDER_IMAGE} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                              <h3 className="text-white font-bold text-lg">{col.name}</h3>
                              <p className="text-white/80 text-sm">{col._count?.products || 0} Items</p>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div>
                <h2 className={`text-xl font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Customer Reviews</h2>
                {loadingExtras ? (
                   <div className={`py-10 text-center animate-pulse ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className={`py-20 text-center ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                    <MessageSquare size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-200'}`}/>
                    <p className="font-semibold">No reviews for this store yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className={`rounded-xl p-5 shadow-[0_0_5px_#ffffff] transition-all ${isDark ? 'bg-white/10 backdrop-blur-[24px] border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                          <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                  {review.user?.avatarUrl ? (
                                      <img src={review.user.avatarUrl} alt="" className="w-full h-full object-cover"/>
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 font-bold">
                                          {review.user?.fullName?.charAt(0) || 'U'}
                                      </div>
                                  )}
                              </div>
                              <div>
                                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{review.user?.fullName || 'Anonymous User'}</p>
                                  <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                      {[...Array(5)].map((_, i) => (
                                          <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                                      ))}
                                  </div>
                              </div>
                              <span className={`ml-auto text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{review.comment}</p>
                          {review.reply && (
                              <div className={`mt-3 p-3 rounded-lg text-sm border-l-2 border-[var(--accent-primary)] ${isDark ? 'bg-white/5 text-white/80' : 'bg-gray-50 text-gray-700'}`}>
                                  <p className="font-semibold mb-1">Seller Reply:</p>
                                  <p className="whitespace-pre-wrap">{review.reply}</p>
                              </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="max-w-2xl">
                <h2 className={`text-xl font-bold mb-5 ${tier === 'ultra' ? 'text-white' : 'text-gray-900'}`}>About {store?.storeName}</h2>
                <p className={`mb-8 leading-relaxed ${tier === 'ultra' ? 'text-gray-300' : 'text-gray-600'}`}>{store?.description || 'No description provided.'}</p>

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

                <div className="mb-6">
                  <BanningRateCard banningRate={store?.banningRate ?? 0} />
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-gray-400"/>
                    <span className="text-sm font-semibold text-gray-600">Store Details</span>
                  </div>
                  {store?.country && <p className="text-sm text-gray-600 flex items-center gap-1"><MapPin size={14}/> {store.country}</p>}
                  {store?.isVerified && <p className="text-sm text-green-600 flex items-center gap-1 mt-1"><ShieldCheck size={14}/> Verified Store</p>}
                </div>

                {/* Delivery Route / Location Map */}
                {activeDeliveryRoute.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm mb-6 overflow-hidden">
                        <h4 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2"><MapPin size={16}/> Interactive Delivery Route</h4>
                        <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                            <div className="absolute inset-0">
                                {(() => {
                                    const mapMarkers = activeDeliveryRoute.map((loc, idx, arr) => {
                                        const isFirst = idx === 0;
                                        const isLast = idx === arr.length - 1;
                                        let type = 'WAYPOINT';
                                        if (isFirst) type = 'PICKUP';
                                        else if (isLast) type = 'DROPOFF';

                                        return {
                                            id: `wp-${idx}`,
                                            lat: loc.lat,
                                            lng: loc.lng,
                                            type: type,
                                            popup: `<div style="font-weight:bold">${loc.name}</div><div style="font-size:10px;color:gray">${isFirst ? 'Origin' : isLast ? 'Destination' : 'Transit Point'}</div>`
                                        };
                                    });

                                    const path = activeDeliveryRoute.map(loc => ({ lat: loc.lat, lng: loc.lng }));
                                    const center = path.length > 0 ? path[0] : { lat: 9.0820, lng: 8.6753 };

                                    return (
                                        <GoogleMapProvider center={center} markers={mapMarkers}>
                                            {path.length > 1 && <PolylineF path={path} options={{ strokeColor: '#22c55e', strokeWeight: 3, strokeOpacity: 0.8 }} />}
                                        </GoogleMapProvider>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto py-3 whitespace-nowrap text-sm mt-2 no-scrollbar">
                            {activeDeliveryRoute.map((loc, i, arr) => (
                                <React.Fragment key={i}>
                                    <span className="font-semibold text-gray-800">{loc.name}</span>
                                    {i < arr.length - 1 && <span className="text-gray-400">→</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm mb-6">
                        <h4 className="text-sm font-semibold text-gray-600 mb-4">Delivery Route / Location Map</h4>
                        <div className="flex flex-col gap-0 font-mono text-sm pl-2">
                            {(brandConfig?.aboutConfig?.locationDescription || "Lagos-Ibadan-Akinyele-Oyo-Owode-Dansaria-Daccamca-Surulere").split(/[-]+/).map((loc, i, arr) => {
                                const isFirst = i === 0;
                                const isLast = i === arr.length - 1;
                                
                                let icon = '⚪';
                                let color = 'text-gray-400';
                                
                                if (isFirst) {
                                    icon = '🔵';
                                    color = 'text-blue-500 font-bold';
                                } else if (isLast) {
                                    icon = '🔴';
                                    color = 'text-red-500 font-bold';
                                } else if (i === 1) {
                                    icon = '🟠'; 
                                    color = 'text-orange-500 font-bold';
                                }

                                return (
                                    <div key={i} className="flex flex-col items-start relative">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg w-6 text-center">{icon}</span>
                                            <span className={color}>{loc.trim()}</span>
                                        </div>
                                        {!isLast && (
                                            <div className="flex flex-col justify-center items-center w-6 h-6 ml-0">
                                                <div className="w-0.5 h-full" style={{ borderLeft: '2px dotted rgba(156,163,175,0.8)' }}></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Refund Policy */}
                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm mb-6">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Refund Policy</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{brandConfig?.aboutConfig?.refundPolicy || "No refund policy specified by the seller."}</p>
                </div>

                {/* Return Policy */}
                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5 shadow-sm mb-6">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Return Policy</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{brandConfig?.aboutConfig?.returnPolicy || "No return policy specified by the seller."}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {tier === 'ultra' && (() => {
          const personalCartItems = cartItems.filter(item => item.sellerId === store?.sellerId);
          const personalCartTotal = personalCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const personalCartCount = personalCartItems.reduce((sum, item) => sum + item.quantity, 0);

          if (personalCartCount === 0) return null;

          return (
              <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
                  <button 
                      onClick={() => navigate(`/cart?sellerId=${store.sellerId}`)}
                      className="flex items-center gap-4 bg-gradient-to-r from-gray-900 to-black text-white px-6 py-4 rounded-full shadow-2xl hover:scale-105 transition-transform border border-gray-700"
                  >
                      <div className="relative">
                          <span className="text-2xl">🛍️</span>
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900">
                              {personalCartCount}
                          </span>
                      </div>
                      <div className="flex flex-col text-left border-l border-white/20 pl-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Checkout {store?.storeName}</span>
                          <span className="font-black text-lg">₦{personalCartTotal.toLocaleString()}</span>
                      </div>
                  </button>
              </div>
          );
      })()}

      {/* Ban Rating Bottom Modal / Sheet */}
      <AnimatePresence>
        {showBanRatingModal && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowBanRatingModal(false)}
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle indicator on mobile */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Store Health & Suspension Risk</h3>
                </div>
                <button 
                  onClick={() => setShowBanRatingModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <BanningRateCard banningRate={store?.banningRate ?? 0} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
</div>
  );
};

export default UnifiedPortfolio;
