import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Smartphone, Tablet, ArrowLeft, ExternalLink, X, Maximize2, Minimize2,
  RotateCcw, Share2, ShoppingBag, Star, Check, ChevronRight, Home, Layers,
  Zap, Shield, Crown, Globe, Copy, CheckCircle2, SlidersHorizontal
} from 'lucide-react';
import { ExperienceRenderer } from '../../engines/universal/ExperienceRenderer';
import { generateStyleProfile } from '../../engines/universal/styles/ExperienceStyleGenerator';
import PortfolioApp from '../../engines/portfolio/App';

// ── Device Frame Configs ───────────────────────────────────────────────────────
const DEVICES = {
  desktop: { label: 'Desktop', icon: Monitor, width: '100%',   frame: false, aspect: null },
  tablet:  { label: 'Tablet',  icon: Tablet,  width: '768px',  frame: true,  aspect: '768/1024' },
  mobile:  { label: 'Mobile',  icon: Smartphone, width: '375px', frame: true, aspect: '375/812' },
};

// ── Page Dot Navigator ─────────────────────────────────────────────────────────
const PageNavigator = ({ store, activePage, setActivePage }) => (
  <div className="flex flex-col gap-1 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 pb-1">Pages</p>
    {(store.pages || ['home']).map(page => (
      <button key={page} onClick={() => setActivePage(page)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all text-left ${
          activePage === page ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-black'
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activePage === page ? 'bg-white' : 'bg-gray-300'}`} />
        {page}
      </button>
    ))}
  </div>
);

// ── Style Badge ────────────────────────────────────────────────────────────────
const StyleBadge = ({ styleProfile }) => (
  <div className="flex flex-wrap gap-1.5 p-3">
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-white">{styleProfile?.styleId}</span>
    {styleProfile?.secondaryStyleId !== styleProfile?.styleId && (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{styleProfile?.secondaryStyleId}</span>
    )}
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 capitalize">{styleProfile?.tier}</span>
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">L{styleProfile?.motionLevel} Motion</span>
  </div>
);

// ── Share Modal ────────────────────────────────────────────────────────────────
const ShareModal = ({ store, onClose }) => {
  const url = `${window.location.origin}/preview/${store.engine}/${store.id}`;
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-2">Share Preview</h2>
        <p className="opacity-50 text-sm mb-6">Share this store experience with anyone.</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-600 truncate">{url}</div>
          <button onClick={copy} className={`px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'}`}>
            {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <button onClick={onClose} className="mt-6 w-full py-3 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50">Close</button>
      </motion.div>
    </motion.div>
  );
};

// ── Main StorePreviewOS ────────────────────────────────────────────────────────
const StorePreviewOS = ({ store, onBack, onPurchase }) => {
  const [device, setDevice]           = useState('desktop');
  const [isFullscreen, setFullscreen] = useState(false);
  const [showShare, setShowShare]     = useState(false);
  const [showPageNav, setShowPageNav] = useState(true);
  const [zoom, setZoom]               = useState(100);
  const [activePage, _setActivePage]  = useState(store.pages?.[0] || 'home');
  const frameRef = useRef(null);

  // Bridge activePage from PreviewContext (ExperienceRenderer manages it internally)
  // We expose it here for the side navigator via a custom event / shared key
  const styleProfile = generateStyleProfile(store);
  const currentDevice = DEVICES[device];
  const DeviceIcon = currentDevice.icon;

  if (!store) return null;

  return (
    <>
      {/* Share Modal */}
      <AnimatePresence>{showShare && <ShareModal store={store} onClose={() => setShowShare(false)} />}</AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`${isFullscreen ? 'fixed' : 'absolute'} inset-0 bg-[#0f0f0f] z-[60] flex flex-col`}
      >
        {/* ── Top OS Chrome ─────────────────────────────────────────────────── */}
        <div className="h-14 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 shrink-0 gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0" />
              <span className="text-white/80 font-bold text-sm truncate">{store.name}</span>
              <span className="text-white/30 text-xs flex-shrink-0">·</span>
              <span className="text-white/30 text-xs capitalize flex-shrink-0">{store.engine}</span>
            </div>
          </div>

          {/* Center — Device Switcher */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 gap-0.5">
            {Object.entries(DEVICES).map(([key, d]) => {
              const Icon = d.icon;
              return (
                <button key={key} onClick={() => setDevice(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    device === key ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                  }`}>
                  <Icon size={13} /><span className="hidden sm:inline">{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Zoom */}
            <div className="hidden md:flex items-center gap-2 text-xs text-white/40">
              <SlidersHorizontal size={12} />
              <input type="range" min={50} max={150} step={10} value={zoom} onChange={e => setZoom(Number(e.target.value))}
                className="w-16 accent-white h-1 cursor-pointer" />
              <span className="w-8 text-white/60 font-mono">{zoom}%</span>
            </div>
            <div className="h-4 w-px bg-white/10" />

            {/* Share */}
            <button onClick={() => setShowShare(true)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <Share2 size={14} />
            </button>
            {/* Fullscreen */}
            <button onClick={() => setFullscreen(v => !v)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <div className="h-4 w-px bg-white/10" />
            {/* LIVE Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-black uppercase tracking-wider">Live</span>
            </div>
            {/* Purchase */}
            <button onClick={onPurchase} className="flex items-center gap-1.5 bg-white text-black text-xs font-black px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ShoppingBag size={13} /> ${store.price}/mo
            </button>
          </div>
        </div>

        {/* ── Main Area ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">



          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-[#111] flex items-start justify-center p-6" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff08 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            <motion.div
              layout
              transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
              style={{ width: currentDevice.width, transformOrigin: 'top center', scale: zoom / 100 }}
              className="flex-shrink-0"
            >
              {/* Device Frame */}
              <div className={`bg-white shadow-2xl overflow-hidden ${
                device === 'mobile' ? 'rounded-[40px] border-[8px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_60px_rgba(0,0,0,0.8)]'
                : device === 'tablet' ? 'rounded-[24px] border-[6px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.6)]'
                : 'rounded-t-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
              }`}>
                {/* Browser/Device Chrome */}
                {device === 'desktop' && (
                  <div className="h-9 bg-[#f0f0f0] border-b border-gray-200 flex items-center px-3 gap-2">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" /><div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" /><div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" /></div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-gray-400 mx-2 font-medium shadow-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      preview.globalx.com/{store.id}
                    </div>
                  </div>
                )}
                {device === 'mobile' && (
                  <div className="h-7 bg-[var(--s-bg,#fff)] flex items-center justify-center">
                    <div className="w-24 h-4 bg-black/10 rounded-full" />
                  </div>
                )}

                {/* Storefront */}
                <div className={`w-full overflow-y-auto overflow-x-hidden ${
                  device === 'mobile' ? 'max-h-[780px]' : device === 'tablet' ? 'max-h-[950px]' : 'max-h-[85vh]'
                }`} style={{ minHeight: device === 'mobile' ? 700 : device === 'tablet' ? 900 : 600 }}>
                  {store.type === 'html' ? (
                    <iframe src={`/templates/${store.engine}/index.html`} className="w-full h-full border-0 min-h-[800px]" title={store.name} />
                  ) : store.engine === 'portfolio' ? (
                    <PortfolioApp />
                  ) : (
                    <ExperienceRenderer store={store} previewMode />
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Info Sidebar */}
          <div className="hidden xl:flex w-64 bg-[#161616] border-l border-white/5 flex-col overflow-y-auto flex-shrink-0">
            {/* Store Info */}
            <div className="p-5 border-b border-white/5">
              <div className="font-black text-white text-base mb-1">{store.name}</div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-xs text-white/50">{store.rating}% · {store.engine}</span>
              </div>
              <div className="text-2xl font-black text-white">${store.price}<span className="text-xs font-normal text-white/30">/3mo</span></div>
            </div>
            {/* Features */}
            <div className="p-5 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Features</p>
              {(store.features || []).map(f => (
                <div key={f} className="flex items-center gap-2 py-1.5">
                  <Check size={11} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-white/60 capitalize">{f.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
            {/* Pages */}
            <div className="p-5 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Pages ({store.pages?.length || 0})</p>
              {(store.pages || []).map(p => (
                <div key={p} className="flex items-center gap-2 py-1.5">
                  <div className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="text-xs text-white/60 capitalize">{p}</span>
                </div>
              ))}
            </div>
            {/* Style Profile */}
            <div className="p-5 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Style Profile</p>
              <div className="space-y-1.5">
                {[['Primary', styleProfile?.styleId], ['Accent', styleProfile?.secondaryStyleId], ['Motion', `Level ${styleProfile?.motionLevel}`], ['Cart', styleProfile?.cartStyle], ['Checkout', styleProfile?.checkoutStyle]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[10px] text-white/30">{k}</span>
                    <span className="text-[10px] text-white/70 font-bold capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* CTA */}
            <div className="p-5 mt-auto">
              <button onClick={onPurchase} className="w-full py-3 bg-white text-black font-black rounded-xl text-sm hover:bg-gray-100 transition-colors mb-2">
                Purchase — ${store.price}/mo
              </button>
              <button onClick={onBack} className="w-full py-2.5 border border-white/10 text-white/50 font-bold rounded-xl text-xs hover:bg-white/5 transition-colors">
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StorePreviewOS;
