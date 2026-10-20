import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, CreditCard, Sparkles } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';
import { WReasoningAnimation } from '../motion/WReasoningAnimation';
import toast from 'react-hot-toast';

const StorePurchaseModal = ({ store, isOpen, onClose }) => {
  const [billing, setBilling] = useState('quarterly'); // 'quarterly' or 'annual'
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  const unlockPremiumStore = useSellerStore(state => state.unlockPremiumStore);
  const updateStoreConfig = useSellerStore(state => state.updateStoreConfig);
  const error = useSellerStore(state => state.error);

  if (!isOpen || !store) return null;

  const handlePurchase = async () => {
    setIsProcessing(true);
    setGenerationStep('Authenticating Secure Purchase...');

    const payload = {
      theme: store.name + ' Portfolio',
      tier: store.tier,
      payFromWallet: true,
      amount: currentPrice
    };

    const success = await unlockPremiumStore(payload);

    if (success) {
      setGenerationStep('Unlocking Portfolio Access...');
      
      setTimeout(() => {
        setGenerationStep('Configuring Design Tokens...');
      }, 1500);

      setTimeout(async () => {
        setGenerationStep('Finalizing Architecture...');
        await updateStoreConfig({
          portfolioLayout: store.name + ' Portfolio',
          portfolioSlug: store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        });
        
        setIsProcessing(false);
        setIsSuccess(true);
      }, 3000);
    } else {
      setIsProcessing(false);
      toast.error(useSellerStore.getState().error || 'Transaction failed. Please try again.');
    }
  };

  const basePrice = store.price;
  const annualDiscount = 0.2; // 20% off for annual
  const currentPrice = billing === 'quarterly' ? basePrice : Math.round(basePrice * (1 - annualDiscount));
  const billingText = billing === 'quarterly' ? 'every 3 months' : 'annually (billed up front)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="modal-panel bg-white rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl relative"
        >
          {(!isProcessing && !isSuccess) && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
          )}

          {isProcessing ? (
            <div className="p-16 w-full min-h-[500px] flex flex-col items-center justify-center text-center bg-[var(--bg-primary)]">
              <WReasoningAnimation message={generationStep} />
              <div className="mt-12 w-64 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden shadow-inner">
                <motion.div 
                   className="h-full bg-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]"
                   initial={{ width: "0%" }}
                   animate={{ width: "100%" }}
                   transition={{ duration: 4.5, ease: "linear" }}
                />
              </div>
            </div>
          ) : isSuccess ? (
             <div className="p-16 w-full min-h-[500px] flex flex-col items-center justify-center text-center bg-[var(--bg-primary)]">
               <motion.div 
                 initial={{ scale: 0, rotate: -180 }} 
                 animate={{ scale: 1, rotate: 0 }}
                 transition={{ type: "spring", bounce: 0.5 }}
                 className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
               >
                 <CheckCircle size={48} />
               </motion.div>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                 <h2 className="text-4xl font-extrabold text-black mb-3">Store Activated!</h2>
                 <p className="text-[var(--text-muted)] text-lg mb-10 max-w-md mx-auto">
                   Your <strong>{store.name}</strong> portfolio is now fully unlocked, configured, and live.
                 </p>
                 <button 
                   onClick={() => {
                      if (window.opener) {
                        window.close();
                      } else {
                        // Fallback if not opened via window.open
                        window.location.href = '/seller/dashboard';
                      }
                   }}
                   className="bg-black text-white px-10 py-4 rounded-full font-bold shadow-xl hover:scale-105 hover:bg-gray-900 transition-all flex items-center gap-2 mx-auto"
                 >
                   <Sparkles size={18} /> Go to Seller Dashboard
                 </button>
               </motion.div>
             </div>
          ) : (
            <>
              {/* Left: Store Details */}
              <div className="flex-1 p-8 bg-[var(--bg-tertiary)] border-r border-[var(--border-color)] flex flex-col justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-[var(--border-color)] mb-4 self-start shadow-sm">
                  <Sparkles size={14} className="text-yellow-500" /> {store.tier} Tier
                </div>
                <h2 className="text-4xl font-extrabold text-black leading-tight mb-4">{store.name}</h2>
                <p className="text-[var(--text-muted)] text-base mb-8 leading-relaxed">{store.description}</p>
                
                <h4 className="font-bold text-black mb-4 uppercase tracking-wider text-xs">Included in this experience:</h4>
                <div className="space-y-4">
                  {store.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Checkout */}
              <div className="w-full md:w-[420px] p-8 flex flex-col bg-white relative justify-center">
                <h3 className="text-2xl font-bold text-black mb-8">Complete Purchase</h3>

                {/* Billing Toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-8 shadow-inner">
                  <button 
                    onClick={() => setBilling('quarterly')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${billing === 'quarterly' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Quarterly
                  </button>
                  <button 
                    onClick={() => setBilling('annual')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${billing === 'annual' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Annually <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded ml-1 animate-pulse">SAVE 20%</span>
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-center mb-10">
                    <div className="text-6xl font-black text-black tracking-tighter">₦{currentPrice}</div>
                    <div className="text-sm text-[var(--text-muted)] font-medium mt-3 uppercase tracking-wider">{billingText}</div>
                  </div>

                  <div className="space-y-4 border-t border-gray-100 pt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-bold text-black">₦{currentPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Taxes & Fees</span>
                      <span className="font-bold text-green-500">Included</span>
                    </div>
                    <div className="flex justify-between text-xl font-black mt-4 pt-4 border-t border-gray-100">
                      <span className="text-black">Total Due</span>
                      <span className="text-black">₦{currentPrice}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-10 bg-black text-white hover:bg-gray-900 shadow-xl hover:-translate-y-1"
                >
                  <CreditCard size={20} /> Purchase & Activate
                </button>
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                  <CheckCircle size={12} /> Secure 256-bit SSL transaction
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StorePurchaseModal;
