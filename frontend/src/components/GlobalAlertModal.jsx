import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

const GlobalAlertModal = () => {
  const [alertData, setAlertData] = useState({ show: false, message: '', resolve: null });

  useEffect(() => {
    // Overwrite native window.alert globally
    const originalAlert = window.alert;
    window.alert = (message) => {
      return new Promise((resolve) => {
        setAlertData({ show: true, message: String(message), resolve });
      });
    };

    return () => {
      window.alert = originalAlert; // Restore on unmount
    };
  }, []);

  if (!alertData.show) return null;

  const isSuccess = alertData.message.toLowerCase().includes('success');
  const accentColor = isSuccess ? 'var(--accent-green, #10B981)' : 'var(--accent-gray)';
  const shadowColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 0, 0, 0.15)';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
      <div 
        className="premium-glass !border-t-4 rounded-2xl p-8 max-w-sm w-full animate-[slideUp_0.4s_ease-out] relative overflow-hidden"
        style={{ borderTopColor: accentColor, boxShadow: `0 0 50px ${shadowColor}` }}
      >
        {/* Glow effect at the top */}
        <div className="absolute top-0 left-0 w-full h-20 opacity-20 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)` }}></div>
        
        <div className="flex flex-col items-center mb-6 relative z-10 text-center">
          <div className="p-4 rounded-2xl mb-4 border" style={{ backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 0, 0, 0.1)', borderColor: shadowColor, color: accentColor, boxShadow: `0 0 20px ${shadowColor}` }}>
             <Icon size={36} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-extrabold text-[var(--text-main)] tracking-widest uppercase" style={{ textShadow: `0 0 10px ${shadowColor}` }}>{isSuccess ? 'Success' : 'W-Commerce'}</h3>
        </div>
        
        <div className="text-[var(--text-muted)] mb-8 leading-relaxed font-medium text-center text-sm relative z-10">
          {alertData.message}
        </div>
        
        <div className="flex justify-center relative z-10">
          <button 
            onClick={() => {
              if (alertData.resolve) alertData.resolve();
              setAlertData({ show: false, message: '', resolve: null });
            }}
            className="w-full text-[var(--bg-primary)] px-6 py-4 rounded-xl font-extrabold tracking-widest uppercase hover:-translate-y-1 transition-all duration-300"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${isSuccess ? 'rgba(16, 185, 129, 0.4)' : 'var(--accent-gray-dim)'}` }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalAlertModal;

