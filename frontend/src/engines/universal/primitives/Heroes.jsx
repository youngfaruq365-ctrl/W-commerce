import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { usePreview } from '../commerce/PreviewContext';
import { ProductCard } from '../commerce/ProductCard';
import { ArrowRight, ChevronDown } from 'lucide-react';

const HeroImg = ({ store, className = 'w-full h-full object-cover' }) => (
  <img src={store.preview?.hero || `https://picsum.photos/seed/${store.id}/2000/1200`} alt={store.name} className={className} />
);

const HeroCTA = ({ store, setActivePage, dark = false }) => (
  <div className={`flex gap-4 flex-wrap ${dark ? 'text-white' : ''}`}>
    <button onClick={() => setActivePage('products')}
      className={`px-8 py-4 font-black rounded-[var(--s-radius)] text-sm hover:opacity-90 transition-opacity ${dark ? 'bg-white text-black' : 'bg-[var(--s-primary)] text-[var(--s-bg)]'}`}>
      Shop Now <ArrowRight size={16} className="inline ml-1" />
    </button>
    <button onClick={() => setActivePage('about')}
      className={`px-8 py-4 font-black rounded-[var(--s-radius)] text-sm border-2 transition-colors ${dark ? 'border-white text-white hover:bg-white hover:text-black' : 'border-[var(--s-text)] text-[var(--s-text)] hover:bg-[var(--s-text)] hover:text-[var(--s-bg)]'}`}>
      Our Story
    </button>
  </div>
);

