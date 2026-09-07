import React, { useState } from 'react';
import { X, Send, AlertCircle, Search, Loader2 } from 'lucide-react';
import axios from 'axios';

const CustomRequestModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    budget: '',
    quantity: 1,
    urgency: 'medium',
    category: 'all',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.budget) {
      setMessage({ type: 'error', text: 'Product Name and Target Budget are required.' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        budget: parseFloat(formData.budget),
        quantity: parseInt(formData.quantity, 10),
      };

      const res = await axios.post('/api/v1/buyer-requests', payload);
      
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Request submitted successfully! Sellers will respond with offers soon.' });
        setTimeout(() => {
          onClose();
          setFormData({
            productName: '',
            description: '',
            budget: '',
            quantity: 1,
            urgency: 'medium',
            category: 'all',
          });
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Submission failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Server error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative modal-3d-glass rounded-xl w-full max-w-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-700 hover:text-black transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-gray-dim)] flex items-center justify-center text-[var(--accent-gray)]">
            <Search size={20} />
          </div>
          <h2 className="text-2xl font-bold">Custom Product Request</h2>
        </div>
        
        <p className="text-[var(--text-muted)] mb-6 text-sm">
          Can't find what you're looking for? Submit a sourcing request and let verified sellers send you competitive offers.
        </p>

        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-gx-success/10 border border-gx-success text-gx-success' : 'bg-gray-400 500/10 border border-gray-400 500 text-gray-700 500'}`}>
            <AlertCircle size={18} />
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Product Name *</label>
            <input 
              type="text" 
              placeholder="e.g. iPhone 15 Pro Max 256GB"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors"
              value={formData.productName}
              onChange={(e) => setFormData({...formData, productName: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Description</label>
            <textarea 
              placeholder="Specify color, condition, model numbers, or any other preferences..."
              rows="3"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Target Budget (₦) *</label>
              <input 
                type="number" 
                placeholder="e.g. 500000"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Quantity *</label>
              <input 
                type="number" 
                min="1"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Urgency</label>
              <select 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors appearance-none"
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value})}
              >
                <option value="low">Low - within a month</option>
                <option value="medium">Medium - within 2 weeks</option>
                <option value="high">High - ASAP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Category</label>
              <select 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-black outline-none transition-colors appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="all">Any Category</option>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion & Luxury</option>
                <option value="automotive">Automotive</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !formData.productName || !formData.budget}
            className="w-full mt-6 bg-[var(--accent-gray)] hover:bg-[var(--accent-gray-hover)] shadow-[0_0_10px_var(--accent-gray-dim)] hover:shadow-[0_0_20px_var(--accent-gray-dim)] text-black font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isSubmitting ? 'Submitting Request...' : 'Submit Sourcing Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomRequestModal;
