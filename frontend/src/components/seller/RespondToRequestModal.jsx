import React, { useState } from 'react';
import { X, DollarSign, Package, MessageSquare, AlertCircle } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';

const RespondToRequestModal = ({ isOpen, onClose, request }) => {
  const { respondToBuyerRequest, isLoading, error } = useSellerStore();
  const [formData, setFormData] = useState({
    price: '',
    message: ''
  });
  
  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      responseType: 'QUOTE',
      quotedPrice: parseFloat(formData.price),
      message: formData.message
    };

    const success = await respondToBuyerRequest(request.id, payload);
    if (success) {
      onClose();
      setFormData({ price: '', message: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="modal-3d-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-[#0a0a0a] z-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-black">Submit Quote</h2>
            <p className="text-sm text-gray-500 mt-1">For: {request.title}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-gray-400 500/10 border border-gray-400 500/50 text-gray-700 500 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Target Price Context</label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-gray-800 text-sm">Target price requested by buyer: <strong className="text-black text-lg"> ₦{request.targetPrice}</strong> for <strong className="text-black">{request.quantity} {request.unit}</strong>.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Your Quoted Price (₦)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 text-gray-500" size={16} />
                <input 
                  type="number" 
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder={request.targetPrice}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message to Buyer</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3.5 text-gray-500" size={16} />
                <textarea 
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Explain why your quote is the best..."
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
              {isLoading ? 'Submitting...' : 'Submit Quote'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default RespondToRequestModal;

