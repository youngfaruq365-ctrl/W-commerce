import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';

const RespondToDisputeModal = ({ isOpen, onClose, dispute }) => {
  const { respondToDispute, isLoading } = useSellerStore();
  const [responseType, setResponseType] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !dispute) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseType) return window.__gxAlert?.('Please select a response type.') ?? console.warn('Please select a response type.');
    if (!message) return window.__gxAlert?.('Please provide a message.') ?? console.warn('Please provide a message.');

    const payload = {
      response: responseType,
      message,
    };

    const success = await respondToDispute(dispute.id, payload);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setResponseType('');
        setMessage('');
        setIsSuccess(false);
        onClose();
      }, 1500); // 1.5 second animation delay
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
      <div className="modal-3d-glass rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
          <h2 className="text-xl font-bold text-black">Respond to Dispute</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-black transition-colors">
            <X size={24} />
          </button>
        </div>
        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="text-emerald-500 w-24 h-24 animate-[bounce_1s_ease-in-out]" />
            <h3 className="text-2xl font-bold text-black text-center">Response Submitted!</h3>
            <p className="text-[var(--text-muted)] text-center">Your response has been securely logged.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Select Response</label>
              <select 
                className="w-full bg-white border border-gray-700 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-white transition-colors"
                value={responseType}
                onChange={(e) => setResponseType(e.target.value)}
                required
              >
                <option value="" disabled>Select an option...</option>
                <option value="SELLER_REFUND_APPROVED">Approve Refund</option>
                <option value="SELLER_REPLACEMENT">Offer Replacement</option>
                <option value="SELLER_REJECTED">Reject Dispute</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Message to Buyer</label>
              <textarea 
                className="w-full bg-white border border-gray-700 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-white transition-colors h-32 resize-none"
                placeholder="Explain your decision..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-black font-bold rounded-xl hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Response'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RespondToDisputeModal;

