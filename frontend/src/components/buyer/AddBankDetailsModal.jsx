import React, { useState } from 'react';
import { X, Building, Loader2, CheckCircle } from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';

const AddBankDetailsModal = ({ isOpen, onClose }) => {
  const { updateProfile, error: storeError } = useBuyerStore();
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await updateProfile(formData);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setFormData({ bankName: '', accountNumber: '', accountName: '' });
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-3d-glass rounded-2xl w-full max-w-lg overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-black">
            <Building className="text-[var(--accent-gray)]" /> Setup Refund Account
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="text-emerald-500 w-24 h-24 animate-[bounce_1s_ease-in-out]" />
            <h3 className="text-2xl font-bold text-black text-center">Account Saved!</h3>
            <p className="text-[var(--text-muted)] text-center">Your refund bank details have been added securely.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
            {(error || storeError) && (
              <div className="bg-gray-500/10 border border-gray-500/50 text-gray-700 p-4 rounded-xl text-sm">
                {error || storeError}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. Chase Bank, Access Bank"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Account Name</label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="1234567890"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-gray)] text-black font-bold py-3 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : 'Save Bank Details'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddBankDetailsModal;

