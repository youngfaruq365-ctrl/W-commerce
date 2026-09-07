import React, { useState, useEffect } from 'react';
import { X, DollarSign, Package, Bold, Italic, List, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';

const EditProductModal = ({ isOpen, onClose, product }) => {
  const { updateProduct, isLoading } = useSellerStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discountPercentage: '',
    shippingFee: '',
    stock: '',
    category: 'electronics'
  });
  const [submitError, setSubmitError] = useState('');
  
  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        discountPercentage: product.discountPercentage || '',
        shippingFee: product.shippingFee || '',
        stock: product.stock || '',
        category: product.category || 'electronics'
      });
    }
  }, [product]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : 0,
      shippingFee: formData.shippingFee ? parseFloat(formData.shippingFee) : 0,
      stock: parseInt(formData.stock, 10),
    };

    const success = await updateProduct(product.id, payload);
    if (success) {
      onClose();
    } else {
      setSubmitError(useSellerStore.getState().error || 'Failed to update product');
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="modal-3d-glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-[#0a0a0a] z-10">
          <h2 className="text-2xl font-bold text-black">Edit Product</h2>
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
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Title</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
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

            <div className="grid grid-cols-2 gap-4">
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
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors appearance-none"
              >
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="home">Home & Garden</option>
                <option value="beauty">Beauty & Health</option>
                <option value="sports">Sports & Outdoors</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;

