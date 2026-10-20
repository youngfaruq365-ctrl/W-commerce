import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store, Users } from 'lucide-react';

/* ── Keyframe styles ─────────────────────────────────────────── */
const slideStyles = `
  @keyframes slideCardIn {
    from { opacity: 0; transform: translateY(40px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideHeadIn {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes floatProd {
    0%,100% { transform: translateY(0px) rotate(-2deg); }
    50%     { transform: translateY(-12px) rotate(2deg); }
  }
  @keyframes floatStore {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-8px); }
  }
  @keyframes socialPulse {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.05); }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform: scale(0.8); opacity: 0.4; }
    40%         { transform: scale(1.1); opacity: 1; }
  }
  .slide-card-in   { animation: slideCardIn  0.55s cubic-bezier(0.34,1.1,0.64,1) both; }
  .slide-head-in   { animation: slideHeadIn  0.45s ease both; }
  .float-prod      { animation: floatProd    4s ease-in-out infinite; }
  .float-store     { animation: floatStore   5s ease-in-out infinite; }
  .social-pulse    { animation: socialPulse  3s ease-in-out infinite; }
`;

/* ── Slide illustrations ─────────────────────────────────────── */
const Slide1Illustration = () => (
  <div className="relative flex items-center justify-center w-full h-52">
    {/* Background glow */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-48 h-48 rounded-full bg-white/[0.04] blur-2xl" />
    </div>
    {/* Product cards */}
    {[
      { emoji: '👟', name: 'Sneakers', price: '₦129', offset: '-translate-x-16 -translate-y-4', delay: '0s',   zIndex: 'z-20' },
      { emoji: '📱', name: 'iPhone',   price: '₦999', offset: 'translate-x-0  translate-y-0',   delay: '0.1s', zIndex: 'z-30' },
      { emoji: '⌚', name: 'Watch',    price: '₦249', offset: 'translate-x-16 translate-y-4',   delay: '0.2s', zIndex: 'z-20' },
    ].map(({ emoji, name, price, offset, delay, zIndex }) => (
      <div
        key={name}
        className={`slide-card-in float-prod absolute ${offset} ${zIndex} w-28 h-32 rounded-2xl
          bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md
          flex flex-col items-center justify-center gap-1 p-3 shadow-xl`}
        style={{ animationDelay: delay }}
      >
        <span className="text-3xl">{emoji}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-medium">{name}</span>
        <span className="text-sm text-white font-bold">{price}</span>
        <div className="w-full h-1 rounded-full bg-white/10 mt-1">
          <div className="h-full w-2/3 rounded-full bg-white/40" />
        </div>
      </div>
    ))}
  </div>
);

const Slide2Illustration = () => (
  <div className="relative flex items-center justify-center w-full h-52">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-48 h-48 rounded-full bg-white/[0.04] blur-2xl" />
    </div>
    {/* Store interface mockup */}
    <div className="slide-card-in float-store w-64 h-44 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md shadow-xl p-4">
      {/* Store header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Store className="w-4 h-4 text-white/70" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">My Global Store</div>
          <div className="text-[9px] text-[var(--text-muted)]">42 countries • ₦12.4K revenue</div>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full">● Live</span>
        </div>
      </div>
      {/* Stats row */}
      {[['Orders', '348'], ['Views', '12.1K'], ['Rating', '4.9★']].map(([label, val]) => (
        <div key={label} className="flex-1 inline-flex flex-col items-center justify-center bg-white/5 rounded-lg p-2 mr-2 last:mr-0">
          <span className="text-xs font-bold text-white">{val}</span>
          <span className="text-[8px] text-[var(--text-faint)]">{label}</span>
        </div>
      ))}
      {/* Globe countries */}
      <div className="mt-3 flex gap-1 flex-wrap">
        {['🇺🇸','🇬🇧','🇩🇪','🇯🇵','🇧🇷','🇦🇺','🇫🇷','🇨🇦'].map(flag => (
          <span key={flag} className="text-base">{flag}</span>
        ))}
        <span className="text-[10px] text-[var(--text-muted)] self-center">+34</span>
      </div>
    </div>
  </div>
);

const Slide3Illustration = () => (
  <div className="relative flex items-center justify-center w-full h-52">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-48 h-48 rounded-full bg-white/[0.04] blur-2xl" />
    </div>
    {/* Social feed mockup */}
    <div className="slide-card-in social-pulse w-60 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md shadow-xl overflow-hidden">
      {[
        { avatar: '😎', name: 'Alex K.',   text: 'Just copped these 🔥', emoji: '❤️ 214', product: '👟' },
        { avatar: '🌸', name: 'Priya S.', text: 'New drop is 🤌🤌',       emoji: '❤️ 89',  product: '👗' },
      ].map(({ avatar, name, text, emoji, product }) => (
        <div key={name} className="flex items-start gap-2 p-3 border-b border-white/5 last:border-none">
          <span className="text-xl">{avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">{name}</div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">{text}</div>
            <div className="text-[9px] text-[var(--text-faint)] mt-0.5">{emoji}</div>
          </div>
          <span className="text-xl">{product}</span>
        </div>
      ))}
      <div className="p-2 flex gap-2">
        <div className="flex-1 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center px-2">
          <span className="text-[9px] text-[var(--text-faint)]">Share your find…</span>
        </div>
        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
          <ArrowRight className="w-3 h-3 text-white/60" />
        </div>
      </div>
    </div>
  </div>
);

/* ── Slide data ──────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0,
    Icon: ShoppingBag,
    title: 'Shop Everything',
    subtitle: 'Millions of products from top brands and independent sellers, all in one premium place.',
    Illustration: Slide1Illustration,
    accent: 'from-white to-[var(--accent-gray)]',
  },
  {
    id: 1,
    Icon: Store,
    title: 'Sell Globally',
    subtitle: 'Launch your store in minutes. Reach buyers in 140+ countries with powerful seller tools.',
    Illustration: Slide2Illustration,
    accent: 'from-white to-[var(--accent-gray)]',
  },
  {
    id: 2,
    Icon: Users,
    title: 'Community Commerce',
    subtitle: 'Discover, share, and buy through a social feed that turns every purchase into a moment.',
    Illustration: Slide3Illustration,
    accent: 'from-white to-[var(--accent-gray)]',
  },
];

export default function WelcomeSlides() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const goTo = (idx) => {
    setCurrent(idx);
    setAnimKey(k => k + 1);
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      navigate('/onboarding/language');
    }
  };

  const handleSkip = () => navigate('/onboarding/language');

  const slide = SLIDES[current];

  return (
    <>
      <style>{slideStyles}</style>
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">

        {/* Skip */}
        <div className="flex justify-end p-6">
          <button
            onClick={handleSkip}
            className="text-xs text-[var(--text-faint)] hover:text-white transition-colors tracking-widest uppercase font-medium"
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-4">
          {/* Illustration area */}
          <div key={`illus-${animKey}`}>
            <slide.Illustration />
          </div>

          {/* Text */}
          <div key={`text-${animKey}`} className="text-center max-w-sm mt-8">
            <h1 className="slide-head-in text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              <span className={`bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent`}>
                {slide.title}
              </span>
            </h1>
            <p className="slide-card-in text-sm md:text-base text-[var(--text-muted)] leading-relaxed" style={{ animationDelay: '0.1s' }}>
              {slide.subtitle}
            </p>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="px-8 pb-12 flex flex-col items-center gap-6">
          {/* Dot indicators */}
          <div className="flex gap-2">
            {SLIDES.map((s) => (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={`rounded-full transition-all duration-300 ${
                  s.id === current
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Next / Get Started button */}
          <button
            onClick={handleNext}
            className="
              w-full max-w-xs flex items-center justify-center gap-2
              bg-white text-[var(--bg-primary)] font-bold text-base
              py-4 rounded-2xl shadow-[0_0_24px_rgba(255,255,255,0.15)]
              hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-200
            "
          >
            {current < SLIDES.length - 1 ? (
              <>Next <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Get Started <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
