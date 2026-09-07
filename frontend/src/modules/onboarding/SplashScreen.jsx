import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

/* ── Keyframe styles injected once ─────────────────────────── */
const splashStyles = `
  @keyframes splashFadeIn {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  @keyframes splashLogoReveal {
    0%   { opacity: 0; letter-spacing: 0.6em; filter: blur(8px); }
    60%  { opacity: 1; letter-spacing: 0.12em; filter: blur(0);  }
    100% { opacity: 1; letter-spacing: 0.12em; filter: blur(0);  }
  }
  @keyframes splashSubReveal {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes floatA {
    0%,100% { transform: translate(0,0) rotate(0deg);     }
    33%     { transform: translate(18px,-22px) rotate(15deg); }
    66%     { transform: translate(-14px,10px) rotate(-8deg); }
  }
  @keyframes floatB {
    0%,100% { transform: translate(0,0) rotate(0deg);      }
    33%     { transform: translate(-20px,16px) rotate(-18deg); }
    66%     { transform: translate(12px,-18px) rotate(10deg);  }
  }
  @keyframes floatC {
    0%,100% { transform: translate(0,0) scale(1);      }
    50%     { transform: translate(10px,-12px) scale(1.1); }
  }
  @keyframes particle {
    0%   { opacity: 0; transform: translateY(0) scale(0.5);  }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translateY(-80px) scale(0); }
  }
  @keyframes progressBar {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes spinSlow {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulseGlow {
    0%,100% { box-shadow: 0 0 20px rgba(211,211,211,0.15); }
    50%     { box-shadow: 0 0 50px rgba(211,211,211,0.40); }
  }
  @keyframes unfoldBox {
    0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
    60%  { transform: scale(1.1) rotate(5deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  .splash-logo     { animation: splashLogoReveal 1.2s ease 0.3s both; }
  .splash-sub      { animation: splashSubReveal  0.8s ease 1.2s both; }
  .splash-card     { animation: splashFadeIn     0.6s ease 0.1s both; }
  .float-a         { animation: floatA 6s ease-in-out infinite; }
  .float-b         { animation: floatB 7s ease-in-out infinite; }
  .float-c         { animation: floatC 5s ease-in-out infinite; }
  .spin-slow       { animation: spinSlow 20s linear infinite; }
  .pulse-glow      { animation: pulseGlow 3s ease-in-out infinite; }
  .unfold-box      { animation: unfoldBox 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
`;

/* ── Floating particle ──────────────────────────────────────── */
const Particle = ({ style }) => (
  <div
    className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
    style={{ animation: 'particle 3s ease-out infinite', ...style }}
  />
);

/* ── Geometric box ──────────────────────────────────────────── */
const GeoBox = ({ className, style, delay = '0s' }) => (
  <div
    className={`unfold-box absolute rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}
    style={{ animationDelay: delay, ...style }}
  />
);

export default function SplashScreen() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  const advance = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => navigate('/onboarding/slides'), 400);
  };

  /* Auto-advance after 3 s */
  useEffect(() => {
    const t = setTimeout(advance, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{splashStyles}</style>

      <div
        className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-primary)] transition-opacity duration-400 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* ── Background radial glow ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/[0.05] blur-2xl" />
        </div>

        {/* ── Spinning outer ring ── */}
        <div className="spin-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/5 pointer-events-none" />
        <div className="spin-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-dashed border-white/[0.06] pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '14s' }} />

        {/* ── Geometric unfolding boxes ── */}
        <GeoBox className="w-20 h-20 float-a top-[15%] left-[12%]"  delay="0.2s" />
        <GeoBox className="w-12 h-12 float-b top-[20%] right-[16%]" delay="0.4s" />
        <GeoBox className="w-28 h-28 float-c bottom-[18%] left-[8%]" delay="0.6s" />
        <GeoBox className="w-16 h-16 float-a bottom-[22%] right-[12%]" delay="0.8s" style={{ borderRadius: '50%' }} />
        <GeoBox className="w-8  h-8  float-b top-[40%] left-[5%]"   delay="1.0s" />
        <GeoBox className="w-10 h-10 float-c top-[35%] right-[6%]"  delay="1.1s" />

        {/* ── Floating particles ── */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Particle
            key={i}
            style={{
              left: `${10 + i * 7.5}%`,
              bottom: `${15 + (i % 3) * 10}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2.5 + (i % 4) * 0.5}s`,
            }}
          />
        ))}

        {/* ── Product cards floating (decorative) ── */}
        <div className="float-a absolute top-[12%] left-[52%] hidden md:block">
          <div className="w-24 h-28 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md flex flex-col items-center justify-center gap-1 p-2 shadow-lg">
            <span className="text-2xl">👟</span>
            <span className="text-[9px] text-white/60 font-medium">Sneakers</span>
            <span className="text-[10px] text-white font-bold">$129</span>
          </div>
        </div>
        <div className="float-b absolute bottom-[20%] right-[54%] hidden md:block">
          <div className="w-20 h-24 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md flex flex-col items-center justify-center gap-1 p-2 shadow-lg">
            <span className="text-2xl">⌚</span>
            <span className="text-[9px] text-white/60 font-medium">Watch</span>
            <span className="text-[10px] text-white font-bold">$249</span>
          </div>
        </div>

        {/* ── Center content ── */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center splash-card">

          {/* Logo mark */}
          <div className="pulse-glow w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
            <Zap className="w-9 h-9 text-white" fill="white" fillOpacity={0.8} />
          </div>

          {/* Brand name */}
          <div>
            <h1 className="splash-logo text-5xl md:text-6xl font-black text-white tracking-[0.12em] uppercase select-none">
              W-Commerce
            </h1>
            <p className="splash-sub mt-3 text-sm md:text-base text-[var(--text-muted)] tracking-widest uppercase font-light">
              Where commerce meets intelligence
            </p>
          </div>

          {/* Tagline */}
          <p className="splash-sub text-lg md:text-xl text-white/80 font-light max-w-xs leading-relaxed" style={{ animationDelay: '1.4s' }}>
            Welcome to the future of commerce
          </p>

          {/* Progress bar */}
          <div className="w-48 h-0.5 rounded-full bg-white/10 overflow-hidden mt-4">
            <div
              className="h-full bg-white/60 rounded-full"
              style={{ animation: 'progressBar 3s linear forwards' }}
            />
          </div>
        </div>

        {/* ── Skip button ── */}
        <button
          onClick={advance}
          className="absolute bottom-10 right-8 text-xs text-[var(--text-faint)] hover:text-white transition-colors duration-200 tracking-widest uppercase font-medium"
        >
          Skip →
        </button>
      </div>
    </>
  );
}
