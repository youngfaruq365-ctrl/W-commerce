import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StoreBannerEngine from '../../storefront/StoreBannerEngine';
import LayoutEngine from '../../storefront/LayoutEngine';
import UnifiedPortfolio, { generateBannerStyle } from '../../../pages/portfolios/UnifiedPortfolio';
import { Settings, Image as ImageIcon, LayoutTemplate, MessageSquare, Star, Plus, X, Trash2, Check, MapPin, Sparkles, ShoppingBag, Clock, Tag, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { NIGERIA_LOCATIONS } from '../../../utils/nigeriaLocations';
import toast from 'react-hot-toast';
import { PLACEHOLDER_AVATAR, PLACEHOLDER_BANNER } from '@/constants/placeholders';

import { categories } from '../../../config/bannerStyles';
import { layoutLibrary } from '../../../config/layoutLibrary';

const FONTS = [
  'Inter', 'Playfair Display', 'Syne', 'Montserrat', 'Poppins', 'Lato', 'Roboto', 'Oswald',
  'Raleway', 'Nunito', 'Ubuntu', 'Merriweather', 'Lora', 'PT Serif', 'Mukta', 'Rubik',
  'Work Sans', 'Fira Sans', 'Quicksand', 'Karla', 'Inconsolata', 'Space Grotesk', 'Outfit',
  'Manrope', 'Cinzel', 'Josefin Sans', 'DM Sans', 'Cabin', 'Anton', 'Teko', 'Bebas Neue',
  'Righteous', 'Permanent Marker', 'Amatic SC', 'Caveat', 'Pacifico', 'Dancing Script',
  'Satisfy', 'Courgette', 'Great Vibes', 'Zilla Slab', 'Arvo', 'Rokkitt', 'Crete Round',
  'Cormorant Garamond', 'EB Garamond', 'Crimson Text', 'Libre Baskerville', 'Abril Fatface', 'Comfortaa'
];

const DesignStudio = () => {
  const [template, setTemplate] = useState({
    style: 'Default',
    fontFamily: 'Inter',
    bgImage: PLACEHOLDER_BANNER,
    title: 'Welcome to our store',
    subtitle: 'Discover our premium collections',
    overlayColor: 'rgba(15, 23, 42, 0.4)',
    themeColor: '#ffffff',
    buttonAnim: 'ripple',
    borderAnim: 'gemini',
    hoverAnim: 'lift',
    modalAnim: 'pop'
  });

  const [store, setStore] = useState({
    storeName: 'My Premium Store',
    tagline: 'Curated products for a better life',
    primaryColor: '#0f172a',
    secondaryColor: '#f8fafc',
    font: 'Inter',
    layout: 'Classic',
    cardStyle: 'Clean',
    gridLayout: '3-col grid',
    showPrice: true,
    showRating: true,
    showAddToCart: true,
    showSold: true,
    productCount: 3,
    productModalStyle: 'Classic'
  });

  const [promo, setPromo] = useState({
    announcementBar: true,
    announcementText: '🎉 Free shipping on all orders over ₦50!',
    announcementBg: '#3b82f6',
    voucher: true,
    voucherCode: 'WELCOME20',
    voucherLabel: 'Get 20% off your first order',
    countdown: true,
    countdownTitle: 'Flash Sale Ends In:',
    countdownEndDate: new Date(Date.now() + 86400000).toISOString(),
    linkedProductTemplate: 'Banner',
    linkedProductId: ''
  });

  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isBannerLayoutModalOpen, setIsBannerLayoutModalOpen] = useState(false);
  const [recentColors, setRecentColors] = useState(null);

  const [reviewsConfig, setReviewsConfig] = useState({
    showReviews: true,
    layout: 'Carousel', // Carousel, Grid, List
    style: 'Cards' // Cards, Minimal
  });

  const [aboutConfig, setAboutConfig] = useState({
    locationDescription: 'oyo-----akinyele-----ibadan----lagos----oshodi----dot to my store',
    deliveryRoute: [],
    refundPolicy: '30-day no questions asked refund policy.',
    returnPolicy: 'Items can be returned within 14 days of receipt.'
  });

  const [activeMainTab, setActiveMainTab] = useState('Store'); 
  const [activeTab, setActiveTab] = useState('Geometric');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('settings'); // 'settings' or 'preview'

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get('/api/v1/products/my-products', { withCredentials: true });
        if (res.data.success) {
          setProducts(res.data.products);
        }
      } catch (err) {
        // Error handled silently
      }
    };
    
    const fetchStoreConfig = async () => {
      try {
        const res = await axios.get('/api/v1/stores/profile', { withCredentials: true });
        if (res.data.success && res.data.data) {
          const storeData = res.data.data;
          if (storeData.portfolioConfig) {
             const parsed = JSON.parse(storeData.portfolioConfig);
             setTemplate(prev => ({ ...prev, ...parsed }));
             if (parsed.storeConfig) setStore(prev => ({ ...prev, ...parsed.storeConfig }));
             if (parsed.promoConfig) setPromo(prev => ({ ...prev, ...parsed.promoConfig }));
             if (parsed.reviewsConfig) setReviewsConfig(prev => ({ ...prev, ...parsed.reviewsConfig }));
             if (parsed.aboutConfig) setAboutConfig(prev => ({ ...prev, ...parsed.aboutConfig }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch store layout", err);
      }
    };

    fetchProducts();
    fetchStoreConfig();
  }, []);

  const handleUpdate = (key, value) => setTemplate(prev => ({ ...prev, [key]: value }));
  const handleStoreUpdate = (key, value) => setStore(prev => ({ ...prev, [key]: value }));
  const handleStoreBrandConfigUpdate = (key, value) => setStore(prev => ({
    ...prev,
    brandConfig: { ...(prev.brandConfig || {}), [key]: value }
  }));
  const handlePromoUpdate = (key, value) => setPromo(prev => ({ ...prev, [key]: value }));

  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  useEffect(() => {
    const timer = setInterval(() => {
      const end = new Date(promo.countdownEndDate).getTime();
      const now = new Date().getTime();
      const distance = end - now;
      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [promo.countdownEndDate]);

  const displayProducts = products.length > 0 ? products.slice(0, store.productCount) : Array(parseInt(store.productCount)).fill({ id: 'dummy' });

  const previewBrandConfig = {
    ...template,
    storeConfig: store,
    promoConfig: promo,
    reviewsConfig,
    aboutConfig
  };

  const previewStore = {
    id: 'preview-1',
    sellerId: 'preview-seller-1',
    storeName: store.storeName,
    logoUrl: store.logoUrl || PLACEHOLDER_AVATAR,
    bannerUrl: store.bannerUrl || PLACEHOLDER_BANNER,
    country: 'USA',
    createdAt: new Date().toISOString(),
    seller: {
      name: 'Your Name',
      avatar: PLACEHOLDER_AVATAR,
      verified: true
    },
    metrics: {
      followers: 1250,
      likes: 8500,
      products: products.length,
      rating: 4.9,
      reviews: 120
    },
    products: displayProducts
  };

  return (
    <div className="flex flex-col h-full min-h-[700px] bg-slate-50 dark:bg-black overflow-hidden font-sans rounded-2xl border border-slate-200 dark:border-white/10">
      
      {/* Top Level Tab Switcher */}
      <div className="flex w-full bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 z-50 shadow-sm shrink-0">
        <button 
          onClick={() => setViewMode('settings')} 
          className={`flex-1 py-4 text-center font-bold tracking-wide transition-all ${viewMode === 'settings' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 bg-slate-50 dark:bg-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-50 dark:bg-black'}`}
        >
          Configuration Settings
        </button>
        <button 
          onClick={() => setViewMode('preview')} 
          className={`flex-1 py-4 text-center font-bold tracking-wide transition-all ${viewMode === 'preview' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 bg-slate-50 dark:bg-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-50 dark:bg-black'}`}
        >
          Live Storefront Preview
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
      {/* Settings View */}
      {viewMode === 'settings' && (
      <aside className="w-full max-w-4xl mx-auto h-full bg-white dark:bg-[#0a0a0a] flex flex-col z-20">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Design Studio</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Configure your storefront</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={async () => {
                if (!window.confirm('Are you sure you want to clear all designs and return to the default store style?')) return;
                setIsSaving(true);
                try {
                  await axios.put('/api/v1/stores/layout', {}, { withCredentials: true });
                  toast.success('Design reset successfully! Please refresh the page.');
                  window.location.reload();
                } catch (err) {
                  toast.error('Failed to reset design');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="px-6 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all duration-300"
            >
              Reset to Default
            </button>
            <button 
              onClick={async () => {
                setIsSaving(true);
                try {
                  const payload = { ...template, storeConfig: store, promoConfig: promo, reviewsConfig, aboutConfig };
                  await axios.put('/api/v1/stores/layout', payload, { withCredentials: true });
                toast.success('Design saved successfully!');
              } catch (err) {
                toast.error('Failed to save design');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black rounded-xl font-bold transition-all duration-300 shadow-md"
          >
            {isSaving ? 'Saving...' : 'Save Design'}
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* Main Tabs */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-white/5 p-1 rounded-xl gap-1">
            {['Store', 'Banner', 'Products', 'Promos', 'Anim', 'Reviews', 'About'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-lg transition-all ${activeMainTab === tab || (activeMainTab === 'Promotions' && tab === 'Promos') || (activeMainTab === 'Animations' && tab === 'Anim') ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeMainTab === 'Store' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Brand Identity</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Store Name</label>
                  <input type="text" value={store.storeName} onChange={(e) => handleStoreUpdate('storeName', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Tagline</label>
                  <input type="text" value={store.tagline} onChange={(e) => handleStoreUpdate('tagline', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Colors & Typography</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (!recentColors) setRecentColors({ primary: store.primaryColor, secondary: store.secondaryColor });
                        handleStoreUpdate('primaryColor', '#101827');
                        handleStoreUpdate('secondaryColor', '#ffffff');
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
                    >
                      Light
                    </button>
                    <button 
                      onClick={() => {
                        if (!recentColors) setRecentColors({ primary: store.primaryColor, secondary: store.secondaryColor });
                        handleStoreUpdate('primaryColor', '#f8fafc');
                        handleStoreUpdate('secondaryColor', '#0a0a0a');
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#111] text-white hover:bg-black transition-colors"
                    >
                      Dark
                    </button>
                    <button 
                      onClick={() => {
                        if (recentColors) {
                          handleStoreUpdate('primaryColor', recentColors.primary);
                          handleStoreUpdate('secondaryColor', recentColors.secondary);
                          setRecentColors(null);
                        }
                      }}
                      disabled={!recentColors}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Default
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Primary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={store.primaryColor} onChange={(e) => handleStoreUpdate('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs">{store.primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Secondary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={store.secondaryColor} onChange={(e) => handleStoreUpdate('secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs">{store.secondaryColor}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Font Family</label>
                  <select value={store.font} onChange={(e) => handleStoreUpdate('font', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white">
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Banner' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              {/* Existing Banner Controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Content</h3>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Headline</label>
                  <input type="text" value={template.title} onChange={(e) => handleUpdate('title', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Subtitle</label>
                  <input type="text" value={template.subtitle} onChange={(e) => handleUpdate('subtitle', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Background Image URL</label>
                  <input type="text" value={template.bgImage} onChange={(e) => handleUpdate('bgImage', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Logo Positioning</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Margin Top: {template.logoMarginTop || 0}px</label>
                    <input type="range" min="-100" max="100" value={template.logoMarginTop || 0} onChange={(e) => handleUpdate('logoMarginTop', parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Margin Bottom: {template.logoMarginBottom || 0}px</label>
                    <input type="range" min="-100" max="100" value={template.logoMarginBottom || 0} onChange={(e) => handleUpdate('logoMarginBottom', parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Margin Left: {template.logoMarginLeft || 0}px</label>
                    <input type="range" min="-100" max="100" value={template.logoMarginLeft || 0} onChange={(e) => handleUpdate('logoMarginLeft', parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Margin Right: {template.logoMarginRight || 0}px</label>
                    <input type="range" min="-100" max="100" value={template.logoMarginRight || 0} onChange={(e) => handleUpdate('logoMarginRight', parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Banner Layout Style</h3>
                <button 
                  onClick={() => setIsBannerLayoutModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <span className="font-semibold text-slate-700 dark:text-white capitalize">
                    {template.style || 'Default Style'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Browse Styles</span>
                    <LayoutTemplate size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Products' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Product Layout (Pro/Ultra)</h3>
                <button 
                  onClick={() => setIsLayoutModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <span className="font-semibold text-slate-700 capitalize">
                    {layoutLibrary.find(l => l.id === (store.productLayout || 'premium-coverflow'))?.title || 'Premium Coverflow'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Live Preview</span>
                    <LayoutTemplate size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mt-4">Card Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Clean', 'Glassmorphism', 'Polaroid', 'Dark'].map(style => (
                    <button key={style} onClick={() => handleStoreUpdate('cardStyle', style)} className={`py-2 text-xs font-bold rounded-lg border ${store.cardStyle === style ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-[#0a0a0a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-white/10'}`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mt-4">Modal Layout Style</label>
                <select value={store.productModalStyle || 'Classic'} onChange={(e) => handleStoreUpdate('productModalStyle', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="Classic">Classic</option>
                  <option value="Split">Split Screen</option>
                  <option value="Floating">Floating Card</option>
                  <option value="Fullscreen">Fullscreen Overlay</option>
                </select>
              </div>
              <div className="space-y-4 mt-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Card Elements</h3>
                {['showPrice', 'showRating', 'showAddToCart', 'showSold'].map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={store[key]} onChange={(e) => handleStoreUpdate(key, e.target.checked)} className="rounded text-blue-500" />
                    <span className="text-sm text-slate-700 capitalize">{key.replace('show', '')}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">Product Count ({store.productCount})</label>
                <input type="range" min="3" max="12" step="3" value={store.productCount} onChange={(e) => handleStoreUpdate('productCount', e.target.value)} className="w-full" />
              </div>
            </motion.div>
          )}

          {(activeMainTab === 'Promotions' || activeMainTab === 'Promos') && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-3 bg-slate-50 dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-white">
                  <input type="checkbox" checked={promo.announcementBar} onChange={(e) => handlePromoUpdate('announcementBar', e.target.checked)} className="rounded text-blue-500" />
                  Announcement Bar
                </label>
                {promo.announcementBar && (
                  <>
                    <input type="text" value={promo.announcementText} onChange={(e) => handlePromoUpdate('announcementText', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm" placeholder="Text..." />
                    <div className="flex gap-2 items-center">
                      <input type="color" value={promo.announcementBg} onChange={(e) => handlePromoUpdate('announcementBg', e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
                      <span className="text-xs text-slate-500 dark:text-gray-400">Background</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-white">
                  <input type="checkbox" checked={promo.voucher} onChange={(e) => handlePromoUpdate('voucher', e.target.checked)} className="rounded text-blue-500" />
                  Voucher Strip
                </label>
                {promo.voucher && (
                  <>
                    <input type="text" value={promo.voucherCode} onChange={(e) => handlePromoUpdate('voucherCode', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm" placeholder="Code..." />
                    <input type="text" value={promo.voucherLabel} onChange={(e) => handlePromoUpdate('voucherLabel', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm" placeholder="Label..." />
                  </>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-white">
                  <input type="checkbox" checked={promo.countdown} onChange={(e) => handlePromoUpdate('countdown', e.target.checked)} className="rounded text-blue-500" />
                  Countdown Deal
                </label>
                {promo.countdown && (
                  <>
                    <input type="text" value={promo.countdownTitle} onChange={(e) => handlePromoUpdate('countdownTitle', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm" placeholder="Title..." />
                    <input type="datetime-local" value={promo.countdownEndDate ? promo.countdownEndDate.substring(0, 16) : ''} onChange={(e) => handlePromoUpdate('countdownEndDate', new Date(e.target.value).toISOString())} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                  </>
                )}
              </div>
              <div className="space-y-3 bg-slate-50 dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <label className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-white">
                  <Tag size={16} className="text-blue-500" />
                  Link to Product
                </label>
                <div className="space-y-2">
                  <select value={promo.linkedProductTemplate} onChange={(e) => handlePromoUpdate('linkedProductTemplate', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm">
                    <option value="Banner">Banner Overlay</option>
                    <option value="Popup">Popup Modal</option>
                    <option value="Inline">Inline Card</option>
                  </select>
                  <select value={promo.linkedProductId} onChange={(e) => handlePromoUpdate('linkedProductId', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm">
                    <option value="">Select a product...</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                    {(!products || products.length === 0) && <option value="demo">Demo Premium Product</option>}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {(activeMainTab === 'Animations' || activeMainTab === 'Anim') && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Button Style</label>
                <select value={template.buttonAnim} onChange={(e) => handleUpdate('buttonAnim', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm font-semibold text-slate-700 dark:text-gray-200">
                  <option value="ripple">Ripple Effect</option>
                  <option value="magnetic">Magnetic Snap</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Border Style</label>
                <select value={template.borderAnim} onChange={(e) => handleUpdate('borderAnim', e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm font-semibold text-slate-700 dark:text-gray-200">
                  <option value="gemini">Gemini Glow</option>
                  <option value="ai">AI Shimmer</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hover Effect</label>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                  {['lift', 'scale'].map(eff => (
                    <button key={eff} onClick={() => handleUpdate('hoverAnim', eff)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${template.hoverAnim === eff ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}>
                      {eff.charAt(0).toUpperCase() + eff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Modal Style</label>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                  {['pop', 'slide'].map(eff => (
                    <button key={eff} onClick={() => handleUpdate('modalAnim', eff)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${template.modalAnim === eff ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}>
                      {eff.charAt(0).toUpperCase() + eff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Reviews' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-white">
                <input type="checkbox" checked={reviewsConfig.showReviews} onChange={(e) => setReviewsConfig(prev => ({ ...prev, showReviews: e.target.checked }))} className="rounded text-blue-500" />
                Show Store Reviews
              </label>
              {reviewsConfig.showReviews && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Review Layout</label>
                    <select value={reviewsConfig.layout} onChange={(e) => setReviewsConfig(prev => ({ ...prev, layout: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white">
                      <option value="Carousel">Carousel</option>
                      <option value="Grid">Grid Layout</option>
                      <option value="List">List View</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Review Style</label>
                    <select value={reviewsConfig.style} onChange={(e) => setReviewsConfig(prev => ({ ...prev, style: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white">
                      <option value="Cards">Cards</option>
                      <option value="Minimal">Minimal</option>
                    </select>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeMainTab === 'About' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Delivery Route Map</label>
                <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <select id="route-location-select" className="flex-1 px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg text-sm">
                      <option value="">Select a location to add...</option>
                      {NIGERIA_LOCATIONS.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.state})</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 whitespace-nowrap"
                      onClick={() => {
                        const select = document.getElementById('route-location-select');
                        const selectedId = select.value;
                        if (!selectedId) return;
                        const loc = NIGERIA_LOCATIONS.find(l => l.id === selectedId);
                        if (loc) {
                          setAboutConfig(prev => ({
                            ...prev,
                            deliveryRoute: [...(prev.deliveryRoute || []), loc]
                          }));
                          select.value = '';
                        }
                      }}
                    >
                      Add Stop
                    </button>
                  </div>
                  
                  {aboutConfig.deliveryRoute && aboutConfig.deliveryRoute.length > 0 ? (
                    <div className="space-y-2 mt-4">
                      {aboutConfig.deliveryRoute.map((stop, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#0a0a0a] px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className={idx === 0 ? "text-blue-500" : (idx === aboutConfig.deliveryRoute.length - 1 ? "text-red-500" : "text-slate-500 dark:text-gray-400")} />
                            <span className="text-sm font-semibold">{stop.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAboutConfig(prev => ({
                                ...prev,
                                deliveryRoute: prev.deliveryRoute.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-red-500 hover:bg-red-50 dark:bg-red-500/10 p-1 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-gray-400 italic">No stops added. Add cities to build your delivery route map.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Refund Policy</label>
                <textarea value={aboutConfig.refundPolicy} onChange={(e) => setAboutConfig(prev => ({ ...prev, refundPolicy: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" rows="3"></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Return Policy</label>
                <textarea value={aboutConfig.returnPolicy} onChange={(e) => setAboutConfig(prev => ({ ...prev, returnPolicy: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm text-slate-900 dark:text-white" rows="3"></textarea>
              </div>
            </motion.div>
          )}
        </div>
      </aside>
      )}

      {/* Main Preview Area */}
      {viewMode === 'preview' && (
      <main className="flex-1 flex flex-col relative overflow-hidden" style={{ fontFamily: store.font, backgroundColor: store.secondaryColor }}>
        <div className="h-16 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-8 z-30 sticky top-0 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Live Storefront Preview</h1>
          <div className="text-sm font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">Interactive</div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-0">
          <UnifiedPortfolio 
            store={previewStore}
            brandConfig={previewBrandConfig}
            handleAddToCart={() => {}}
            handleFollow={() => {}}
            isFollowing={false}
            followersCount={previewStore.metrics.followers}
            tier="ultra"
          />
        </div>
      </main>
      )}
      </div>

      {/* Layout Selection Modal */}
      <AnimatePresence>
        {isLayoutModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setIsLayoutModalOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#0f172a] rounded-t-3xl shadow-2xl z-[101] flex flex-col overflow-hidden border-t border-slate-700"
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f172a] sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <LayoutTemplate className="text-blue-400" /> Choose Product Layout
                </h2>
                <button onClick={() => setIsLayoutModalOpen(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 bg-[#0a0a0a]">
                {layoutLibrary.map(layout => {
                  const isSelected = store.productLayout === layout.id;
                  
                  return (
                    <div key={layout.id} className={`relative rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-slate-800 hover:border-slate-600'}`}>
                      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex flex-col pointer-events-none">
                        <span className="text-white font-bold text-lg">{layout.title}</span>
                        <span className="text-slate-300 text-xs">{layout.desc}</span>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white p-2 rounded-full shadow-lg">
                          <Check size={20} />
                        </div>
                      )}

                      <div className="w-full bg-[#111] max-h-[500px] overflow-hidden relative pointer-events-none origin-top" style={{ zoom: 0.8 }}>
                        {/* We use scale or zoom to fit the preview nicely */}
                        <LayoutEngine 
                          section={{ type: layout.id, title: layout.title }} 
                          products={products?.slice(0, 5) || []} 
                          animationConfig={template} 
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          handleStoreUpdate('productLayout', layout.id);
                          setIsLayoutModalOpen(false);
                          toast.success(`${layout.title} layout applied!`);
                        }}
                        className={`absolute inset-0 w-full h-full z-0 cursor-pointer ${isSelected ? 'bg-blue-500/10' : 'bg-transparent hover:bg-white dark:bg-[#0a0a0a]/5'} transition-colors`}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    
      {/* Banner Layout Selection Modal */}
      <AnimatePresence>
        {isBannerLayoutModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
              onClick={() => setIsBannerLayoutModalOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-[#0a0a0a] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[101] flex flex-col overflow-hidden border-t border-white/10"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a] sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <LayoutTemplate className="text-blue-400" /> Layout Style
                </h2>
                <button onClick={() => setIsBannerLayoutModalOpen(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#0a0a0a] no-scrollbar">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(categories).map(cat => (
                    <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${activeTab === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                      {cat.replace(/([A-Z])/g, ' ₦1').trim()}
                    </button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {categories[activeTab]?.map(styleName => {
                      const st = generateBannerStyle(styleName, { primary: template.primaryColor, secondary: template.secondaryColor });
                      const isSelected = template.style === styleName;
                      return (
                      <button 
                        key={styleName} 
                        onClick={() => {
                          handleUpdate('style', styleName);
                          setIsBannerLayoutModalOpen(false);
                        }} 
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 hover:-translate-y-1 overflow-hidden group shadow-xl 
                        ${isSelected ? 'border-yellow-500/50 bg-[#151515] shadow-[0_0_20px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30' : 'border-white/10 bg-[#0a0a0a] hover:border-white/20 hover:shadow-2xl'}`}
                      >
                        {/* 3D Glass overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>
                        
                        {/* Mini SVG Preview */}
                        <div 
                          className="w-full h-16 mb-2 rounded-xl overflow-hidden bg-black relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]"
                          style={{ border: `1px solid ${st.strokeColor}` }}
                        >
                          {/* Mini background texture for right side */}
                          <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-slate-900 opacity-60"></div>
                          
                          <svg className="absolute inset-0 w-full h-full drop-shadow-xl" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            {/* Glow effect */}
                            <path d={st.path} fill="none" stroke={st.strokeColor} strokeWidth={st.strokeWidth * 10} opacity="0.4" filter="blur(4px)" vectorEffect="non-scaling-stroke" />
                            {/* Dark left fill */}
                            <path d={st.path} fill={st.leftFill} />
                            <path d={st.path} fill="none" stroke={st.strokeColor} strokeWidth={st.strokeWidth * 2} vectorEffect="non-scaling-stroke" />
                          </svg>
                          
                          {/* Mini 3D logo dot */}
                          <div 
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border shadow-[0_2px_5px_rgba(0,0,0,0.8)] backdrop-blur-sm"
                            style={{ borderColor: st.strokeColor, backgroundColor: `${st.leftFill}e6` }}
                          ></div>
                        </div>
                        
                        <span className={`text-xs font-bold capitalize tracking-wide ${isSelected ? 'text-yellow-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
                          {styleName.replace(/([A-Z])/g, ' ₦1').trim()}
                        </span>
                      </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
</div>
  );
};

export default DesignStudio;
