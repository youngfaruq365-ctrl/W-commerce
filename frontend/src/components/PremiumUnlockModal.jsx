import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, ShieldCheck, Wallet, Tag, Sparkles, Star } from 'lucide-react';

const PremiumUnlockModal = ({ isOpen, onClose, tier, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [promoCode, setPromoCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [promoStatus, setPromoStatus] = useState(null); // 'success', 'error', null
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPromoCode('');
      setPromoStatus(null);
      setPaymentMethod('wallet');
    }
  }, [isOpen]);

  useEffect(() => {
    if (paymentMethod !== 'promo' || promoCode.length < 3) {
      setPromoStatus(null);
      return;
    }

    const verify = setTimeout(() => {
      setIsVerifying(true);
      setTimeout(() => {
        if (promoCode === 'GLOBALX-VIP') {
          setPromoStatus('success');
        } else {
          setPromoStatus('error');
        }
        setIsVerifying(false);
      }, 800);
    }, 500);

    return () => clearTimeout(verify);
  }, [promoCode, paymentMethod]);

  if (!isOpen || !tier) return null;

  const handleSubmit = async () => {
    if (paymentMethod === 'promo' && promoStatus !== 'success') return;
    
    setIsSubmitting(true);
    let payload = { theme: `${tier.name} Portfolio`, grade: tier.name };
    if (paymentMethod === 'wallet') {
      payload.payFromWallet = true;
    } else {
      payload.promoCode = promoCode;
    }

    try {
      await onConfirm(payload);
    } catch (error) {
      // error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierColor = (name) => {
    switch(name) {
      case 'Pro': return 'from-blue-500 to-cyan-400 border-blue-500 text-blue-400 shadow-blue-500/50';
      case 'Premium': return 'from-purple-500 to-pink-500 border-purple-500 text-purple-400 shadow-purple-500/50';
      case 'Ultra': return 'from-pink-500 to-rose-400 border-pink-500 text-pink-400 shadow-pink-500/50';
      case 'Pro Ultra': return 'from-yellow-400 to-orange-500 border-yellow-400 text-yellow-400 shadow-yellow-500/50';
      default: return 'from-gray-400 to-gray-500 border-gray-500 text-gray-700 shadow-gray-500/50';
    }
  };

  const getGlowColor = (name) => {
    switch(name) {
      case 'Pro': return 'bg-blue-500/20';
      case 'Premium': return 'bg-purple-500/20';
      case 'Ultra': return 'bg-pink-500/20';
      case 'Pro Ultra': return 'bg-yellow-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  const tierColors = getTierColor(tier.name);
  const glowColor = getGlowColor(tier.name);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Absolute Backdrop */}
      <div 
        className="absolute inset-0 bg-white/80 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-md bg-[#0a0a0a]/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-500`}>
        
        {/* Dynamic Glow Behind */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 ${glowColor} blur-[80px] rounded-full pointer-events-none`}></div>
        
        {/* Header */}
        <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tierColors} flex items-center justify-center text-black`}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black tracking-wide">
                Unlock <span className={`bg-clip-text text-transparent bg-gradient-to-r ${tierColors}`}>{tier.name}</span>
              </h2>
              <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
                <Star size={12} className={tierColors.split(' ')[3]}/> Upgrade your digital presence
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-700 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 space-y-6">
          
          {/* Price Box */}
          <div className="flex items-center justify-between p-5 bg-white/60 border border-white/10 rounded-2xl group hover:border-white/20 transition-all">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">One-time Unlock</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-black"> ₦{tier.price}</span>
                <span className="text-gray-500 font-medium">.00</span>
              </div>
            </div>
            <div className={`p-4 rounded-full bg-gradient-to-br ${tierColors} bg-opacity-10 opacity-80 group-hover:opacity-100 transition-opacity`}>
              {tier.icon}
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex bg-white/40 border border-white/5 rounded-xl p-1 relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg transition-transform duration-300 ease-out ${paymentMethod === 'promo' ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>
            
            <button 
              onClick={() => setPaymentMethod('wallet')}
              className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'wallet' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Wallet size={16} /> Pay via Wallet
            </button>
            <button 
              onClick={() => setPaymentMethod('promo')}
              className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'promo' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Tag size={16} /> Promo Code
            </button>
          </div>

          {/* Dynamic Payment Body */}
          <div className="min-h-[120px] flex flex-col justify-center relative overflow-hidden">
            {paymentMethod === 'wallet' ? (
              <div className="space-y-4 text-center animate-in slide-in-from-left-4 fade-in duration-300">
                <p className="text-sm text-gray-700">
                  <span className="text-black font-bold"> ₦{tier.price}</span> will be deducted securely from your available wallet balance.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-700 400 font-bold bg-gray-400 500/10 py-2 px-4 rounded-full mx-auto w-fit border border-gray-400 500/20">
                  <ShieldCheck size={16} /> Encrypted & Secure Transaction
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in slide-in-from-right-4 fade-in duration-300">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Voucher Code</label>
                <div className="relative group">
                  <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${promoCode ? 'text-black' : 'text-gray-600'}`} size={18} />
                  <input 
                    type="text" 
                    placeholder="e.g. GLOBALX-VIP"
                    className={`w-full bg-[#111] border rounded-xl py-4 pl-12 pr-12 text-black font-mono uppercase focus:outline-none transition-all shadow-inner ${
                      promoStatus === 'success' ? 'border-gray-400 500/50 focus:border-gray-400 400 focus:shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
                      promoStatus === 'error' ? 'border-gray-400 500/50 focus:border-gray-400 400 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                      'border-white/10 focus:border-white/30 hover:border-white/20'
                    }`}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isVerifying ? (
                      <Loader2 size={20} className="text-gray-700 animate-spin" />
                    ) : promoStatus === 'success' ? (
                      <CheckCircle size={20} className="text-gray-700 500 animate-in zoom-in" />
                    ) : promoStatus === 'error' ? (
                      <X size={20} className="text-gray-700 500 animate-in zoom-in" />
                    ) : null}
                  </div>
                </div>
                {promoStatus === 'success' && (
                  <p className="text-xs text-gray-700 400 flex items-center gap-1.5 animate-in slide-in-from-top-2 ml-1 font-medium"><CheckCircle size={14}/> Code verified! 100% discount applied.</p>
                )}
                {promoStatus === 'error' && (
                  <p className="text-xs text-gray-700 400 flex items-center gap-1.5 animate-in slide-in-from-top-2 ml-1 font-medium"><X size={14}/> Invalid or expired promo code.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 relative z-10">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || (paymentMethod === 'promo' && promoStatus !== 'success')}
            className={`relative w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ${
              isSubmitting || (paymentMethod === 'promo' && promoStatus !== 'success')
                ? 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-white/5'
                : `bg-gradient-to-r ${tierColors} text-black border-none hover:-translate-y-1`
            }`}
          >
            {/* Button Glow/Shadow based on tier */}
            {!(isSubmitting || (paymentMethod === 'promo' && promoStatus !== 'success')) && (
              <div className={`absolute inset-0 bg-white/20 hover:bg-transparent transition-colors`}></div>
            )}
            
            {isSubmitting ? (
              <Loader2 size={22} className="animate-spin text-gray-700" /> 
            ) : (
              <>
                <Sparkles size={20} className={paymentMethod === 'promo' && promoStatus === 'success' ? '' : 'hidden'}/>
                {paymentMethod === 'promo' && promoStatus === 'success' ? 'Unlock for Free' : 'Confirm & Unlock'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumUnlockModal;