// Hero title with style
const HeroTitle = ({ name, dark = false }) => (
  <h1 className={`font-black leading-none mb-6 ${dark ? 'text-white' : 'text-[var(--s-text)]'}`}
    style={{ fontFamily: 'var(--s-font-heading)', fontWeight: 'var(--s-heading-weight)', letterSpacing: 'var(--s-letter-spacing)', fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
    {name}
  </h1>
);

export const HeroFullscreen = ({ store, motionVariants, setActivePage }) => {
  const { scrollY } = useScroll();
  const isPremium = store.price >= 16;
  const yBg = useTransform(scrollY, [0, 800], [0, isPremium ? 250 : 0]);
  const yText = useTransform(scrollY, [0, 800], [0, isPremium ? -150 : 0]);
  const opacity = useTransform(scrollY, [0, 400], [1, isPremium ? 0 : 1]);

  return (
    <div className="relative w-full h-[90vh] overflow-hidden flex items-center justify-center">
      <motion.div style={{ y: yBg }} className="absolute inset-0">
        <HeroImg store={store} className="w-full h-full object-cover scale-110" />
      </motion.div>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div style={{ y: yText, opacity }} {...(motionVariants?.item || {})} className="relative z-10 text-center px-6 max-w-4xl">
        <HeroTitle name={store.name} dark />
        <p className="text-white/80 text-xl mb-10 font-medium">{store.description}</p>
        <HeroCTA store={store} setActivePage={setActivePage} dark />
      </motion.div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white opacity-50 animate-bounce">
        <ChevronDown size={24} />
      </div>
    </div>
  );
};

export const HeroSplit = ({ store, motionVariants, setActivePage }) => (
  <div className="flex flex-col md:flex-row min-h-[70vh]">
    <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16 md:py-24">
      <motion.p {...(motionVariants?.item || {})} className="text-xs font-black uppercase tracking-widest mb-4 opacity-50">{store.engine} · {store.tier}</motion.p>
      <motion.div {...(motionVariants?.item || {})}>
        <HeroTitle name={store.name} />
      </motion.div>
      <motion.p {...(motionVariants?.item || {})} className="text-lg opacity-60 mb-10 max-w-md leading-relaxed">{store.description}</motion.p>
      <motion.div {...(motionVariants?.item || {})}><HeroCTA store={store} setActivePage={setActivePage} /></motion.div>
    </div>
    <div className="flex-1 relative min-h-[50vh] md:min-h-0 overflow-hidden">
      <HeroImg store={store} className="absolute inset-0 w-full h-full object-cover" />
    </div>
  </div>
);

export const HeroMinimal = ({ store, motionVariants, setActivePage }) => (
  <div className="w-full py-32 px-6 flex flex-col items-center text-center">
    <motion.p {...(motionVariants?.item || {})} className="text-xs font-black uppercase tracking-[0.3em] mb-8 opacity-40">{store.engine}</motion.p>
    <motion.h1 {...(motionVariants?.item || {})} className="max-w-3xl font-normal leading-tight mb-8"
      style={{ fontFamily: 'var(--s-font-heading)', fontSize: 'clamp(2.5rem, 5vw, 5rem)', letterSpacing: 'var(--s-letter-spacing)' }}>
      {store.description}
    </motion.h1>
    <motion.div {...(motionVariants?.item || {})} className="w-16 h-0.5 bg-[var(--s-primary)] mb-10" />
    <motion.div {...(motionVariants?.item || {})}>
      <button onClick={() => setActivePage('products')} className="px-10 py-4 border-2 border-[var(--s-text)] font-black uppercase tracking-widest text-sm hover:bg-[var(--s-text)] hover:text-[var(--s-bg)] transition-colors">
        Explore
      </button>
    </motion.div>
  </div>
);

export const HeroEditorial = ({ store, motionVariants, setActivePage }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 min-h-[80vh] border-b-2 border-black">
    <div className="md:col-span-3 flex flex-col justify-end p-10 md:p-16 border-r-2 border-black min-h-[50vh]">
      <motion.div {...(motionVariants?.item || {})}>
        <div className="text-xs font-black uppercase tracking-widest mb-6 opacity-40">Vol. 01 — {new Date().getFullYear()}</div>
        <HeroTitle name={store.name} />
        <p className="text-xl opacity-60 max-w-sm leading-relaxed mb-10">{store.description}</p>
        <HeroCTA store={store} setActivePage={setActivePage} />
      </motion.div>
    </div>
    <div className="md:col-span-2 relative min-h-[50vh]">
      <HeroImg store={store} className="absolute inset-0 w-full h-full object-cover" />
    </div>
  </div>
);

export const HeroBento = ({ store, motionVariants, setActivePage }) => (
  <div className="p-4 md:p-8 grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px]">
    <div className="col-span-2 row-span-2 relative rounded-[var(--s-radius)] overflow-hidden bg-[var(--s-surface)] flex flex-col justify-end p-8">
      <HeroImg store={store} className="absolute inset-0 w-full h-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="relative z-10 text-white">
        <HeroTitle name={store.name} dark />
        <HeroCTA store={store} setActivePage={setActivePage} dark />
      </div>
    </div>
    <div className="rounded-[var(--s-radius)] bg-[var(--s-primary)] flex items-center justify-center text-[var(--s-bg)]">
      <div className="text-center p-4"><div className="text-4xl font-black">{store.price}</div><div className="text-xs uppercase tracking-widest opacity-70">per month</div></div>
    </div>
    <div className="rounded-[var(--s-radius)] bg-[var(--s-surface)] flex items-center justify-center p-6">
      <div className="text-center"><div className="text-3xl font-black mb-1">{store.rating}%</div><div className="text-xs opacity-50">Satisfaction</div></div>
    </div>
  </div>
);

export const HeroImmersive = ({ store, motionVariants, setActivePage }) => {
  const { scrollY } = useScroll();
  const isPremium = store.price >= 16;
  const yBg = useTransform(scrollY, [0, 1000], [0, isPremium ? 400 : 0]);
  const yText = useTransform(scrollY, [0, 1000], [0, isPremium ? 200 : 0]);
  const textOpacity = useTransform(scrollY, [0, 500], [1, isPremium ? 0 : 1]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <motion.div style={{ y: yBg }} className="absolute inset-0">
        <HeroImg store={store} className="w-full h-full object-cover scale-110" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      <motion.div style={{ y: yText, opacity: textOpacity }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
        className="absolute bottom-0 left-0 right-0 p-12 text-white">
        <p className="text-sm font-black uppercase tracking-widest mb-4 opacity-60">{store.engine}</p>
        <h1 className="font-black text-[clamp(3rem,8vw,8rem)] leading-none mb-8" style={{ fontFamily: 'var(--s-font-heading)' }}>{store.name}</h1>
        <HeroCTA store={store} setActivePage={setActivePage} dark />
      </motion.div>
    </div>
  );
};

export const HeroAsymmetric = ({ store, motionVariants, setActivePage }) => (
  <div className="relative min-h-[80vh] flex items-center">
    <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
      <HeroImg store={store} className="w-full h-full object-cover" />
    </div>
    <div className="relative z-10 px-8 md:px-16 py-24 max-w-xl">
      <HeroTitle name={store.name} />
      <p className="text-lg opacity-60 mb-10 leading-relaxed">{store.description}</p>
      <HeroCTA store={store} setActivePage={setActivePage} />
    </div>
  </div>
);

export const HeroCentered = ({ store, motionVariants, setActivePage }) => (
  <div className="relative w-full py-40 flex flex-col items-center text-center px-6">
    <div className="absolute inset-0 overflow-hidden">
      <HeroImg store={store} className="w-full h-full object-cover opacity-10" />
    </div>
    <div className="relative z-10">
      <HeroTitle name={store.name} />
      <p className="text-xl opacity-60 max-w-2xl mx-auto mb-12">{store.description}</p>
      <HeroCTA store={store} setActivePage={setActivePage} />
    </div>
  </div>
);

export const HeroStory = ({ store, motionVariants, setActivePage }) => (
  <div className="flex flex-col">
    <div className="relative w-full h-[60vh] overflow-hidden">
      <HeroImg store={store} className="w-full h-full object-cover" />
    </div>
    <div className="px-8 md:px-16 py-16 max-w-3xl">
      <HeroTitle name={store.name} />
      <p className="text-lg opacity-60 leading-relaxed mb-10">{store.description}</p>
      <HeroCTA store={store} setActivePage={setActivePage} />
    </div>
  </div>
);

// Aliases
export const HeroVideo   = HeroFullscreen;
export const HeroProduct = HeroSplit;
export const HeroParallax = HeroImmersive;
