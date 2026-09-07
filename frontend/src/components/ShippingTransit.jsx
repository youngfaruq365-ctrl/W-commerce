import React, { useState, useEffect } from 'react';

export default function ShippingTransit({ trigger, onComplete, product }) {
  const [stage, setStage] = useState('idle'); // idle -> loading -> preview -> transit -> departed

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) {
      setStage('idle');
      return;
    }

    // Sequence timing stages to mimic a continuous cinematic flow
    setStage('loading');

    const transitTimer = setTimeout(() => {
      setStage('preview');
    }, 1500); // Wait for the conveyor/box drop animation to hit the truck

    return () => {
      clearTimeout(transitTimer);
    };
  }, [trigger]);

  const handleDispatch = () => {
    setStage('transit');
    setTimeout(() => {
      setStage('departed');
      if (onCompleteRef.current) onCompleteRef.current();
    }, 2000); // Wait 2s for truck to speed away
  };

  if (stage === 'idle') return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-[110] bg-white/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-secondary)] rounded-2xl gray-glass-modal border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.2)] max-w-lg w-full p-8 flex flex-col items-center text-center relative overflow-hidden pointer-events-auto">
        
        {/* Glow behind everything */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-gray)] rounded-full blur-[80px] opacity-20 z-0"></div>

        {/* 1. Animated Speed Streaks Background (Only active during high-speed transit phase) */}
        {stage === 'transit' && (
          <div className="absolute inset-0 w-full h-full overflow-hidden opacity-30 z-0">
            <div className="absolute top-1/4 left-0 w-24 h-1 bg-[var(--accent-gray)] rounded-full animate-[leftToRight_0.6s_infinite_linear]" />
            <div className="absolute top-1/2 left-0 w-40 h-1.5 bg-white rounded-full animate-[leftToRight_0.4s_infinite_linear_0.2s]" />
            <div className="absolute top-3/4 left-0 w-16 h-1 bg-[var(--accent-gray)] rounded-full animate-[leftToRight_0.5s_infinite_linear_0.1s]" />
          </div>
        )}

        {/* 2. Header Title Indicator Banner */}
        <div className={`relative mt-4 bg-[var(--accent-gray-dim)] border border-[var(--accent-gray)] text-[var(--accent-gray)] text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-[0_0_15px_var(--accent-gray-dim)] z-10 ${stage !== 'preview' ? 'animate-pulse' : ''}`}>
          {stage === 'loading' ? 'Dispatching Package...' : stage === 'preview' ? 'Verify Shipment' : 'Out For Express Delivery!'}
        </div>

        {/* Product Preview Overlay */}
        {stage === 'preview' && product && (
          <div className="absolute inset-x-4 top-20 bg-white/80 backdrop-blur-md rounded-xl border border-[var(--accent-gray)] p-6 z-[100] flex flex-col items-center animate-fade-in shadow-[0_0_40px_rgba(255,51,51,0.4)]">
            <h3 className="text-xl font-black text-black mb-2 uppercase tracking-wide">Ready for Dispatch</h3>
            <div className="flex gap-4 items-center mb-4 bg-white/5 p-4 rounded-lg border border-white/10 w-full">
               <img src={product.images?.[0]?.url || '/placeholder.png'} alt={product.name} className="w-16 h-16 object-cover rounded-md border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray)]" />
               <div className="flex-1 text-left">
                  <h4 className="font-bold text-lg text-black line-clamp-1">{product.name}</h4>
                  <p className="text-[var(--accent-gray)] font-black text-xl"> ₦{Number(product.price).toFixed(2)}</p>
               </div>
            </div>
            <p className="text-xs text-gray-700 mb-6 text-center">Your item has been securely packed and escrow-locked. Review the details above before final dispatch.</p>
            <button 
              onClick={handleDispatch}
              className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full font-black text-black shadow-[0_0_15px_var(--accent-gray)] hover:scale-105 transition-transform uppercase tracking-wider"
            >
              Confirm Dispatch 🚀
            </button>
          </div>
        )}

        {/* 3. The Main Animation Stage Area */}
        <div className="relative w-full h-64 flex items-center justify-center mt-6 mb-4 z-10">

          {/* 3D Perspective Road Surface */}
          <div className="absolute bottom-0 w-full h-24 flex justify-center overflow-hidden rounded-b-2xl border-t border-white/5" style={{ perspective: '400px' }}>
            <div className="absolute bottom-0 w-[200%] h-[400%] origin-bottom" style={{ transform: 'rotateX(75deg)' }}>
              {/* Main glowing road surface */}
              <div className="absolute inset-0 bg-neutral-950" />
              
              {/* Neon Grid / Stripes (Moving left to simulate truck moving right) */}
              <div className={`absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,transparent_80%,var(--accent-gray)_80%,var(--accent-gray)_100%)] bg-[length:100px_100%] opacity-80 shadow-[0_0_20px_var(--accent-gray)] ${stage === 'transit' ? 'animate-[roadMove_0.3s_infinite_linear]' : ''}`} />

              {/* Horizontal perspective lines (stationary, gives depth) */}
              <div className="absolute inset-0 w-full h-full bg-[linear-gradient(0deg,transparent_0%,transparent_90%,var(--accent-gray)_90%,var(--accent-gray)_100%)] bg-[length:100%_40px] opacity-40" />
            </div>
          </div>

          {/* [A] Cardboard Parcel Node (Dropping down into the truck bed) */}
          {(stage === 'loading' || stage === 'preview') && (
            <div className="absolute w-12 h-10 bg-gradient-to-br from-[var(--bg-tertiary)] to-black rounded-b-xl border-t-4 border-[var(--accent-gray)] shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center animate-[boxDropIntoTruck_1s_cubic-bezier(0.25,1,0.5,1)_forwards] z-20">
               <span className="text-sm emoji-icon drop-shadow-[0_0_10px_var(--accent-gray)]">🛡️</span>
            </div>
          )}

          {/* [B] Main Logistics Delivery Truck Graphic Group */}
          <div 
            className={`relative flex items-end justify-center transition-all pb-8 z-10 ${
              (stage === 'loading' || stage === 'preview') ? 'animate-[truckEngineIdle_0.15s_infinite_linear]' : ''
            } ${
              stage === 'transit' ? 'animate-[truckSpeedAway_1.2s_cubic-bezier(0.7,0,0.84,0)_forwards]' : ''
            }`}
          >
            {/* Main Truck Cab Outline Body Frame */}
            <div className="flex items-end drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]">
              {/* Cargo Container Trailer Box */}
              <div className="w-36 h-20 bg-gradient-to-b from-zinc-800 to-black rounded-tl-lg rounded-bl-sm border-r-2 border-zinc-700 relative shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] flex items-center justify-center">
                {/* Temu Express Logo */}
                <div className="px-3 py-1 bg-[var(--accent-gray)] rounded-md text-black font-black text-[11px] uppercase tracking-tighter transform -rotate-3 border border-white/20 shadow-[0_0_10px_var(--accent-gray)]">
                  TEMU EXPRESS
                </div>
              </div>

              {/* Front Driver Cabin Cockpit Node */}
              <div className="w-12 h-14 bg-[var(--accent-gray)] rounded-r-xl rounded-bl-xs relative border-b-2 border-gray-400 900 shadow-[inset_0_2px_5px_rgba(255,255,255,0.3)]">
                {/* Windshield */}
                <div className="absolute top-2 right-1 w-6 h-5 bg-sky-100/80 rounded-tr-md rounded-bl-xs border-r border-t border-white/50 backdrop-blur-sm" />
                {/* Headlight */}
                <div className="absolute bottom-4 right-0 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#fff,0_0_30px_#fff]" />
              </div>
            </div>

            {/* Wheels */}
            <div className="absolute bottom-[20px] left-0 w-full flex justify-around px-4 z-10">
              <div className={`w-8 h-8 bg-white rounded-full border-2 border-zinc-500 flex items-center justify-center shadow-[0_5px_10px_rgba(0,0,0,0.9)] ${stage === 'transit' ? 'animate-spin' : ''}`}>
                <div className="w-3 h-3 bg-zinc-400 rounded-full border border-zinc-600" />
              </div>
              <div className={`w-8 h-8 bg-white rounded-full border-2 border-zinc-500 flex items-center justify-center shadow-[0_5px_10px_rgba(0,0,0,0.9)] ${stage === 'transit' ? 'animate-spin' : ''}`}>
                <div className="w-3 h-3 bg-zinc-400 rounded-full border border-zinc-600" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tailwind Specific Core Keyframe Injector Layer */}
      <style>{`
        @keyframes leftToRight {
          0% { transform: translateX(-100px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(500px); opacity: 0; }
        }
        @keyframes boxDropIntoTruck {
          0% { transform: translate(-30px, -200px) scale(1.4) rotate(15deg); opacity: 0; }
          60% { transform: translate(-20px, -15px) scale(1) rotate(-5deg); opacity: 1; }
          80% { transform: translate(-20px, -25px) rotate(2deg); }
          100% { transform: translate(-20px, -14px) rotate(0deg); }
        }
        @keyframes truckEngineIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes truckSpeedAway {
          0% { transform: translateX(0px) scale(1); }
          20% { transform: translateX(-15px) scale(0.98); } /* Micro pullback compression windup effect */
          100% { transform: translateX(500px) scale(1.05); opacity: 0; }
        }
        @keyframes roadMove {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-100px); }
        }
      `}</style>
    </div>
  );
}
