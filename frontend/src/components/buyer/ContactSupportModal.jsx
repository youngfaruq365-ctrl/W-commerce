import React, { useState } from 'react';
import { X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { showNotification } from '../../utils/notifications';
import { apiClient as axios } from '@/utils/apiClient';

const ContactSupportModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post('/api/v1/user/support', formData);
      setIsSuccess(true);
      showNotification('Message sent to support successfully', 'success');
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ subject: '', message: '' });
        onClose();
      }, 2000);
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-3d-glass rounded-2xl w-full max-w-lg overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-black">
             Contact Support
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="text-green-500 w-24 h-24 animate-[bounce_1s_ease-in-out]" />
            <h3 className="text-2xl font-bold text-black text-center">Message Sent!</h3>
            <p className="text-[var(--text-muted)] text-center">Our support team will get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
              <select 
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors appearance-none"
                required
              >
                <option value="" disabled>Select a topic</option>
                <option value="order_issue">Order Issue</option>
                <option value="payment_issue">Payment Issue</option>
                <option value="account_issue">Account Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
              <textarea 
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your issue in detail..."
                className="w-full bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl px-4 py-3 text-black h-32 resize-none focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                required
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !formData.subject || !formData.message}
              className="w-full bg-[var(--accent-gray)] text-black font-bold py-3 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send size={18} /> Send Message</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactSupportModal;

