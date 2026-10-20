import React, { useState, useRef } from 'react';
import { Bot, Package, Upload, Image as ImageIcon, CheckCircle, Loader2, Palette, ArrowRight, ArrowLeft, Sparkles, X, Music2, Volume2 } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { AIWritingState } from '../../states/AIStates';
import { useSellerStore } from '../../../store/sellerStore';
import { useOperationStore } from '../../../store/operationStore';
import { WGenerationExperience } from '../../motion/WGenerationExperience';
import { WReasoningAnimation } from '../../motion/WReasoningAnimation';
import { useAuthStore } from '../../../store/authStore';
import ProductLimitModal from '../ProductLimitModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { showRewardedAd } from '../../../services/adMobService';

const AddProductStudio = ({ onSuccess }) => {
  const { user } = useAuthStore();
  const { createProduct, products } = useSellerStore();
  const fileInputRef = useRef(null);
  const operation = useOperationStore(state => state.operation);
  const operationStatus = useOperationStore(state => state.status);
  const operationSteps = useOperationStore(state => state.steps);
  const operationReset = useOperationStore(state => state.reset);
  
  const navigate = useNavigate();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const tier = user?.subscriptionTier?.toUpperCase() || 'FREE';
  const isPremium = tier === 'PRO' || tier === 'PREMIUM' || tier === 'PLUS';

  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    category: 'electronics',
    preferredLayout: 'temu',
    cardTheme: 'none',
    promotionalBadge: 'none'
  });
  const [images, setImages] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const audioFileInputRef = useRef(null);
  
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const generateWithAI = async () => {
    if(!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await axios.post('/api/v1/ai-chat/generate-product', { prompt: aiPrompt });
      if(res.data.success) {
        setFormData(prev => ({
          ...prev,
          title: res.data.product.title || prev.title,
          description: res.data.product.description || prev.description,
          price: res.data.product.price || prev.price,
        }));
        setShowAIPrompt(false);
      }
    } catch(err) {
      toast.error('AI Generation failed: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePublishClick = () => {
    const tier = user?.subscriptionTier?.toUpperCase() || 'FREE';
    if (tier === 'FREE' && products?.length >= 20) {
      setShowLimitModal(true);
      return;
    }
    startUpload();
  };

  const [design, setDesign] = useState({
    theme: 'default',
    badge: 'none'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
    const ACCEPTED_TYPES = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm'];
    const files = Array.from(e.target.files);

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`File too large: ${oversized.map(f => f.name).join(', ')}. Max 4MB per file.`);
      e.target.value = '';
      return;
    }
    const invalid = files.filter(f => !ACCEPTED_TYPES.includes(f.type));
    if (invalid.length > 0) {
      toast.error('Only JPG, PNG, WebP images and MP4/MOV/WebM videos are allowed.');
      e.target.value = '';
      return;
    }
    if (images.length + files.length > 5) {
      toast.error('You can only upload up to 5 files.');
      e.target.value = '';
      return;
    }
    setImages([...images, ...files].slice(0, 5));
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
    if (!audioTitle) setAudioTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioPreviewUrl(null);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  };

  const startUpload = async () => {
    if (tier === 'FREE' || tier === 'BASIC') {
      try {
        await showRewardedAd();
      } catch (err) {
        toast.error('You must watch an ad to list a product on the free tier.');
        return;
      }
    }

    const { start, update, complete, fail, reset } = useOperationStore.getState();

    start({
      operation: 'product_generation',
      steps: [
        { id: 'prepare', label: 'Preparing data' },
        { id: 'upload', label: 'Uploading media' },
        { id: 'design', label: 'Applying design' },
        { id: 'finalize', label: 'Finalizing product' }
      ],
      step: 'prepare',
      message: 'Preparing product data...',
    });

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const checkCancelled = () => {
      if (useOperationStore.getState().status === 'error') throw new Error('CANCELLED');
    };

    try {
      await wait(800); checkCancelled();
      update({ step: 'upload', progress: 30, message: 'Uploading media files...' });
      
      await wait(800); checkCancelled();
      update({ step: 'design', progress: 60, message: 'Applying custom design & theme...' });
      
      await wait(800); checkCancelled();
      update({ step: 'finalize', progress: 90, message: 'Finalizing product...' });

      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('price', Number(formData.price) || 0);
      data.append('stock', Number(formData.stock) || 0);
      data.append('category', formData.category);
      if (formData.preferredLayout) data.append('preferredLayout', formData.preferredLayout);
      if (formData.cardTheme && formData.cardTheme !== 'none') data.append('cardTheme', formData.cardTheme);
      if (formData.promotionalBadge && formData.promotionalBadge !== 'none') data.append('promotionalBadge', formData.promotionalBadge);
      data.append('design', JSON.stringify(design));
      images.forEach(img => data.append('images', img));

      const success = await createProduct(data);
      checkCancelled();

      if (success) {
        // Upload audio as a separate request after product creation
        if (audioFile || audioTitle) {
          const createdProduct = useSellerStore.getState().products?.at(-1) || useSellerStore.getState().lastCreatedProduct;
          if (createdProduct?.id && audioFile) {
            try {
              const audioForm = new FormData();
              audioForm.append('audio', audioFile);
              if (audioTitle) audioForm.append('audioTitle', audioTitle);
              await axios.post(`/api/v1/products/${createdProduct.id}/audio`, audioForm);
            } catch (audioErr) {
              console.warn('[AUDIO UPLOAD] Failed to attach audio:', audioErr.message);
            }
          }
        }
        complete('Product published successfully!');
      } else {
        fail(useSellerStore.getState().error || 'Failed to create product');
      }
    } catch (err) {
       if (err.message !== 'CANCELLED') fail(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
      
      {/* STEPPER HEADER */}
      {step !== 'uploading' && step !== 'success' && (
        <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-[#00b873]'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-[#00b873]">1</div>
              Details
            </div>
            <div className={`w-8 h-px ${['media', 'design'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${step === 'media' ? 'text-[#00b873] font-bold' : ['design'].includes(step) ? 'text-[#00b873]' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['media', 'design'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Media
            </div>
            <div className={`w-8 h-px ${['design'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${step === 'design' ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step === 'design' ? 'bg-[#00b873]' : 'bg-gray-200'}`}>3</div>
              Design
            </div>
          </div>
        </div>
      )}

      {/* 1. DETAILS STEP */}
      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="text-center mb-6 relative">
            <h2 className="text-2xl font-extrabold text-black">Product Details</h2>
            <p className="text-[var(--text-muted)]">Tell us about what you are selling.</p>
            <button 
              onClick={() => setShowAIPrompt(!showAIPrompt)}
              className="absolute right-0 top-0 mt-2 bg-[var(--bg-secondary)] text-[var(--accent-gray)] border border-[var(--accent-gray)] hover:bg-[var(--accent-gray)] hover:text-black px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Sparkles size={14} /> Autofill with AI
            </button>
          </div>

          {showAIPrompt && (
            <div className="mb-6 p-4 premium-glass border border-[var(--accent-gray)] rounded-xl relative overflow-hidden">
              {isGeneratingAI ? (
                <WReasoningAnimation message="Analyzing market data to generate product details..." />
              ) : (
                <>
                  <h4 className="font-bold text-black flex items-center gap-2 mb-2"><Bot size={16} className="text-[var(--accent-gray)]"/> Describe your product</h4>
                  <p className="text-xs text-[var(--text-muted)] mb-3">Give the AI a short prompt (e.g. "Gaming Laptop RTX 4080") and it will generate an optimized title, detailed description, and competitive price for you!</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={aiPrompt} 
                      onChange={e => setAiPrompt(e.target.value)} 
                      placeholder="Enter product concept..." 
                      className="flex-1 bg-[var(--bg-primary)] border border-gray-300 rounded p-2 text-sm focus:border-[var(--accent-gray)] outline-none"
                      onKeyDown={e => e.key === 'Enter' && generateWithAI()}
                    />
                    <button onClick={generateWithAI} className="bg-[var(--accent-gray)] text-black font-bold px-4 rounded text-sm hover:scale-105 transition-transform">
                      Generate
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Product Title</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none" placeholder="e.g. Wireless Noise-Cancelling Headphones" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Price (₦)</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Stock</label>
                <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none" placeholder="10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Preferred Card Layout</label>
              <select value={formData.preferredLayout} onChange={e => setFormData({...formData, preferredLayout: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none">
                <option value="temu">Standard (Temu Style)</option>
                <option value="amazon">List View (Amazon Style)</option>
                <option value="luxury">Premium Boutique (Luxury)</option>
                <option value="signature">W-Commerce Signature</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Color Theme</label>
                <select value={formData.cardTheme} onChange={e => setFormData({...formData, cardTheme: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none">
                  <option value="none">Default</option>
                  <option value="dark">Dark Elegance</option>
                  <option value="gold">Gold & White</option>
                  <option value="pastel">Soft Pastel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Promotional Badge</label>
                <select value={formData.promotionalBadge} onChange={e => setFormData({...formData, promotionalBadge: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none">
                  <option value="none">None</option>
                  <option value="bestseller">🏆 Bestseller</option>
                  <option value="limited">⏳ Limited Edition</option>
                  <option value="new">✨ New Arrival</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none min-h-[120px]" placeholder="Describe your product..."></textarea>
            </div>
          </div>
          <button onClick={() => setStep('media')} disabled={!formData.title || !formData.price} className="w-full bg-[#00b873] text-white font-bold py-3 rounded-xl hover:bg-[#009960] transition-colors mt-6 flex justify-center items-center gap-2 disabled:opacity-50">
            Next: Add Media <ArrowRight size={18}/>
          </button>
        </div>
      )}

      {/* 2. MEDIA STEP */}
      {step === 'media' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Upload Media</h2>
              <p className="text-[var(--text-muted)]">Add up to 5 images or videos for your product.</p>
            </div>
          </div>
          
          <div className="flex-1">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-[#00b873] rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 group"
            >
              <Upload size={48} className="text-gray-400 group-hover:text-[#00b873] mb-4 transition-colors" />
              <span className="text-gray-800 font-bold text-lg mb-1">Click to upload images or videos</span>
              <span className="text-[var(--text-muted)] text-sm">JPG, PNG, WebP, MP4, MOV, WebM · Max 4MB each</span>
              <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-4 mt-6">
                {images.map((img, index) => {
                  const isVideo = img.type?.startsWith('video/');
                  return (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                      {isVideo ? (
                        <video src={URL.createObjectURL(img)} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={URL.createObjectURL(img)} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      {isVideo && (
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-black/60 text-white py-0.5">VIDEO</span>
                      )}
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audio Upload Section */}
          <div className="mt-6 border border-dashed border-gray-300 hover:border-[#00b873] rounded-2xl p-6 bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#00b873]/10 flex items-center justify-center">
                <Music2 size={18} className="text-[#00b873]" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Background Audio <span className="text-gray-400 font-normal">(Optional)</span></p>
                <p className="text-xs text-gray-500">Plays in the feed when buyers scroll to your product</p>
              </div>
            </div>

            {!isPremium ? (
              <div className="border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 opacity-75">
                <Music2 size={24} className="text-gray-400 mb-2" />
                <span className="text-gray-600 font-bold text-sm">Background Audio is a Premium Feature</span>
                <span className="text-gray-500 text-xs mt-1">Upgrade your store to add voice-overs or music</span>
              </div>
            ) : audioFile ? (
              <div className="space-y-3">
                {/* Audio player preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00b873]/10 flex items-center justify-center flex-shrink-0">
                    <Volume2 size={18} className="text-[#00b873]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{audioFile.name}</p>
                    <p className="text-xs text-gray-400">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={removeAudio} className="p-1.5 hover:bg-red-50 rounded-full text-red-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
                <audio controls src={audioPreviewUrl} className="w-full h-10 rounded-lg" />
                {/* Audio title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Track Title (shown in feed)</label>
                  <input
                    type="text"
                    value={audioTitle}
                    onChange={e => setAudioTitle(e.target.value)}
                    placeholder="e.g. Afrobeats Summer Vibe"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:border-[#00b873] outline-none"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-5 text-gray-400 hover:text-[#00b873] transition-colors"
              >
                <Upload size={28} />
                <span className="text-sm font-medium">Click to pick audio file</span>
                <span className="text-xs">MP3, WAV, M4A, OGG, AAC (Max 10MB)</span>
              </button>
            )}
            {isPremium && (
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac"
                className="hidden"
                ref={audioFileInputRef}
                onChange={handleAudioChange}
              />
            )}
          </div>

          <button onClick={() => setStep('design')} className="w-full bg-[#00b873] text-white font-bold py-3 rounded-xl hover:bg-[#009960] transition-colors mt-6 flex justify-center items-center gap-2">
            Next: Customize Design <ArrowRight size={18}/>
          </button>
        </div>
      )}

      {/* 3. DESIGN STEP */}
      {step === 'design' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('media')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Theme & Design</h2>
              <p className="text-[var(--text-muted)]">Make your product stand out.</p>
            </div>
          </div>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">Product Card Theme</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'default', name: 'Minimalist', color: 'bg-white' },
                  { id: 'premium', name: 'Premium Dark', color: 'bg-gray-900' },
                  { id: 'vibrant', name: 'Vibrant Pop', color: 'bg-blue-50' }
                ].map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setDesign({...design, theme: t.id})}
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${design.theme === t.id ? 'border-[#00b873] bg-[#00b873]/10 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`w-full h-12 rounded-lg mb-2 border border-gray-200 ${t.color}`}></div>
                    <span className={`text-sm font-bold ${design.theme === t.id ? 'text-[#00b873]' : 'text-gray-600'}`}>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">Promotional Badge</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'new', label: 'New Arrival' },
                  { id: 'hot', label: 'Hot Selling' },
                  { id: 'sale', label: 'On Sale' }
                ].map(b => (
                  <div 
                    key={b.id}
                    onClick={() => setDesign({...design, badge: b.id})}
                    className={`cursor-pointer py-2 px-3 rounded-lg text-center text-sm font-bold transition-colors ${design.badge === b.id ? 'bg-[#00b873] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handlePublishClick} disabled={isSubmitting} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Generate & Publish Product <Sparkles size={20}/>
          </button>
        </div>
      )}

      {/* UPLOADING/SUCCESS STEP via Motion OS */}
      {operation === 'product_generation' && operationStatus !== 'idle' && (
        <WGenerationExperience
          steps={operationSteps}
          onFinish={() => {
            const currentStatus = operationStatus;
            operationReset();
            if (currentStatus === 'success') {
              if (onSuccess) onSuccess();
              setStep('details');
              setFormData({title: '', description: '', price: '', stock: '', category: 'electronics'});
              setImages([]);
            }
          }}
          onCancel={() => {
            useOperationStore.getState().reset();
            setStep('details');
          }}
        />
      )}

      {/* Product Limit Modal */}
      <ProductLimitModal 
        isOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => navigate('/seller/subscription')}
      />
    </div>
  );
};

export default AddProductStudio;
