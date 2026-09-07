import React, { useState, useEffect, useRef } from 'react';
import { Truck, Map, Navigation, CheckCircle } from 'lucide-react';
import axios from 'axios';

const ShippingAnimationModal = ({ order, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    let isCancelled = false;
    let timer1, timer2, timer4;

    const processShipping = async () => {
      timer1 = setTimeout(() => !isCancelled && setStep(1), 800);
      timer2 = setTimeout(() => !isCancelled && setStep(2), 1800);
      
      try {
        await axios.post('/api/v1/orders/update-status', { orderId: order.id, status: 'SHIPPED' });
        
        if (!isCancelled) {
          setStep(3);
          timer4 = setTimeout(() => {
            if (!isCancelled) onSuccess();
          }, 1200);
        }
      } catch (error) {
        if (!isCancelled) {
          alert(error.response?.data?.message || "Failed to update order status.");
          onClose();
        }
      }
    };

    processShipping();

    return () => {
      isCancelled = true;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer4);
    };
  }, [order.id, onSuccess, onClose]);

  const steps = [
    { icon: Map, text: "Routing to Logistics Network..." },
    { icon: Navigation, text: "Dispatching Courier..." },
    { icon: Truck, text: "Loading Package into Transit..." },
    { icon: CheckCircle, text: "Order Successfully Shipped!" }
  ];

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="modal-3d-glass rounded-2xl p-8 max-w-sm w-full shadow-[0_0_80px_rgba(0,128,255,0.15)] flex flex-col items-center relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50 animate-pulse"></div>

        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-tertiary)] flex items-center justify-center mb-6 relative">
            {step === 3 ? (
              <CheckCircle size={48} className="text-gray-700 500 animate-in zoom-in duration-500" />
            ) : (
              <Truck size={48} className="text-blue-500 animate-bounce" />
            )}
            
            {/* Spinning ring */}
            {step < 3 && (
              <div className="absolute inset-[-4px] border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            )}
          </div>

          <h2 className="text-2xl font-extrabold text-black tracking-widest uppercase mb-6 text-center">
            {step === 3 ? 'Shipped' : 'Shipping Protocol'}
          </h2>

          <div className="w-full space-y-4">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === idx;
              const isDone = step > idx;
              
              if (!isActive && !isDone) return null;

              return (
                <div 
                  key={idx} 
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-500 animate-in slide-in-from-bottom-4
                    ${isDone 
                      ? 'bg-gray-400 500/10 border-gray-400 500/30 text-gray-700 400' 
                      : 'bg-blue-500/10 border-blue-500/30 text-black'}`}
                >
                  <div className="shrink-0">
                    {isDone ? <CheckCircle size={20} /> : <Icon size={20} className={isActive ? "animate-pulse text-blue-500" : ""} />}
                  </div>
                  <span className={`font-bold tracking-wide text-sm ${isActive ? 'animate-pulse' : ''}`}>
                    {s.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full mt-8 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(0,128,255,0.8)]"
              style={{ width: `${Math.min(((step + 1) / 4) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingAnimationModal;

