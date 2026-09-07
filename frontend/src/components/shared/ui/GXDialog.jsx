/**
 * GXDialog — Premium Custom Modal System
 * Replaces all window.confirm / window.prompt / window.alert
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle2, Trash2, MessageCircle, Info, Sparkles } from 'lucide-react';

let _resolve = null;
const listeners = new Set();

function emit(config) {
  return new Promise((resolve) => {
    _resolve = resolve;
    listeners.forEach((fn) => fn(config));
  });
}

export const gxConfirm = (message, options = {}) => emit({ type: 'confirm', message, ...options });
export const gxPrompt  = (message, options = {}) => emit({ type: 'prompt',  message, ...options });
export const gxAlert   = (message, options = {}) => emit({ type: 'alert',   message, ...options });
export const gxDelete  = (message, options = {}) => emit({ type: 'delete',  message, ...options });

const PRESETS = {
  confirm: { icon: <Sparkles size={32} className="text-black" />,   ring: 'from-black/10 via-black/5 to-transparent',   confirmCls: 'btn-premium',    confirmLabel: 'Confirm'     },
  delete:  { icon: <Trash2   size={32} className="text-black" />,    ring: 'from-black/10 via-black/5 to-transparent',      confirmCls: 'btn-premium',      confirmLabel: 'Delete'      },
  prompt:  { icon: <MessageCircle size={32} className="text-black" />, ring: 'from-black/10 via-black/5 to-transparent', confirmCls: 'btn-premium', confirmLabel: 'Send'  },
  alert:   { icon: <Info size={32} className="text-black" />,      ring: 'from-black/10 via-black/5 to-transparent',  confirmCls: 'btn-premium',   confirmLabel: 'Got it'      },
  success: { icon: <CheckCircle2 size={32} className="text-black" />, ring: 'from-black/10 via-black/5 to-transparent', confirmCls: 'btn-premium', confirmLabel: 'Awesome!' },
  warning: { icon: <AlertTriangle size={32} className="text-black" />, ring: 'from-black/10 via-black/5 to-transparent', confirmCls: 'btn-premium', confirmLabel: 'I Understand' },
};

const CONFETTI_COLORS = ['#60a5fa','#a78bfa','#34d399','#f87171','#fbbf24','#f472b6'];

const Confetti = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
    {[...Array(18)].map((_, i) => (
      <span
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          left: `${10 + (i * 5) % 80}%`,
          top: `${20 + (i * 7) % 50}%`,
          background: CONFETTI_COLORS[i % 6],
          opacity: 0,
          animation: `confettiBurst 0.8s ease-out ${i * 40}ms forwards`,
          transform: `rotate(${i * 20}deg)`,
        }}
      />
    ))}
  </div>
);

function GXDialogModal({ config, onClose }) {
  const [value, setValue] = useState(config.defaultValue || '');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const preset = PRESETS[config.variant || config.type] || PRESETS.confirm;
  const isSuccess = config.variant === 'success';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    if (config.type === 'prompt') setTimeout(() => inputRef.current?.focus(), 150);
    const handler = (e) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleConfirm = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(config.type === 'prompt' ? value : true), 200);
  }, [value, config.type, onClose]);

  const handleCancel = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(config.type === 'prompt' ? null : false), 200);
  }, [config.type, onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/40 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none pointer-events-none'}`}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className={`relative w-full max-w-md premium-glass rounded-3xl overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-b ${preset.ring} pointer-events-none`} />
        {isSuccess && <Confetti />}

        {config.type !== 'alert' && (
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="relative z-10 px-8 pt-10 pb-8">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shadow-inner">
              {config.icon || preset.icon}
            </div>
          </div>

          {config.title && (
            <h2 className="text-xl font-extrabold text-slate-900 text-center mb-2 tracking-tight">
              {config.title}
            </h2>
          )}

          <p className="text-slate-500 text-center text-sm leading-relaxed mb-6">
            {config.message}
          </p>

          {config.type === 'prompt' && (
            <div className="mb-6">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirm(); } }}
                placeholder={config.placeholder || 'Type your message…'}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none"
              />
              <p className="text-xs text-slate-400 mt-1.5 text-right">Shift+Enter for new line · Enter to send</p>
            </div>
          )}

          <div className={`flex gap-3 ${config.type === 'alert' ? 'justify-center' : ''}`}>
            {config.type !== 'alert' && (
              <button
                onClick={handleCancel}
                className="flex-1 btn-outline rounded-xl py-2.5 font-semibold"
              >
                {config.cancelLabel || 'Cancel'}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={config.type === 'prompt' && !value.trim()}
              className={`flex-1 rounded-xl py-2.5 font-semibold ${preset.confirmCls} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {config.confirmLabel || preset.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function GXDialogHost() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handler = (cfg) => setConfig(cfg);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  if (!config) return null;

  return (
    <GXDialogModal
      config={config}
      onClose={(result) => {
        setConfig(null);
        if (_resolve) { _resolve(result); _resolve = null; }
      }}
    />
  );
}

export default GXDialogHost;
