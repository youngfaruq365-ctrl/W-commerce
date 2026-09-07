import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StoreBannerEngine from '../../storefront/StoreBannerEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, Clock, Tag, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

const categories = {
  Geometric: ['slant', 'diagonalCut', 'triangle', 'chevron', 'hexagon', 'diamond', 'zigzag', 'stairs'],
  Organic: ['wave', 'blob', 'curve', 'cloud'],
  Premium: ['arch', 'pillar', 'split', 'minimal'],
  ProductFocused: ['showcase', 'spotlight', 'frame', 'zoom']
};

const FONTS = ['Inter', 'Playfair Display', 'Syne', 'monospace'];

const DesignStudio = () => {
  const [template, setTemplate] = useState({
    style: 'slant',
    bgImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80',
    title: 'Autumn Collection 2026',
    subtitle: 'Redefining elegance with our latest arrivals',
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
    productCount: 3
  });

  const [promo, setPromo] = useState({
    announcementBar: true,
    announcementText: '🎉 Free shipping on all orders over $50!',
    announcementBg: '#3b82f6',
    voucher: true,
    voucherCode: 'WELCOME20',
    voucherLabel: 'Get 20% off your first order',
    countdown: true,
    countdownTitle: 'Flash Sale Ends In:',
    countdownEndDate: new Date(Date.now() + 86400000).toISOString()
  });

  const [activeMainTab, setActiveMainTab] = useState('Store'); 
  const [activeTab, setActiveTab] = useState('Geometric');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

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
    fetchProducts();
  }, []);

  const handleUpdate = (key, value) => setTemplate(prev => ({ ...prev, [key]: value }));
  const handleStoreUpdate = (key, value) => setStore(prev => ({ ...prev, [key]: value }));
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

  return (
    <div className="flex h-full min-h-[700px] bg-slate-50 overflow-hidden font-sans rounded-2xl border border-slate-200">
      {/* Sidebar Controls */}
      <aside className="w-96 h-full bg-white/80 backdrop-blur-md border-r border-slate-200 shadow-2xl flex flex-col z-20">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Design Studio</h2>
          <p className="text-sm text-slate-500 mt-1">Configure your storefront</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* Main Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
            {['Store', 'Banner', 'Products', 'Promos', 'Anim'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-lg transition-all ${activeMainTab === tab || (activeMainTab === 'Promotions' && tab === 'Promos') || (activeMainTab === 'Animations' && tab === 'Anim') ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeMainTab === 'Store' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Brand Identity</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Store Name</label>
                  <input type="text" value={store.storeName} onChange={(e) => handleStoreUpdate('storeName', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Tagline</label>
                  <input type="text" value={store.tagline} onChange={(e) => handleStoreUpdate('tagline', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Colors & Typography</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Primary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={store.primaryColor} onChange={(e) => handleStoreUpdate('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs">{store.primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Secondary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={store.secondaryColor} onChange={(e) => handleStoreUpdate('secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs">{store.secondaryColor}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Font Family</label>
                  <select value={store.font} onChange={(e) => handleStoreUpdate('font', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm">
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
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Content</h3>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Headline</label>
                  <input type="text" value={template.title} onChange={(e) => handleUpdate('title', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Subtitle</label>
                  <input type="text" value={template.subtitle} onChange={(e) => handleUpdate('subtitle', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Background Image URL</label>
                  <input type="text" value={template.bgImage} onChange={(e) => handleUpdate('bgImage', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Layout Style</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(categories).map(cat => (
                    <button key={cat} onClick={() => setActiveTab(cat)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${activeTab === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {cat.replace(/([A-Z])/g, ' $1').trim()}
                    </button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-2 gap-3 mt-4">
                    {categories[activeTab].map(styleName => (
                      <button key={styleName} onClick={() => handleUpdate('style', styleName)} className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 hover:-translate-y-1 ${template.style === styleName ? 'border-blue-500 bg-blue-50/50 shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'}`}>
                        <span className="text-xs font-bold text-slate-700 capitalize">{styleName.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Products' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Grid Layout</h3>
                <select value={store.gridLayout} onChange={(e) => handleStoreUpdate('gridLayout', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm">
                  <option value="3-col grid">3-Column Grid</option>
                  <option value="Masonry">Masonry</option>
                  <option value="Horizontal carousel">Horizontal Carousel</option>
                </select>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-4">Card Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Clean', 'Glassmorphism', 'Polaroid', 'Dark'].map(style => (
                    <button key={style} onClick={() => handleStoreUpdate('cardStyle', style)} className={`py-2 text-xs font-bold rounded-lg border ${store.cardStyle === style ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Card Elements</h3>
                {['showPrice', 'showRating', 'showAddToCart', 'showSold'].map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={store[key]} onChange={(e) => handleStoreUpdate(key, e.target.checked)} className="rounded text-blue-500" />
                    <span className="text-sm text-slate-700 capitalize">{key.replace('show', '')}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Product Count ({store.productCount})</label>
                <input type="range" min="3" max="12" step="3" value={store.productCount} onChange={(e) => handleStoreUpdate('productCount', e.target.value)} className="w-full" />
              </div>
            </motion.div>
          )}

          {(activeMainTab === 'Promotions' || activeMainTab === 'Promos') && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input type="checkbox" checked={promo.announcementBar} onChange={(e) => handlePromoUpdate('announcementBar', e.target.checked)} className="rounded text-blue-500" />
                  Announcement Bar
                </label>
                {promo.announcementBar && (
                  <>
                    <input type="text" value={promo.announcementText} onChange={(e) => handlePromoUpdate('announcementText', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Text..." />
                    <div className="flex gap-2 items-center">
                      <input type="color" value={promo.announcementBg} onChange={(e) => handlePromoUpdate('announcementBg', e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
                      <span className="text-xs text-slate-500">Background</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input type="checkbox" checked={promo.voucher} onChange={(e) => handlePromoUpdate('voucher', e.target.checked)} className="rounded text-blue-500" />
                  Voucher Strip
                </label>
                {promo.voucher && (
                  <>
                    <input type="text" value={promo.voucherCode} onChange={(e) => handlePromoUpdate('voucherCode', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Code..." />
                    <input type="text" value={promo.voucherLabel} onChange={(e) => handlePromoUpdate('voucherLabel', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Label..." />
                  </>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input type="checkbox" checked={promo.countdown} onChange={(e) => handlePromoUpdate('countdown', e.target.checked)} className="rounded text-blue-500" />
                  Countdown Deal
                </label>
                {promo.countdown && (
                  <>
                    <input type="text" value={promo.countdownTitle} onChange={(e) => handlePromoUpdate('countdownTitle', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Title..." />
                    <input type="datetime-local" value={promo.countdownEndDate.substring(0, 16)} onChange={(e) => handlePromoUpdate('countdownEndDate', new Date(e.target.value).toISOString())} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                  </>
                )}
              </div>
            </motion.div>
          )}

          {(activeMainTab === 'Animations' || activeMainTab === 'Anim') && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Button Style</label>
                <select value={template.buttonAnim} onChange={(e) => handleUpdate('buttonAnim', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm font-semibold text-slate-700">
                  <option value="ripple">Ripple Effect</option>
                  <option value="magnetic">Magnetic Snap</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Border Style</label>
                <select value={template.borderAnim} onChange={(e) => handleUpdate('borderAnim', e.target.value)} className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm font-semibold text-slate-700">
                  <option value="gemini">Gemini Glow</option>
                  <option value="ai">AI Shimmer</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hover Effect</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['lift', 'scale'].map(eff => (
                    <button key={eff} onClick={() => handleUpdate('hoverAnim', eff)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${template.hoverAnim === eff ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                      {eff.charAt(0).toUpperCase() + eff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Modal Style</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['pop', 'slide'].map(eff => (
                    <button key={eff} onClick={() => handleUpdate('modalAnim', eff)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${template.modalAnim === eff ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                      {eff.charAt(0).toUpperCase() + eff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={async () => {
              setIsSaving(true);
              try {
                // Merge everything for the API
                const payload = { ...template, storeConfig: store, promoConfig: promo };
                await axios.put('/api/v1/stores/layout', payload, { withCredentials: true });
                alert('Design saved successfully!');
              } catch (err) {
                alert('Failed to save design');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden" style={{ fontFamily: store.font, backgroundColor: store.secondaryColor }}>
        <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-30 sticky top-0 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Live Storefront Preview</h1>
          <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Interactive</div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full no-scrollbar">
          <div className="w-full max-w-7xl mx-auto shadow-2xl ring-1 ring-slate-900/5 bg-white min-h-[1000px] mb-20 relative">
            
            {/* 1. Announcement Bar */}
            {promo.announcementBar && (
              <div className="w-full py-2.5 text-center text-sm font-medium text-white transition-colors duration-300" style={{ backgroundColor: promo.announcementBg }}>
                {promo.announcementText}
              </div>
            )}

            {/* 2. Store Header (Mock) */}
            <header className="px-8 py-6 flex justify-between items-center border-b border-slate-100" style={{ backgroundColor: store.secondaryColor }}>
              <div>
                <h2 className="text-2xl font-black tracking-tighter" style={{ color: store.primaryColor }}>{store.storeName}</h2>
                <p className="text-sm opacity-60 font-medium" style={{ color: store.primaryColor }}>{store.tagline}</p>
              </div>
              <div className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><ShoppingBag size={16} /></span>
              </div>
            </header>

            {/* 3. Hero Banner */}
            <div className="relative">
              <StoreBannerEngine template={template} />
            </div>

            {/* 4. Voucher Strip */}
            {promo.voucher && (
              <div className="w-full py-4 px-8 border-y border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{promo.voucherLabel}</h4>
                    <p className="text-xs text-slate-500">Use code at checkout</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg font-mono font-bold tracking-widest text-slate-800 bg-slate-50">
                  {promo.voucherCode}
                </div>
              </div>
            )}

            {/* 5. Countdown Deal Section */}
            {promo.countdown && (
              <div className="w-full py-12 px-8" style={{ backgroundColor: store.primaryColor }}>
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                      <Clock size={24} className="animate-pulse text-yellow-400" />
                      {promo.countdownTitle}
                    </h3>
                    <p className="opacity-80 text-sm">Don't miss out on these exclusive deals.</p>
                  </div>
                  <div className="flex gap-4 mt-6 md:mt-0 font-mono">
                    <div className="flex flex-col items-center bg-black/40 rounded-xl p-3 min-w-[70px]">
                      <span className="text-3xl font-black">{String(timeLeft.hours).padStart(2, '0')}</span>
                      <span className="text-xs uppercase opacity-70 mt-1">Hours</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 rounded-xl p-3 min-w-[70px]">
                      <span className="text-3xl font-black">{String(timeLeft.minutes).padStart(2, '0')}</span>
                      <span className="text-xs uppercase opacity-70 mt-1">Mins</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 rounded-xl p-3 min-w-[70px]">
                      <span className="text-3xl font-black text-yellow-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                      <span className="text-xs uppercase opacity-70 mt-1">Secs</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Product Grid */}
            <div className="p-8 md:p-12 bg-white">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tight" style={{ color: store.primaryColor }}>Featured Products</h2>
                <button className="text-sm font-bold opacity-70 hover:opacity-100 transition-opacity" style={{ color: store.primaryColor }}>View All &rarr;</button>
              </div>

              <div className={`
                ${store.gridLayout === '3-col grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-8' : ''}
                ${store.gridLayout === 'Masonry' ? 'columns-1 md:columns-3 gap-8 space-y-8' : ''}
                ${store.gridLayout === 'Horizontal carousel' ? 'flex overflow-x-auto gap-6 pb-8 snap-x' : ''}
              `}>
                {displayProducts.map((product, idx) => (
                  <div 
                    key={product.id || idx} 
                    className={`
                      group cursor-pointer transition-all duration-300 relative break-inside-avoid
                      ${store.gridLayout === 'Horizontal carousel' ? 'min-w-[280px] snap-center' : ''}
                      ${template.hoverAnim === 'lift' ? 'hover:-translate-y-2' : ''}
                      ${template.hoverAnim === 'scale' ? 'hover:scale-105' : ''}
                      ${store.cardStyle === 'Glassmorphism' ? 'bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl p-4 rounded-2xl' : ''}
                      ${store.cardStyle === 'Polaroid' ? 'bg-white p-3 pb-8 shadow-md border border-slate-100 rounded-sm' : ''}
                      ${store.cardStyle === 'Dark' ? 'bg-slate-900 text-white rounded-xl overflow-hidden' : ''}
                      ${store.cardStyle === 'Clean' ? 'bg-transparent' : ''}
                    `}
                  >
                    {/* Badge */}
                    {idx === 0 && (
                      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                        Bestseller
                      </div>
                    )}
                    
                    {/* Image Area */}
                    <div className={`
                      bg-slate-100 overflow-hidden relative
                      ${store.cardStyle === 'Glassmorphism' ? 'rounded-xl aspect-square mb-4' : ''}
                      ${store.cardStyle === 'Polaroid' ? 'aspect-square mb-3' : ''}
                      ${store.cardStyle === 'Dark' ? 'aspect-[4/5] mb-0' : ''}
                      ${store.cardStyle === 'Clean' ? 'rounded-2xl aspect-[4/5] mb-5' : ''}
                    `}>
                      {product.images && product.images[0] ? (
                        <img src={product.images[0].url || product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                          <ShoppingBag size={48} className="text-slate-300" />
                        </div>
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center p-4">
                        {store.showAddToCart && (
                          <button 
                            className={`
                              translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100
                              w-full py-3 font-bold rounded-xl shadow-xl
                              ${template.buttonAnim === 'magnetic' ? 'hover:scale-105 active:scale-95' : ''}
                              ${store.cardStyle === 'Dark' ? 'bg-white text-black' : 'text-white'}
                            `}
                            style={store.cardStyle !== 'Dark' ? { backgroundColor: store.primaryColor } : {}}
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className={`space-y-1 ${store.cardStyle === 'Dark' ? 'p-5' : ''}`}>
                      {store.showRating && (
                        <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                          ★ ★ ★ ★ ★ <span className={`text-xs ml-1 ${store.cardStyle === 'Dark' ? 'text-slate-400' : 'text-slate-400'}`}>(128)</span>
                        </div>
                      )}
                      
                      <div className={`font-bold line-clamp-1 ${store.cardStyle === 'Dark' ? 'text-white' : 'text-slate-800'}`}>
                        {product.title || `Premium Product Sample ${idx + 1}`}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        {store.showPrice && (
                          <div className={`font-black text-lg ${store.cardStyle === 'Dark' ? 'text-white' : 'text-slate-900'}`} style={store.cardStyle !== 'Dark' ? { color: store.primaryColor } : {}}>
                            ${product.price || '99.00'}
                          </div>
                        )}
                        {store.showSold && (
                          <div className={`text-xs font-semibold ${store.cardStyle === 'Dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {idx * 15 + 42} sold
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Trust Badges Footer */}
            <div className="w-full py-16 px-8 bg-slate-50 border-t border-slate-200">
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100" style={{ color: store.primaryColor }}>
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Secure Checkout</h4>
                  <p className="text-xs text-slate-500">256-bit SSL encryption</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100" style={{ color: store.primaryColor }}>
                    <Truck size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Fast Shipping</h4>
                  <p className="text-xs text-slate-500">Global delivery options</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100" style={{ color: store.primaryColor }}>
                    <RefreshCw size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Free Returns</h4>
                  <p className="text-xs text-slate-500">30-day return policy</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100" style={{ color: store.primaryColor }}>
                    <Sparkles size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Premium Quality</h4>
                  <p className="text-xs text-slate-500">Guaranteed authentic</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default DesignStudio;
