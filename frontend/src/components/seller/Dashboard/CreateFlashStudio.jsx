import React, { useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Upload, Package, AlertCircle } from 'lucide-react';
import { useSellerStore } from '../../../store/sellerStore';

const CreateFlashStudio = ({ onSuccess }) => {
  const { products, createFlashDeal } = useSellerStore();
  
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    promoTitle: '',
    promoType: 'FLASH_DEAL',
    productId: '',
    discount: '',
    durationHours: '24',
    bannerImage: null,
    bannerPreview: null
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setFormData({ 
        ...formData, 
        bannerImage: file, 
        bannerPreview: URL.createObjectURL(file) 
      });
      setError('');
    }
  };

  const startProcess = async () => {
    if (!formData.productId || !formData.discount) {
      setError('Please select a product and set a discount percentage.');
      return;
    }

    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Uploading banner...');

    try {
      let bannerUrl = undefined;

      if (formData.bannerImage) {
        const imgData = new FormData();
        imgData.append('image', formData.bannerImage);
        
        const uploadRes = await axios.post('/api/v1/upload', imgData);
        
        if (uploadRes.data.success) {
          bannerUrl = uploadRes.data.imageUrl;
        } else {
          throw new Error('Image upload failed');
        }
      }

      setProgress(50);
      setProgressText('Creating promotion...');

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (Number(formData.durationHours) * 60 * 60 * 1000));

      const dealData = {
        productId: formData.productId,
        discount: Number(formData.discount),
        promoTitle: formData.promoTitle,
        promoType: formData.promoType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bannerImage: bannerUrl,
        isFeatured: true
      };

      const success = await createFlashDeal(dealData);
      
      if (!success) {
        throw new Error(useSellerStore.getState().error || 'Failed to create flash deal');
      }

      setProgress(100);
      setStep('success');
      setIsSubmitting(false);

    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      setStep('schedule');
      setError(e.response?.data?.message || e.message || 'Failed to create promotion.');
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="flex flex-col relative w-full h-[600px] overflow-hidden text-black font-sans bg-[#fafafa] rounded-2xl">
      
      {/* HEADER / STEPPER */}
      {step !== 'processing' && step !== 'success' && (
        <div className="px-8 pt-8 pb-4 relative z-10 border-b-[3px] border-[#ababab]">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2.5 transition-colors duration-300 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-gray-400 font-bold'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 'details' ? 'bg-[#00b873] text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
              Select
            </div>
            <div className="w-12 h-[3px] bg-gray-200 relative">
              <motion.div 
                className="absolute left-0 top-0 bottom-0 bg-[#00b873]"
                initial={{ width: '0%' }}
                animate={{ width: step === 'schedule' ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <div className={`flex items-center gap-2.5 transition-colors duration-300 ${step === 'schedule' ? 'text-[#00b873] font-bold' : 'text-gray-400 font-bold'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 'schedule' ? 'bg-[#00b873] text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              Schedule
            </div>
          </div>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 nice-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: DETAILS */}
          {step === 'details' && (
            <motion.div 
              key="details"
              variants={slideVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="px-8 py-6 max-w-2xl mx-auto w-full"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-black mb-2">Create Promotion</h2>
                <p className="text-gray-500 italic font-bold text-sm">Offer massive discounts and attract more buyers to your store.</p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 border-[3px] border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Promotion Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Summer Mega Sale"
                    value={formData.promoTitle}
                    onChange={e => setFormData({...formData, promoTitle: e.target.value})}
                    className="w-full bg-[#ffffff] border-[3px] border-[#ababab] rounded-xl px-4 py-3.5 text-black placeholder-gray-400 focus:outline-none focus:border-[#00b873] transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Promotion Type</label>
                    <select 
                      value={formData.promoType}
                      onChange={e => setFormData({...formData, promoType: e.target.value})}
                      className="w-full bg-[#ffffff] border-[3px] border-[#ababab] rounded-xl px-4 py-3.5 text-black focus:outline-none focus:border-[#00b873] transition-all font-bold"
                    >
                      <option value="FLASH_DEAL">Flash Deal (Urgent)</option>
                      <option value="FESTIVAL_PROMO">Festival Promo (Seasonal)</option>
                      <option value="WEEKEND_PROMO">Weekend Promo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Discount (%)</label>
                    <input 
                      type="number" 
                      min="1" max="99"
                      placeholder="e.g. 25"
                      value={formData.discount}
                      onChange={e => setFormData({...formData, discount: e.target.value})}
                      className="w-full bg-[#ffffff] border-[3px] border-[#ababab] rounded-xl px-4 py-3.5 text-black placeholder-gray-400 focus:outline-none focus:border-[#00b873] transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Select Product</label>
                  <select 
                    value={formData.productId}
                    onChange={e => setFormData({...formData, productId: e.target.value})}
                    className="w-full bg-[#ffffff] border-[3px] border-[#ababab] rounded-xl px-4 py-3.5 text-black focus:outline-none focus:border-[#00b873] transition-all font-bold"
                  >
                    <option value="">-- Choose a Product --</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id}>{p.title} (Current: ₦{p.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                onClick={() => setStep('schedule')} 
                className="w-full mt-8 bg-[#00b873] text-white font-bold py-4 rounded-xl hover:bg-[#009960] transition-all flex justify-center items-center gap-2 group"
              >
                Next: Schedule & Banner <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: SCHEDULE */}
          {step === 'schedule' && (
            <motion.div 
              key="schedule"
              variants={slideVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="px-8 py-6 max-w-2xl mx-auto w-full"
            >
              <div className="flex items-center mb-8">
                <button onClick={() => setStep('details')} className="mr-4 p-2.5 bg-[#ffffff] border-[3px] border-[#ababab] hover:border-[#00b873] rounded-xl transition-colors text-black">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-black">Schedule & Banner</h2>
                  <p className="text-gray-500 italic font-bold text-sm">Almost there, finalize your campaign.</p>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 border-[3px] border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Campaign Duration</label>
                  <select 
                    value={formData.durationHours}
                    onChange={e => setFormData({...formData, durationHours: e.target.value})}
                    className="w-full bg-[#ffffff] border-[3px] border-[#ababab] rounded-xl px-4 py-3.5 text-black focus:outline-none focus:border-[#00b873] transition-all font-bold"
                  >
                    <option value="2">2 Hours (Super Flash)</option>
                    <option value="6">6 Hours</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (Recommended)</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours (3 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 italic font-bold uppercase tracking-wider mb-2 ml-1">Promotional Banner <span className="lowercase font-normal">(Optional)</span></label>
                  <div className="relative group overflow-hidden bg-[#ffffff] border-[3px] border-[#ababab] hover:border-[#00b873] rounded-xl transition-colors h-44 flex flex-col items-center justify-center cursor-pointer">
                    {formData.bannerPreview ? (
                      <div className="absolute inset-0">
                        <img src={formData.bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-xl text-sm">Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="text-[#ababab] group-hover:text-[#00b873] mb-2" />
                        <span className="text-black font-bold text-sm">Click to upload banner</span>
                        <span className="text-gray-500 italic font-bold text-xs mt-1">1200x400 • JPG, PNG • Max 5MB</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={startProcess} 
                disabled={isSubmitting} 
                className="w-full mt-8 bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Launch Campaign'} <Sparkles size={18} className="text-[#00b873]"/>
              </button>
            </motion.div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center h-full pb-12"
            >
              <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-[4px] border-gray-200 rounded-full" />
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <motion.circle
                    cx="50" cy="50" r="48"
                    fill="none"
                    stroke="#00b873"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0, 300" }}
                    animate={{ strokeDasharray: `${progress * 3}, 300` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="text-3xl font-bold text-black">
                  {progress}%
                </div>
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Preparing Launch</h3>
              <p className="text-gray-500 italic font-bold text-sm">{progressText}</p>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20 }}
              className="flex flex-col items-center justify-center h-full pb-12 px-8 text-center"
            >
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, delay: 0.3 }}
                className="mb-6"
              >
                <CheckCircle size={80} className="text-[#00b873]" />
              </motion.div>
              <h2 className="text-4xl font-bold text-black mb-4">You're Live!</h2>
              <p className="text-gray-500 italic font-bold text-lg mb-10 max-w-sm">
                Your promotional campaign has been successfully launched to the marketplace.
              </p>
              <button 
                onClick={() => { if (onSuccess) onSuccess(); }} 
                className="w-full max-w-xs bg-[#00b873] hover:bg-[#009960] text-white font-bold py-4 rounded-xl transition-all"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .nice-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .nice-scrollbar::-webkit-scrollbar-track {
          background: #fafafa;
        }
        .nice-scrollbar::-webkit-scrollbar-thumb {
          background-color: #ababab;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CreateFlashStudio;
