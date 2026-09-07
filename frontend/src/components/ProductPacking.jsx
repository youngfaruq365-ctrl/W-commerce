import React, { useState, useRef, useEffect } from 'react';

export default function ProductPacking({ trigger, onComplete, image }) {
  const canvasRef = useRef(null);
  const [animationState, setAnimationState] = useState('idle'); // idle, packing, sealed
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) {
      setAnimationState('idle');
      return;
    }

    setAnimationState('packing');
    const canvas = canvasRef.current;
    if (!canvas) return; // Safeguard
    
    const ctx = canvas.getContext('2d');
    
    // Set fixed layout matching parent frame dimensions
    canvas.width = 400;
    canvas.height = 400;

    // Define positions inside the workspace box
    const wheelCenter = { x: 200, y: 80 };
    const boxPosition = { x: 200, y: 300 };

    // Create 5 different prize package item nodes flying out
    let items = [];
    // Using theme-matching colors: red, gold, etc.
    const itemColors = ['#d3d3d3', '#ffd700', '#00e5ff', '#d3d3d3', '#ffffff'];
    
    let imgElement = null;
    if (image) {
      imgElement = new Image();
      imgElement.src = image;
    }

    for (let i = 0; i < 5; i++) {
      items.push({
        x: wheelCenter.x,
        y: wheelCenter.y,
        targetX: boxPosition.x,
        targetY: boxPosition.y - 15, // Drop slightly inside the box top opening
        progress: 0,
        speed: 0.04, // Faster individual speed
        delay: i * 20, // Wait 20 frames between each item
        size: 30 + (window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295) * 20, // Larger size to see the product image
        color: itemColors[i],
        // Random curve offsets to create a chaotic fluid spray look before falling into the box
        curveX: ((window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295) - 0.5) * 160,
        curveY: -(window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295) * 80 - 40, 
      });
    }

    let animationFrameId;

    let tick = 0;

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allItemsPacked = true;
      tick++;

      items.forEach((item) => {
        if (tick > item.delay) {
          if (item.progress < 1) {
            allItemsPacked = false;
            item.progress += item.speed;
            if (item.progress > 1) item.progress = 1;

          // Quadratic Bezier Curve path rendering logic: Wheel -> High Spray Arc Arc -> Destination Box
          const t = item.progress;
          const cpX = wheelCenter.x + item.curveX;
          const cpY = wheelCenter.y + item.curveY;

          item.x = (1 - t) * (1 - t) * wheelCenter.x + 2 * (1 - t) * t * cpX + t * t * item.targetX;
          item.y = (1 - t) * (1 - t) * wheelCenter.y + 2 * (1 - t) * t * cpY + t * t * item.targetY;

          // Scale down gracefully as the item descends into the package depths
          const currentSize = item.size * (1 - t * 0.4);

          // Render package icons (drawn as standard parcel squares with cross bands)
          ctx.save();
          ctx.translate(item.x, item.y);
          
          if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
            // Draw the actual product image
            ctx.shadowBlur = 15;
            ctx.shadowColor = item.color;
            ctx.drawImage(imgElement, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
            
            // Subtle neon border around the flying product
            ctx.shadowBlur = 0;
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
          } else {
            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = item.color;
            
            ctx.fillStyle = item.color;
            ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
            
            ctx.shadowBlur = 0; // Turn off glow for strokes
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
            
            // Shipping Ribbon Cross lines
            ctx.beginPath();
            ctx.moveTo(0, -currentSize / 2); ctx.lineTo(0, currentSize / 2);
            ctx.moveTo(-currentSize / 2, 0); ctx.lineTo(currentSize / 2, 0);
            ctx.stroke();
          }
            ctx.restore();
          }
        } else {
          allItemsPacked = false;
        }
      });

      if (!allItemsPacked) {
        animationFrameId = requestAnimationFrame(renderLoop);
      } else {
        // Trigger Box Sealing Sequence once items land safely
        setAnimationState('sealed');
        setTimeout(() => {
          if (onCompleteRef.current) onCompleteRef.current();
        }, 2500); // Wait 2.5s to let the 2s boxPackAndFly animation and 100% loading finish
      }
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      setAnimationState('idle');
    };
  }, [trigger, image]);

  if (!trigger && animationState === 'idle') return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-[100] bg-white/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-secondary)] rounded-2xl gray-glass-modal border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.2)] max-w-lg w-full p-8 flex flex-col items-center text-center relative overflow-hidden pointer-events-auto">
        
        {/* Glow behind the box */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-gray)] rounded-full blur-[80px] opacity-20 z-0"></div>

        <div className="relative w-[400px] h-[350px] flex flex-col items-center justify-between z-10">
          
          {/* Particle Canvas Core Drawing Board */}
          <canvas ref={canvasRef} className="absolute top-[-50px] left-0 w-full h-[400px]" />

          {/* Packing State Status Label Header */}
          <div className="mt-4 bg-[var(--accent-gray-dim)] border border-[var(--accent-gray)] text-[var(--accent-gray)] text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-[0_0_15px_var(--accent-gray-dim)] z-10 animate-pulse">
            {animationState === 'packing' ? 'Packing Escrow Items...' : 'Parcel Sealed & Dispatched!'}
          </div>

          {/* The Target Cardboard Delivery Shipping Box Element */}
          <div className="relative mb-8 flex flex-col items-center">
            
            {/* Animated Flaps Overlays */}
            {animationState === 'packing' ? (
              // Open Box Configuration
              <div className="flex gap-10 absolute top-[-22px] z-10 animate-bounce">
                <div className="w-10 h-6 bg-[var(--bg-primary)] rounded-sm origin-bottom transform -rotate-45 border-t border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]" />
                <div className="w-10 h-6 bg-[var(--bg-primary)] rounded-sm origin-bottom transform rotate-45 border-t border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]" />
              </div>
            ) : (
              // Sealed Box Tape Ribbon Overlay Graphic
              <div className="absolute top-[2px] w-24 h-2 bg-[var(--accent-gray)] rounded-xs shadow-[0_0_10px_var(--accent-gray)] z-20 animate-pulse" />
            )}

            {/* Core Cardboard Container Box Body */}
            <div 
              className={`w-28 h-24 bg-gradient-to-br from-[var(--bg-tertiary)] to-black rounded-b-xl border-t-4 border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] shadow-[0_0_20px_rgba(0,0,0,0.8)] relative flex items-center justify-center transition-all duration-500 ${
                animationState === 'sealed' ? 'scale-110 border-t-[var(--accent-gray)] animate-[boxPackAndFly_2s_forwards]' : ''
              }`}
            >
              {/* Premium Escrow Badge inside the 3D dark glass box */}
              <div className="w-12 h-12 icon-3d-glass-box transform -rotate-12 flex items-center justify-center border-white/20 !bg-white/5">
                 <span className="text-2xl emoji-icon drop-shadow-[0_0_10px_var(--accent-gray)]">🛡️</span>
              </div>
            </div>
          </div>

        </div>

        {/* Informational Text Matching the previous modal */}
        <div className="relative z-10 w-full mt-[-20px]">
           <h2 className="text-2xl font-bold mb-2 text-black">Item Secured!</h2>
           <p className="text-[var(--text-muted)] mb-6 text-sm">Your order is being sent to the Dubai Hub for Escrow locking and packaging.</p>
           
           {/* 3D Loading Animation Bar */}
           <div className="relative w-full bg-white/50 h-5 rounded-full overflow-hidden mb-2 border border-white/20 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] perspective-1000">
              <div className={`absolute top-0 left-0 h-full shadow-[0_0_15px_var(--accent-gray)] ${
                  animationState === 'packing' ? 'w-[50%] transition-all duration-[2000ms] ease-out' : 
                  animationState === 'sealed' ? 'w-full transition-all duration-[2500ms] ease-in-out' : 'w-0'
                }`} 
                   style={{
                     backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                     backgroundSize: '20px 20px',
                     backgroundColor: 'var(--accent-gray)',
                     animation: 'progressBar 1s linear infinite'
                   }}>
              </div>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
           </div>
        </div>

      </div>
    </div>
  );
}
