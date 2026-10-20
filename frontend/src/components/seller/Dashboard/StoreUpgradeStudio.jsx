import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, Loader2, ArrowLeft, Wallet, Tag, X } from 'lucide-react';
import { useSellerStore } from '../../../store/sellerStore';
import { apiClient as axios } from '@/utils/apiClient';

const StoreUpgradeStudio = ({ portfolio, setPortfolio, brandConfig, setBrandConfig, storeConfig, updateStoreConfig, showNotification, user }) => {
  const unlockPremiumStore = useSellerStore(state => state.unlockPremiumStore);
  const error = useSellerStore(state => state.error);

  const premiumTiers = ['PRO', 'PREMIUM', 'ULTRA', 'PRO ULTRA', 'ULTRA1PRO', 'ULTRA2PRO'];
  const isPro = premiumTiers.includes(user?.subscriptionTier?.toUpperCase());
  const [step, setStep] = useState(isPro ? 'customize' : 'intro');
  const [selectedPlan, setSelectedPlan] = useState(isPro ? { name: user?.subscriptionTier || 'Pro', price: 0 } : null);
  const isCurrentPlan = isPro && selectedPlan?.name?.toUpperCase() === user?.subscriptionTier?.toUpperCase();
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (paymentMethod !== 'promo' || promoCode.length < 3) {
      setPromoStatus(null);
      return;
    }
    const verify = setTimeout(() => {
      setIsVerifying(true);
      setTimeout(() => {
        if (promoCode === 'GLOBALX-VIP') setPromoStatus('success');
        else setPromoStatus('error');
        setIsVerifying(false);
      }, 800);
    }, 500);
    return () => clearTimeout(verify);
  }, [promoCode, paymentMethod]);

  const handleSelectPlan = (plan, price) => {
    setSelectedPlan({ name: plan, price });
    setStep('customize');
  };

  const startCreation = async () => {
    if (paymentMethod === 'promo' && promoStatus !== 'success') return;
    setIsSubmitting(true);
    
    const payload = {
      theme: selectedPlan.name + ' Portfolio',
      grade: selectedPlan.name,
      tier: selectedPlan.name,
      amount: selectedPlan.price,
      payFromWallet: paymentMethod === 'wallet',
      promoCode: paymentMethod === 'promo' ? promoCode : undefined
    };

    const success = await unlockPremiumStore(payload);
    setIsSubmitting(false);

    if (!success) {
      showNotification(useSellerStore.getState().error || 'Payment failed', 'error');
      return;
    }

    setStep('creating');
    setProgress(10);
    setProgressText('Setting up your store...');

    try {
      setProgress(40);
      setProgressText('Configuring features...');
      
      const response = await axios.post('/api/v1/seller-studio/generate-store', {
        plan: selectedPlan.name,
        theme: portfolio.theme
      }, { withCredentials: true });

      setProgress(70);
      setProgressText('Customizing your store...');
      
      if (response.data.success) {
        setPortfolio(prev => ({ ...prev, sellerTier: selectedPlan.name }));
        
        const formData = new FormData();
        formData.append('portfolioLayout', portfolio.theme || 'Aura Modern');
        formData.append('portfolioSlug', portfolio.slug || '');
        if (portfolio.bannerFile) formData.append('banner', portfolio.bannerFile);
        if (portfolio.logoFile) formData.append('logo', portfolio.logoFile);
        formData.append('portfolioConfig', JSON.stringify({ ...storeConfig, ...brandConfig }));
        
        setProgress(90);
        setProgressText('Almost done...');
        
        await updateStoreConfig(formData);
        
        setProgress(100);
        setStep('success');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setStep('payment');
      showNotification('Error generating store', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[600px] flex flex-col relative overflow-hidden">
        
        {/* STEPPER TABS (Hidden on intro) */}
        {step !== 'intro' && !isCurrentPlan && (
          <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${['choose-plan'].includes(step) ? 'text-[#00b873] font-bold' : step !== 'intro' ? 'text-[#00b873]' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['choose-plan'].includes(step) || !['intro'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>1</div>
                Plan
              </div>
              <div className={`w-8 h-px ${['customize', 'payment', 'creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${step === 'customize' ? 'text-[#00b873] font-bold' : ['payment', 'creating', 'success'].includes(step) ? 'text-[#00b873]' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['customize', 'payment', 'creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
                Customize
              </div>
              <div className={`w-8 h-px ${['payment', 'creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-[#00b873] font-bold' : ['creating', 'success'].includes(step) ? 'text-[#00b873]' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['payment', 'creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>3</div>
                Payment
              </div>
              <div className={`w-8 h-px ${['creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${['creating', 'success'].includes(step) ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['creating', 'success'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>4</div>
                Generate
              </div>
            </div>
          </div>
        )}

        {/* 1. INTRO STEP */}
        {step === 'intro' && (
          <div className="text-center flex flex-col items-center justify-center flex-1 animate-in fade-in zoom-in duration-300">
            <img src="/assets/images/studio/intro-store-main.png" alt="Upgrade Store" className="w-full max-w-[400px] mx-auto mb-6 object-contain h-[300px]" onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/400x300?text=Store+3D+Illustration'; }} />
            <h2 className="text-3xl font-extrabold text-black mb-3">Upgrade Your Store</h2>
            <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md mx-auto">Unlock premium features and grow your business to the next level with our dynamic 3D storefronts.</p>
            
            <div className="flex gap-4 justify-center mb-8 w-full max-w-md mx-auto">
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg font-bold flex-1">✓ More Features</div>
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg font-bold flex-1">✓ More Growth</div>
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg font-bold flex-1">✓ More Sales</div>
            </div>

            <button onClick={() => setStep('choose-plan')} className="w-full max-w-[300px] bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 mb-4">
              Upgrade Store
            </button>
            <button onClick={() => window.location.reload()} className="text-[var(--text-muted)] hover:text-black font-semibold transition-colors">
              Maybe Later
            </button>
          </div>
        )}

        {/* 2. CHOOSE PLAN STEP */}
        {step === 'choose-plan' && (
          <div className="animate-in slide-in-from-right duration-300">
            <div className="flex items-center mb-6">
              <button onClick={() => setStep('intro')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
              <h2 className="text-2xl font-extrabold text-black">Choose Your Store Plan</h2>
            </div>
            <p className="text-[var(--text-muted)] mb-6">Select a plan that fits your business needs.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Premium', price: 1000, desc: 'Essential tools for business', icon: 'icon-premium.png', color: '#b8860b' },
                { name: 'Pro', price: 1500, desc: 'Everything you need to grow', icon: 'icon-pro.png', color: '#1976d2' },
                { name: 'Ultra', price: 3000, desc: 'Advanced features for scaling', icon: 'icon-ultra.png', color: '#7c3aed' }
              ].map(plan => (
                <div key={plan.name} onClick={() => handleSelectPlan(plan.name, plan.price)} className="border border-[var(--border-color)] hover:border-[#00b873] rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg flex items-center group bg-white">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center mr-4 p-2 overflow-hidden">
                    <img src={`/assets/images/studio/${plan.icon}`} alt={plan.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform" onError={(e) => e.target.style.display='none'} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg" style={{ color: plan.color }}>{plan.name} Store</h3>
                    <p className="text-sm font-semibold text-gray-800">₦{plan.price.toLocaleString()} for the first month</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{plan.desc}</p>
                  </div>
                  <div className="text-gray-300 group-hover:text-[#00b873] transition-colors">❯</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CUSTOMIZE STEP */}
        {step === 'customize' && (
          <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col">
            <div className="flex items-center mb-6">
              <button onClick={() => setStep('choose-plan')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
              <h2 className="text-2xl font-extrabold text-black">Customize Your {selectedPlan?.name} Store</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 flex-1">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Store Custom Slug</label>
                  <div className="flex bg-gray-50 border border-[var(--border-color)] rounded-xl overflow-hidden focus-within:border-black transition-colors">
                    <span className="p-3 text-[var(--text-muted)] bg-gray-100 border-r border-[var(--border-color)] text-sm font-medium">globalx.com/</span>
                    <input type="text" value={portfolio.slug || ''} onChange={e => setPortfolio({...portfolio, slug: e.target.value})} className="flex-1 bg-transparent p-3 text-black outline-none w-full" placeholder="mystore" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Portfolio Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Aura Modern', img: 'theme-preview-1.png' },
                      { name: 'Pure Minimal', img: 'theme-preview-2.png' },
                      { name: 'Bold Dynamic', img: 'theme-preview-3.png' }
                    ].map(theme => (
                      <div 
                        key={theme.name}
                        onClick={() => setPortfolio({...portfolio, theme: theme.name})}
                        className={`cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${portfolio.theme === theme.name ? 'border-[#00b873] shadow-md relative' : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'}`}
                      >
                        {portfolio.theme === theme.name && (
                          <div className="absolute top-1 right-1 bg-[#00b873] text-white rounded-full p-0.5 z-10">
                            <CheckCircle size={14} />
                          </div>
                        )}
                        <img src={`/assets/images/studio/${theme.img}`} alt={theme.name} className="w-full h-20 object-cover bg-gray-50" onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/150x100?text=Theme'; }} />
                        <div className="text-center py-1.5 text-xs font-bold text-gray-800 bg-white">
                          {theme.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Primary Color</label>
                    <div className="flex items-center gap-2 bg-white border border-[var(--border-color)] rounded-xl p-2 focus-within:border-black">
                      <input type="color" value={brandConfig.primaryColor} onChange={e => setBrandConfig({...brandConfig, primaryColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                      <input type="text" value={brandConfig.primaryColor} onChange={e => setBrandConfig({...brandConfig, primaryColor: e.target.value})} className="flex-1 bg-transparent border-none text-black outline-none font-mono text-sm w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-2 bg-white border border-[var(--border-color)] rounded-xl p-2 focus-within:border-black">
                      <input type="color" value={brandConfig.secondaryColor || '#1a1a1a'} onChange={e => setBrandConfig({...brandConfig, secondaryColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                      <input type="text" value={brandConfig.secondaryColor || '#1a1a1a'} onChange={e => setBrandConfig({...brandConfig, secondaryColor: e.target.value})} className="flex-1 bg-transparent border-none text-black outline-none font-mono text-sm w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Logo Image</label>
                  <input type="file" accept="image/*" onChange={e => { if(e.target.files && e.target.files[0]) setPortfolio({...portfolio, logoFile: e.target.files[0]}); }} className="w-full bg-white border border-[var(--border-color)] rounded-xl px-4 py-3 text-black focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition-colors" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${brandConfig.primaryColor || '#00b873'} 0%, transparent 70%)` }}></div>
                <img src={`/assets/images/studio/detail-${selectedPlan?.name.toLowerCase().replace(' ', '-')}-store.png`} alt="Store Preview" className="w-48 h-48 object-contain relative z-10 mb-6 drop-shadow-2xl" onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/200x200?text=Preview'; }} />
                
                <div className="w-full bg-white rounded-xl shadow-sm p-4 relative z-10 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-inner" style={{ backgroundColor: brandConfig.primaryColor || '#00b873' }}>
                      {storeConfig?.storeName?.[0] || 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{storeConfig?.storeName || 'My Store'}</div>
                      <div className="text-xs text-gray-500">globalx.com/{portfolio.slug || 'mystore'}</div>
                    </div>
                  </div>
                  <div className="w-full h-24 rounded-lg bg-gray-100 border border-gray-200" style={{ backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.02) 75%, transparent 75%, transparent)', backgroundSize: '20px 20px' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
              {isCurrentPlan ? (
                <button 
                  onClick={async () => {
                    setIsSubmitting(true);
                    const formData = new FormData();
                    formData.append('portfolioLayout', portfolio.theme || 'Aura Modern');
                    formData.append('portfolioSlug', portfolio.slug || '');
                    if (portfolio.bannerFile) formData.append('banner', portfolio.bannerFile);
                    if (portfolio.logoFile) formData.append('logo', portfolio.logoFile);
                    formData.append('portfolioConfig', JSON.stringify({ ...storeConfig, ...brandConfig }));
                    await updateStoreConfig(formData);
                    setIsSubmitting(false);
                    showNotification('Store settings saved successfully!', 'success');
                  }} 
                  disabled={isSubmitting}
                  className="bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Save Design & Settings
                </button>
              ) : (
                <button onClick={() => setStep('payment')} className="bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md">
                  Continue to Payment
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. PAYMENT STEP */}
        {step === 'payment' && (
          <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col max-w-lg mx-auto w-full">
            <div className="flex items-center mb-8">
              <button onClick={() => setStep('customize')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
              <h2 className="text-2xl font-extrabold text-black">Complete Purchase</h2>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 font-medium">Plan</span>
                <span className="font-bold text-black">{selectedPlan?.name} Store</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Billing Cycle</span>
                <span className="font-bold text-black">Monthly</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-black">Total</span>
                <span className="font-black text-[#00b873]">
                  {paymentMethod === 'promo' && promoStatus === 'success' ? '₦0 (100% Off)' : `₦${selectedPlan?.price.toLocaleString()}`}
                </span>
              </div>
            </div>

            <div className="flex bg-white border border-gray-200 rounded-xl p-1 relative mb-6">
              <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-100 rounded-lg transition-transform duration-300 ease-out ${paymentMethod === 'promo' ? 'translate-x-full' : 'translate-x-0'}`}></div>
              <button onClick={() => setPaymentMethod('wallet')} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'wallet' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}`}>
                <Wallet size={16} /> Pay via Wallet
              </button>
              <button onClick={() => setPaymentMethod('promo')} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'promo' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}`}>
                <Tag size={16} /> Promo Code
              </button>
            </div>

            <div className="min-h-[120px] mb-8 relative">
              {paymentMethod === 'wallet' ? (
                <div className="p-4 border border-[var(--border-color)] rounded-xl bg-white text-center animate-in fade-in duration-300">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="text-black font-bold">₦{selectedPlan?.price.toLocaleString()}</span> will be securely deducted from your wallet.
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Available Balance: ₦{user?.balance ? parseFloat(user.balance).toLocaleString() : '0.00'}</p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Voucher Code</label>
                  <div className="relative group">
                    <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${promoCode ? 'text-black' : 'text-gray-400'}`} size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. GLOBALX-VIP"
                      className={`w-full bg-white border rounded-xl py-4 pl-12 pr-12 text-black font-mono uppercase focus:outline-none transition-all shadow-sm ${
                        promoStatus === 'success' ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100' :
                        promoStatus === 'error' ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' :
                        'border-gray-200 focus:border-gray-400 hover:border-gray-300'
                      }`}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isVerifying ? (
                        <Loader2 size={20} className="text-gray-400 animate-spin" />
                      ) : promoStatus === 'success' ? (
                        <CheckCircle size={20} className="text-green-500 animate-in zoom-in" />
                      ) : promoStatus === 'error' ? (
                        <X size={20} className="text-red-500 animate-in zoom-in" />
                      ) : null}
                    </div>
                  </div>
                  {promoStatus === 'success' && <p className="text-xs text-green-600 flex items-center gap-1.5 ml-1 font-medium"><CheckCircle size={14}/> Code verified! 100% discount applied.</p>}
                  {promoStatus === 'error' && <p className="text-xs text-red-500 flex items-center gap-1.5 ml-1 font-medium"><X size={14}/> Invalid or expired promo code.</p>}
                </div>
              )}
            </div>

            <button onClick={startCreation} disabled={isSubmitting || (paymentMethod === 'promo' && promoStatus !== 'success')} className={`w-full text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg ${isSubmitting || (paymentMethod === 'promo' && promoStatus !== 'success') ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}>
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (paymentMethod === 'promo' && promoStatus === 'success' ? 'Unlock Store for Free' : `Pay ₦${selectedPlan?.price.toLocaleString()} Securely`)}
            </button>
          </div>
        )}

        {/* 6. CREATING STEP */}
        {step === 'creating' && (
          <div className="animate-in zoom-in duration-300 flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="relative w-48 h-48 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#00b873" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * progress) / 100} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <img src="/assets/images/studio/payment-rocket.png" alt="Building" className="w-16 h-16 object-contain animate-bounce" onError={(e) => { e.target.onerror = null; e.target.style.display='none'; }} />
                <span className="text-2xl font-black text-[#00b873] mt-2">{progress}%</span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-black mb-2">Generating Your Studio</h2>
            <p className="text-[var(--text-muted)] animate-pulse font-medium text-lg">{progressText}</p>
          </div>
        )}

        {/* 7. SUCCESS STEP */}
        {step === 'success' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 flex-1 flex flex-col items-center justify-center text-center">
            <img src="/assets/images/studio/success-celebration.png" alt="Success" className="w-full max-w-[280px] mx-auto mb-4 object-contain h-[200px]" onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/350x250?text=Success'; }} />
            
            <h2 className="text-3xl font-extrabold text-black mb-3">Store Generated Successfully!</h2>
            <p className="text-[var(--text-muted)] text-base mb-6 max-w-md mx-auto">Welcome to the {selectedPlan?.name} tier! Your dynamic 3D storefront has been created and you're all set to grow.</p>
            
            <div className="w-full max-w-sm mx-auto space-y-3 mb-8 bg-gray-50 border border-gray-100 p-4 rounded-2xl text-left">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-[#00b873] flex items-center justify-center flex-shrink-0"><CheckCircle size={16} /></div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Theme Applied</div>
                  <div className="text-xs text-gray-500">{portfolio.theme || 'Aura Modern'} active</div>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-[#00b873] flex items-center justify-center flex-shrink-0"><CheckCircle size={16} /></div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Domain Connected</div>
                  <div className="text-xs text-gray-500">globalx.com/{portfolio.slug || 'mystore'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-[#00b873] flex items-center justify-center flex-shrink-0"><CheckCircle size={16} /></div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Features Unlocked</div>
                  <div className="text-xs text-gray-500">{selectedPlan?.name} capabilities ready</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mx-auto">
              <button onClick={() => window.location.reload()} className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
                Go to Dashboard
              </button>
              <a href={`/store/${portfolio.slug || 'mystore'}`} target="_blank" rel="noopener noreferrer" className="flex-1 border-2 border-gray-200 text-black hover:border-black font-bold py-3 px-6 rounded-xl transition-all text-center">
                Visit Store
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StoreUpgradeStudio;
