import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Map, Navigation, CheckCircle, X, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';

const ShippingAnimationModal = ({ order, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const callbacksRef = useRef({ onSuccess, onClose });

  useEffect(() => {
    callbacksRef.current = { onSuccess, onClose };
  });

  const orderId = order?.id || order?.orderId || order?.marketplaceOrderId || order?._id;

  const handleDismiss = useCallback(() => {
    if (callbacksRef.current.onClose) {
      callbacksRef.current.onClose();
    }
  }, []);

  // Keyboard shortcut: ESC to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  const executeShipping = useCallback(async () => {
    if (!orderId) {
      setError('Order identifier is missing. Please close and try again.');
      return;
    }

    setError(null);
    setStep(0);

    let isMounted = true;
    const timers = [];

    // Step 0 -> 1 after 600ms
    timers.push(setTimeout(() => isMounted && setStep(prev => Math.max(prev, 1)), 600));
    // Step 1 -> 2 after 1400ms
    timers.push(setTimeout(() => isMounted && setStep(prev => Math.max(prev, 2)), 1400));

    try {
      const isFulfillment = Boolean(order?.marketplaceOrderId || order?.isFulfillmentOrder);
      let shipResponse = null;

      if (isFulfillment) {
        try {
          shipResponse = await axios.post(`/api/v1/fulfillment/${orderId}/request-courier`);
        } catch (fulfillErr) {
          console.warn('Fulfillment courier endpoint notice, attempting fallback...', fulfillErr?.message);
          shipResponse = await axios.post('/api/v1/orders/update-status', { orderId, status: 'SHIPPED' });
        }
      } else {
        try {
          shipResponse = await axios.post('/api/v1/orders/update-status', { orderId, status: 'SHIPPED' });
        } catch (statusErr) {
          console.warn('Orders update-status notice, attempting fulfillment route...', statusErr?.message);
          try {
            shipResponse = await axios.post(`/api/v1/fulfillment/${orderId}/request-courier`);
          } catch (fbErr) {
            throw statusErr;
          }
        }
      }

      if (!isMounted) return;

      // Advance to completed step
      setStep(3);

      timers.push(setTimeout(() => {
        if (!isMounted) return;
        toast.success('Order successfully shipped!', { icon: '🚚' });
        if (callbacksRef.current.onSuccess) {
          callbacksRef.current.onSuccess();
        } else if (callbacksRef.current.onClose) {
          callbacksRef.current.onClose();
        }
      }, 1000));
    } catch (err) {
      if (!isMounted) return;
      const errMsg = err.response?.data?.message || err.message || 'Failed to update shipping status.';
      setError(errMsg);
      toast.error(errMsg);
    }

    return () => {
      isMounted = false;
      timers.forEach(t => clearTimeout(t));
    };
  }, [orderId, order?.marketplaceOrderId, order?.isFulfillmentOrder]);

  useEffect(() => {
    let cleanupFn;
    executeShipping().then(cleanup => {
      cleanupFn = cleanup;
    });

    return () => {
      if (typeof cleanupFn === 'function') cleanupFn();
    };
  }, [executeShipping, isRetrying]);

  const steps = [
    { icon: Map, text: "Routing to Logistics Network..." },
    { icon: Navigation, text: "Dispatching Courier..." },
    { icon: Truck, text: "Loading Package into Transit..." },
    { icon: CheckCircle, text: "Order Successfully Shipped!" }
  ];

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative modal-3d-glass bg-neutral-900 border border-neutral-800 rounded-2xl p-7 max-w-sm w-full shadow-[0_0_80px_rgba(0,128,255,0.2)] flex flex-col items-center overflow-hidden">
        
        {/* Dismiss / Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800/80 transition-colors"
          title="Close"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Animated background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-40 animate-pulse pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col items-center text-white">
          <div className="w-24 h-24 rounded-full border-4 border-neutral-800 flex items-center justify-center mb-5 relative bg-neutral-950/80">
            {error ? (
              <AlertCircle size={44} className="text-rose-500 animate-in zoom-in duration-300" />
            ) : step === 3 ? (
              <CheckCircle size={48} className="text-emerald-400 animate-in zoom-in duration-500" />
            ) : (
              <Truck size={44} className="text-blue-400 animate-bounce" />
            )}
            
            {/* Spinning ring while in progress */}
            {!error && step < 3 && (
              <div className="absolute inset-[-4px] border-4 border-transparent border-t-blue-400 rounded-full animate-spin"></div>
            )}
          </div>

          <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 text-center">
            {error ? 'Shipping Notice' : step === 3 ? 'Shipped' : 'Shipping Protocol'}
          </h2>
          <p className="text-xs text-neutral-400 font-mono mb-5 text-center truncate max-w-[240px]">
            {orderId ? `#${String(orderId).slice(-8).toUpperCase()}` : 'Logistics Routing'}
          </p>

          {/* Error Banner with Retry & Close */}
          {error ? (
            <div className="w-full space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRetrying(r => !r)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20"
                >
                  <RefreshCw size={14} /> Retry
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = step === idx;
                const isDone = step > idx;
                
                if (!isActive && !isDone) return null;

                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 animate-in slide-in-from-bottom-2
                      ${isDone 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-neutral-800/80 border-neutral-700 text-white'}`}
                  >
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle size={18} className="text-blue-400" />
                      ) : (
                        <Icon size={18} className={isActive ? "animate-pulse text-blue-400" : "text-neutral-400"} />
                      )}
                    </div>
                    <span className={`font-semibold tracking-wide text-xs ${isActive ? 'animate-pulse text-blue-300' : 'text-neutral-300'}`}>
                      {s.text}
                    </span>
                  </div>
                );
              })}

              {/* Progress Bar */}
              <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-6 overflow-hidden">
                <div 
                  className="bg-blue-400 h-full transition-all duration-300 ease-linear shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                  style={{ width: `${Math.min(((step + 1) / 4) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ShippingAnimationModal;
