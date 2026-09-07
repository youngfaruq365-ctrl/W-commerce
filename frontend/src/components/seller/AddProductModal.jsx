import React, { useState, useRef } from 'react';
import { X, Upload, DollarSign, Package, Image as ImageIcon, Bold, Italic, List, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';
import { useAuthStore } from '../../store/authStore';

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
  const [images, setImages] = useState([]);
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      window.__gxAlert?.('You can only upload up to 5 images.') ?? console.warn('You can only upload up to 5 images.');
      return;
    }
    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
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

    const success = await createProduct(data);
    if (success) {
      onClose();
      setFormData({ title: '', description: '', price: '', discountPercentage: '', shippingFee: '', stock: '', category: '' });
      setImages([]);
      setOptions([]);
    } else {
      setSubmitError(useSellerStore.getState().error || 'Failed to create product');
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Images (Max 5)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white"
              >
                <Upload size={32} className="text-gray-600 mb-2" />
                <span className="text-gray-700 font-bold">Click to upload images</span>
                <span className="text-gray-600 text-xs mt-1">JPG, PNG, WEBP (Max 5MB each)</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              {images.length > 0 && (
                <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                  {images.map((file, i) => (
                    <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-700 group">
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }} className="text-black hover:text-gray-700 400">
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <DollarSign className="absolute left-3 top-3.5 text-gray-500" size={16} />
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
                  <DollarSign className="absolute left-3 top-3.5 text-gray-500" size={16} />
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
                      className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
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
                      className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                    />
                    <button 
                      type="button" 
                      onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      className="p-3 bg-gray-400 500/10 text-gray-700 500 hover:bg-gray-400 500/20 rounded-xl transition-colors"
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


