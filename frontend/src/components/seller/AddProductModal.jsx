import React, { useState, useRef } from 'react';
import { X, Upload, DollarSign, Package, Image as ImageIcon, Bold, Italic, List, Link as LinkIcon, AlertCircle, Music2, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient as axios } from '@/utils/apiClient';
import { useSellerStore } from '../../store/sellerStore';
import { useAuthStore } from '../../store/authStore';
import { showRewardedAd } from '../../services/adMobService';

const CATEGORY_OPTIONS = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'beauty', label: 'Beauty & Health' },
  { value: 'sports', label: 'Sports & Outdoors' }
];

const AddProductModal = ({ isOpen, onClose }) => {
  const { createProduct, isLoading, products } = useSellerStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discountPercentage: '',
    shippingFee: '',
    stock: '',
    category: ''
  });
  const [options, setOptions] = useState([]);
  const [submitError, setSubmitError] = useState('');
  
  if (!isOpen) return null;

  const tier = user?.subscriptionTier?.toUpperCase() || 'FREE';
  const isPremium = tier === 'PRO' || tier === 'PREMIUM' || tier === 'PLUS';

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
    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const currentTier = user?.subscriptionTier?.toUpperCase() || 'FREE';
    if ((currentTier === 'FREE' || currentTier === 'BASIC') && products.length >= 20) {
      setSubmitError('Strict Limit Exceeded: Free accounts are limited to 20 products. Please upgrade to Pro to add more.');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('price', formData.price ? Number(formData.price) : 0);
    if (formData.discountPercentage) data.append('discountPercentage', Number(formData.discountPercentage));
    if (formData.shippingFee) data.append('shippingFee', Number(formData.shippingFee));
    data.append('stock', formData.stock ? Number(formData.stock) : 0);
    data.append('category', formData.category);
    if (options.length > 0) {
      data.append('options', JSON.stringify(options.filter(opt => opt.name && opt.value)));
    }
    
    images.forEach(img => {
      data.append('images', img);
    });

    const doCreate = async () => {
      const success = await createProduct(data);
      if (success) {
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
        onClose();
        setFormData({ title: '', description: '', price: '', discountPercentage: '', shippingFee: '', stock: '', category: '' });
        setImages([]);
        setOptions([]);
        if (typeof removeAudio === 'function') removeAudio();
      } else {
        console.error("Create Product Error:", useSellerStore.getState().error);
        setSubmitError(useSellerStore.getState().error || 'Failed to create product. Please try again.');
      }
    };

    if (currentTier === 'FREE' || currentTier === 'BASIC') {
      try {
        await showRewardedAd();
        await doCreate();
      } catch (err) {
        setSubmitError('You must watch an ad to list a product on the free tier.');
      }
    } else {
      await doCreate();
    }
    // Removed duplicate logic
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="modal-3d-glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-[#0a0a0a] z-10">
          <h2 className="text-2xl font-bold text-black">Add New Product</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitError && (
            <div className="bg-[#d3d3d3]/10 border border-[#d3d3d3]/30 text-[#d3d3d3] p-4 rounded-xl text-sm font-bold flex items-start gap-3 shadow-[0_0_20px_rgba(255,0,60,0.1)]">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="space-y-4">
            
            {/* Image Upload Area */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Images & Videos (Max 5)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white"
              >
                <Upload size={32} className="text-gray-600 mb-2" />
                <span className="text-gray-700 font-bold">Click to upload images or videos</span>
                <span className="text-gray-600 text-xs mt-1">JPG, PNG, WebP, MP4, MOV, WebM · Max 4MB each · Up to 5 files</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              {images.length > 0 && (
                <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                  {images.map((file, i) => {
                    const isVideo = file.type?.startsWith('video/');
                    const objectUrl = URL.createObjectURL(file);
                    return (
                      <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700 group">
                        {isVideo ? (
                          <video src={objectUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={objectUrl} alt="preview" className="w-full h-full object-cover" />
                        )}
                        {isVideo && (
                          <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-black/60 text-white py-0.5">VIDEO</span>
                        )}
                        <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }} className="text-black hover:text-gray-400">
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audio Upload Area */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Background Audio</label>
              {!isPremium ? (
                <div className="border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 opacity-75">
                  <Music2 size={24} className="text-gray-400 mb-2" />
                  <span className="text-gray-600 font-bold text-sm">Background Audio is a Premium Feature</span>
                  <span className="text-gray-500 text-xs mt-1">Upgrade your store to add voice-overs or music</span>
                </div>
              ) : audioFile ? (
                <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Volume2 size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{audioFile.name}</p>
                      <p className="text-xs text-gray-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={removeAudio} className="p-1.5 hover:bg-red-50 rounded-full text-red-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <audio controls src={audioPreviewUrl} className="w-full h-10 rounded-lg" />
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Track Title (shown in feed)</label>
                    <input
                      type="text"
                      value={audioTitle}
                      onChange={e => setAudioTitle(e.target.value)}
                      placeholder="e.g. Afrobeats Summer Vibe"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => audioFileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 hover:border-gray-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white"
                >
                  <Music2 size={24} className="text-gray-400 mb-2" />
                  <span className="text-gray-700 font-bold text-sm">Add background audio</span>
                  <span className="text-gray-500 text-xs mt-1">MP3, WAV, M4A, OGG (Max 10MB)</span>
                </div>
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Title</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                placeholder="E.g., Wireless Mechanical Keyboard"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Premium Description</label>
              <div className="border border-gray-700 rounded-xl overflow-hidden bg-[#0f0f0f] focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-inner">
                <div className="flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border-b border-gray-200">
                  <button type="button" onClick={() => setFormData({...formData, description: formData.description + '**Bold Text**'})} className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-700 rounded transition-colors" title="Bold"><Bold size={15} /></button>
                  <button type="button" onClick={() => setFormData({...formData, description: formData.description + '_Italic Text_'})} className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-700 rounded transition-colors" title="Italic"><Italic size={15} /></button>
                  <button type="button" onClick={() => setFormData({...formData, description: formData.description + '\n- List Item'})} className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-700 rounded transition-colors" title="Bullet List"><List size={15} /></button>
                  <button type="button" onClick={() => setFormData({...formData, description: formData.description + '[Link Text](https://)'})} className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-700 rounded transition-colors" title="Insert Link"><LinkIcon size={15} /></button>
                </div>
                <textarea 
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-transparent px-4 py-4 text-black placeholder-gray-600 focus:outline-none resize-y min-h-[140px] font-sans leading-relaxed"
                  placeholder="Craft a compelling story for your product (Markdown supported)..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Price (₦)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-500 font-bold" style={{ fontSize: '16px' }}>₦</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Stock Quantity</label>
                <div className="relative">
                  <Package className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input 
                    type="number" 
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Discount Percentage (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({...formData, discountPercentage: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 font-bold">% OFF</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Shipping Fee (₦) (0 = Free)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-500 font-bold" style={{ fontSize: '16px' }}>₦</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.shippingFee}
                    onChange={(e) => setFormData({...formData, shippingFee: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Options / Specifications */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">Product Specifications (Optional)</label>
                <button 
                  type="button" 
                  onClick={() => setOptions([...options, { name: '', value: '' }])}
                  className="text-xs bg-[#d3d3d3]/20 text-[#d3d3d3] px-3 py-1.5 rounded-lg hover:bg-[#d3d3d3]/30 font-bold transition-colors"
                >
                  + Add Detail
                </button>
              </div>
              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <input 
                      type="text" 
                      placeholder="e.g. Style" 
                      value={opt.name}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].name = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 premium-glass border border-gray-200 rounded-3xl p-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    />
                    <input 
                      type="text" 
                      placeholder="e.g. Fashionable" 
                      value={opt.value}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].value = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 premium-glass border border-gray-200 rounded-3xl p-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    />
                    <button 
                      type="button" 
                      onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      className="p-3 bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <div className="text-sm text-gray-600 italic">No custom specifications added. Click '+ Add Detail' to include properties like Movement, Power Mode, etc.</div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors appearance-none"
              >
                <option value="" disabled>Select a category</option>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-gray-700 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>}
              {isLoading ? 'Publishing...' : 'Publish Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;


