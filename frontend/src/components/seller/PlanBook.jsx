import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import "./PlanBook.css";
import rcLogo from "../../assets/rc-logo.png";

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const PlanPage = ({ plan, side, onSubscribe, isCurrentPlan, subscribingId, onTurnNext }) => {
  if (!plan) return null;
  const className = (plan.name || '').toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`${side} ${className}`}>
      {plan.name?.toLowerCase() === "premium" && (
        <div className="popular-badge">MOST POPULAR</div>
      )}
      <div className="page-inner">
        <div className="plan-header">
          <div className="plan-title">{plan.name}</div>
          <div className="plan-description">{plan.subtitle}</div>
        </div>

        <div className="price-section">
          <div className="price">
            <strong>{plan.displayPrice}</strong>{!plan.isManual && <span>/month</span>}
          </div>
          <div className="billing-text">{plan.isManual ? 'W-Commerce Guidelines' : 'Billed monthly via Paystack'}</div>
        </div>

        <ul className="features">
          {(plan.features || []).map((feat, i) => (
            <li key={i}>
              <span className="check">{checkIcon}</span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        {plan.isManual ? (
          <button 
            className="plan-button"
            onClick={plan.onAction || onTurnNext}
          >
            {plan.buttonText}
          </button>
        ) : (
          <button 
            className="plan-button"
            onClick={() => onSubscribe(plan.name, plan.id)}
            disabled={isCurrentPlan || subscribingId === (plan.id || plan.name) || plan.isComingSoon}
          >
            {subscribingId === (plan.id || plan.name) && <Loader2 size={16} className="animate-spin" style={{marginRight: "8px", display: "inline"}} />}
            {isCurrentPlan ? "Current Plan" : plan.buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export const PlanBook = ({ plans = [], currentTier, onSubscribe, subscribingId, isClosed, isManualMode, onOpenManual, onCloseManual, onReopenBook }) => {
  const safePlans = (plans && plans.length >= 3) ? plans : [
    { name: "Basic", subtitle: "Basic Features", displayPrice: "₦0", features: ["Storefront", "Basic support"], buttonText: "Subscribe" },
    { name: "Pro", subtitle: "For growing businesses", displayPrice: "₦1,500", features: ["Unlimited products", "Advanced analytics"], buttonText: "Start Pro Plan" },
    { name: "Premium", subtitle: "Maximum Scale", displayPrice: "₦3,500", features: ["AI tools", "Dedicated support", "Advanced Analytics"], buttonText: "Start Premium Plan" }
  ];

  const manualPages = [
    { 
      name: "Seller Manual", 
      subtitle: "Welcome Guide", 
      displayPrice: "Intro", 
      buttonText: "Next",
      isManual: true,
      features: ["Read about seller tools", "Manage your store", "Optimize products", "Understand analytics"] 
    },
    { 
      name: "Platform Policy", 
      subtitle: "Rules of Engagement", 
      displayPrice: "Policy", 
      buttonText: "Next",
      isManual: true,
      features: ["Zero tolerance for fraud", "Fair pricing policy", "Respect customer data", "Timely fulfillment"] 
    },
    { 
      name: "Current Plan", 
      subtitle: `${currentTier} Features`, 
      displayPrice: currentTier, 
      buttonText: "Next",
      isManual: true,
      features: safePlans.find(p => p?.name?.toUpperCase() === currentTier)?.features || ["Core platform access", "Basic store setup", "Standard analytics"]
    },
    { 
      name: "Regulations", 
      subtitle: "Compliance", 
      displayPrice: "Rules", 
      buttonText: "Next",
      isManual: true,
      features: ["No prohibited items", "Maintain > 4.5 rating", "Respond within 24h", "Comply with local laws"] 
    },
    { 
      name: "Advanced Tips", 
      subtitle: "Maximize Sales", 
      displayPrice: "Tips", 
      buttonText: "View Ultra",
      isManual: true,
      features: ["Use high quality images", "Run flash deals", "Leverage AI descriptions", "Offer free shipping"] 
    },
    { 
      ...(safePlans.find(p => p?.name?.toLowerCase() === 'premium') || safePlans[2] || {}),
      isManual: true,
      buttonText: "Close Manual",
      onAction: onCloseManual
    }
  ];

  const states = isManualMode ? [
    { left: manualPages[0], right: manualPages[1] },
    { left: manualPages[2], right: manualPages[3] },
    { left: manualPages[4], right: manualPages[5] }
  ] : safePlans.length >= 3 ? [
    { left: safePlans[0], right: safePlans[1] },
    { left: safePlans[1], right: safePlans[2] }
  ] : [
    { left: safePlans[0], right: safePlans[1] }
  ];

  const [currentState, setCurrentState] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setCurrentState(0);
  }, [isManualMode]);

  const [turningContent, setTurningContent] = useState({
    active: false,
    direction: null,
    front: null,
    back: null
  });

  const turningPageRef = useRef(null);
  const bookRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, currentX: 0, currentRotateY: 0, direction: null });

  const validIndex = Math.min(currentState, Math.max(0, states.length - 1));

  const turnNext = () => {
    if (animating || validIndex >= states.length - 1) return;
    setAnimating(true);
    dragRef.current.direction = 'next';

    setTurningContent({
      active: true,
      direction: 'next',
      front: states[validIndex]?.right,
      back: states[validIndex + 1]?.left,
    });

    if (turningPageRef.current) {
      turningPageRef.current.style.transition = "none";
      turningPageRef.current.style.transform = "rotateY(0deg)";
      turningPageRef.current.style.display = "block";
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (turningPageRef.current) {
          turningPageRef.current.style.transition = "transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)";
          turningPageRef.current.style.transform = "rotateY(-180deg)";
        }
      });
    });

    setTimeout(() => {
      setCurrentState(s => Math.min(s + 1, states.length - 1));
      setTurningContent({ active: false, direction: null, front: null, back: null });
      dragRef.current.direction = null;
      if (turningPageRef.current) {
         turningPageRef.current.style.display = "none";
      }
      setAnimating(false);
    }, 800);
  };

  const turnPrevious = () => {
    if (animating || validIndex <= 0) return;
    setAnimating(true);
    dragRef.current.direction = 'prev';

    setTurningContent({
      active: true,
      direction: 'prev',
      front: states[validIndex]?.left,
      back: states[validIndex - 1]?.right,
    });

    if (turningPageRef.current) {
      turningPageRef.current.style.transition = "none";
      turningPageRef.current.style.transform = "rotateY(-180deg)";
      turningPageRef.current.style.display = "block";
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (turningPageRef.current) {
          turningPageRef.current.style.transition = "transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)";
          turningPageRef.current.style.transform = "rotateY(0deg)";
        }
      });
    });

    setTimeout(() => {
      setCurrentState(s => Math.max(0, s - 1));
      setTurningContent({ active: false, direction: null, front: null, back: null });
      dragRef.current.direction = null;
      if (turningPageRef.current) {
         turningPageRef.current.style.display = "none";
      }
      setAnimating(false);
    }, 800);
  };

  useEffect(() => {
    let mounted = true;
    const demo = async () => {
      await new Promise(r => setTimeout(r, 1200));
      if (!mounted) return;
      document.getElementById('turn-next-btn')?.click();
      await new Promise(r => setTimeout(r, 2000));
      if (!mounted) return;
      document.getElementById('turn-prev-btn')?.click();
    };
    if (!isClosed) {
      demo();
    }
    return () => { mounted = false; };
  }, [isClosed]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") turnPrevious();
      if (e.key === "ArrowRight") turnNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [validIndex, animating, isManualMode, states.length]);

  const handlePointerDown = (e) => {
    if (animating) return;
    if (e.target.closest('button')) return; // Allow button clicks to work natively
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.currentRotateY = 0;
    dragRef.current.direction = null;
    if (bookRef.current) {
      bookRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.dragging || animating) return;
    dragRef.current.currentX = e.clientX;
    const distance = dragRef.current.currentX - dragRef.current.startX;

    if (Math.abs(distance) < 5 && !turningContent.active) return;

    if (!turningContent.active) {
        if (distance < 0 && validIndex < states.length - 1) {
            dragRef.current.direction = 'next';
            setTurningContent({
                active: true,
                direction: 'next',
                front: states[validIndex]?.right,
                back: states[validIndex + 1]?.left
            });
        } else if (distance > 0 && validIndex > 0) {
            dragRef.current.direction = 'prev';
            setTurningContent({
                active: true,
                direction: 'prev',
                front: states[validIndex]?.left,
                back: states[validIndex - 1]?.right
            });
        } else {
            return;
        }
    }

    let rotateY = 0;
    if (dragRef.current.direction === 'next') {
        const progress = Math.min(Math.max(-distance, 0) / 300, 1);
        rotateY = -progress * 180;
    } else if (dragRef.current.direction === 'prev') {
        const progress = Math.min(Math.max(distance, 0) / 300, 1);
        rotateY = -180 + progress * 180;
    }

    dragRef.current.currentRotateY = rotateY;

    if (turningPageRef.current) {
       turningPageRef.current.style.display = "block";
       turningPageRef.current.style.transition = "transform 0.1s ease-out";
       turningPageRef.current.style.transform = `rotateY(${rotateY}deg)`;
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.dragging || animating) return;
    dragRef.current.dragging = false;
    
    if (!turningContent.active || !dragRef.current.direction) return;

    if (dragRef.current.direction === 'next') {
        if (dragRef.current.currentRotateY < -60) {
           if (turningPageRef.current) {
               turningPageRef.current.style.transition = "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
               turningPageRef.current.style.transform = "rotateY(-180deg)";
           }
           setAnimating(true);
           setTimeout(() => {
             setCurrentState(s => Math.min(s + 1, states.length - 1));
             setTurningContent({ active: false, direction: null, front: null, back: null });
             dragRef.current.direction = null;
             if (turningPageRef.current) turningPageRef.current.style.display = "none";
             setAnimating(false);
           }, 500);
        } else {
           if (turningPageRef.current) {
               turningPageRef.current.style.transition = "transform 0.4s ease";
               turningPageRef.current.style.transform = "rotateY(0deg)";
           }
           setTimeout(() => {
             setTurningContent({ active: false, direction: null, front: null, back: null });
             dragRef.current.direction = null;
             if (turningPageRef.current) turningPageRef.current.style.display = "none";
           }, 400);
        }
    } else if (dragRef.current.direction === 'prev') {
        if (dragRef.current.currentRotateY > -120) {
           if (turningPageRef.current) {
               turningPageRef.current.style.transition = "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
               turningPageRef.current.style.transform = "rotateY(0deg)";
           }
           setAnimating(true);
           setTimeout(() => {
             setCurrentState(s => Math.max(0, s - 1));
             setTurningContent({ active: false, direction: null, front: null, back: null });
             dragRef.current.direction = null;
             if (turningPageRef.current) turningPageRef.current.style.display = "none";
             setAnimating(false);
           }, 500);
        } else {
           if (turningPageRef.current) {
               turningPageRef.current.style.transition = "transform 0.4s ease";
               turningPageRef.current.style.transform = "rotateY(-180deg)";
           }
           setTimeout(() => {
             setTurningContent({ active: false, direction: null, front: null, back: null });
             dragRef.current.direction = null;
             if (turningPageRef.current) turningPageRef.current.style.display = "none";
           }, 400);
        }
    }
  };

  const state = states[validIndex] || { left: null, right: null };
  let staticLeft = state.left;
  let staticRight = state.right;

  if (turningContent.active) {
      if (turningContent.direction === 'next' && validIndex < states.length - 1) {
          staticRight = states[validIndex + 1]?.right;
      } else if (turningContent.direction === 'prev' && validIndex > 0) {
          staticLeft = states[validIndex - 1]?.left;
      }
  }

  return (
    <motion.div 
      className={`book-wrapper ${isClosed ? 'is-closed' : ''}`}
      initial={{ opacity: 0, y: 80, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1 }}
    >
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d" }}
      >
      <div 
        className={`book ${isClosed ? 'is-closed' : ''}`}
        id="book" 
        ref={bookRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
      >
        <div className="closed-pages-block"></div>
        <div className="book-cover-left">
          {isClosed && (
            <div 
              className="front-cover-design" 
              onClick={(e) => { if (e.target.tagName !== 'BUTTON') onReopenBook?.(); }}
              title="Click to open book and view plans"
              style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotateY(180deg) translateZ(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
                style={{ zIndex: 10, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
                  W
                </div>
                {currentTier && (
                  <span style={{ position: 'absolute', color: 'white', fontWeight: 'bold', fontSize: '48px', top: '-50%', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {currentTier}
                  </span>
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                style={{ position: 'absolute', bottom: '15%', zIndex: 12, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
              >
                <button 
                  onClick={onReopenBook}
                  style={{ 
                    padding: '10px 22px', 
                    background: 'rgba(16, 185, 129, 0.25)', 
                    border: '1px solid rgba(16, 185, 129, 0.6)', 
                    color: '#34d399', 
                    borderRadius: '20px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.45)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  📖 View Plans
                </button>
                <button 
                  onClick={onOpenManual}
                  style={{ 
                    padding: '10px 22px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    color: 'white', 
                    borderRadius: '20px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Seller Manual
                </button>
              </motion.div>
            </div>
          )}
        </div>
        <div className="book-cover-right">
          {isClosed && (
            <div className="back-cover-design" style={{ position: 'absolute', width: '100%', height: '100%', transform: 'translateZ(-2px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '4px', textTransform: 'uppercase' }}>
                W-Commerce
              </div>
            </div>
          )}
        </div>
        <div className="book-spine"></div>
        <div className="paystack-logo-badge shadow-md bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider" style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>Paystack Secured</div>

        <PlanPage 
          plan={staticLeft} 
          side="left-page" 
          onSubscribe={onSubscribe}
          isCurrentPlan={currentTier === staticLeft?.name?.toUpperCase()}
          subscribingId={subscribingId} onTurnNext={turnNext}
        />
        <PlanPage 
          plan={staticRight} 
          side="right-page" 
          onSubscribe={onSubscribe}
          isCurrentPlan={currentTier === staticRight?.name?.toUpperCase()}
          subscribingId={subscribingId} onTurnNext={turnNext}
        />

        <div 
          className="turning-page" 
          ref={turningPageRef}
          style={{ display: "none" }}
        >
          {turningContent.front && (
            <PlanPage 
              plan={turningContent.front} 
              side="page-front" 
              onSubscribe={onSubscribe}
              isCurrentPlan={currentTier === turningContent.front?.name?.toUpperCase()}
              subscribingId={subscribingId} onTurnNext={turnNext}
            />
          )}
          {turningContent.back && (
            <PlanPage 
              plan={turningContent.back} 
              side="page-back" 
              onSubscribe={onSubscribe}
              isCurrentPlan={currentTier === turningContent.back?.name?.toUpperCase()}
              subscribingId={subscribingId} onTurnNext={turnNext}
            />
          )}
        </div>
      </div>

      <div className="book-controls">
        <button id="turn-prev-btn" className="book-control" onClick={turnPrevious} style={{ opacity: validIndex === 0 ? 0.3 : 1 }}>&#8592;</button>
        <div className="book-status">{state.left?.name} &bull; {state.right?.name}</div>
        <button id="turn-next-btn" className="book-control" onClick={turnNext} style={{ opacity: validIndex === states.length - 1 ? 0.3 : 1 }}>&#8594;</button>
      </div>
      <div className="swipe-hint">Drag or swipe the page to explore plans</div>
      </motion.div>
    </motion.div>
  );
};
