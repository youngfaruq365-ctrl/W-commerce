import React, { useState } from 'react';
import { X, Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiClient as axios } from '../../utils/apiClient';
import { v4 as uuidv4 } from 'uuid';

const TopUpModal = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const endpoint = provider === 'paystack' ? '/api/v1/wallet/fund/paystack' 
        : provider === 'monnify' ? '/api/v1/wallet/fund/monnify' 
        : '/api/v1/wallet/fund/bank-transfer';

      const response = await axios.post(endpoint, {
        amount: Number(amount),
        idempotencyKey: uuidv4()
      });

      if (response.data.success) {
        if (provider === 'bank') {
          const { bankName, accountNumber } = response.data.bankDetails;
          window.__gxAlert?.(`Transfer logged (Ref: ${response.data.reference}). Send funds to ${bankName} (${accountNumber}).`);
          setLoading(false);
          onClose();
        } else if (response.data.authorization_url) {
          window.location.href = response.data.authorization_url;
        }
      } else {
        setError('Failed to initiate funding. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during top up');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="modal-panel neu-panel rounded-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="text-[var(--accent-gray)]" /> Top Up Wallet
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleTopUp} className="p-6 space-y-6">
          {error && (
            <div className="bg-gray-500/10 border border-gray-500/50 text-gray-700 p-4 rounded-xl flex items-start gap-3 text-sm">
              <ShieldCheck className="flex-shrink-0 mt-0.5" size={16} />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Amount (NGN)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full neu-input pl-8"
                placeholder="0.00"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setProvider('paystack')}
                className={`w-full flex flex-col items-center gap-2 p-4 transition-all ${provider === 'paystack' ? 'neu-card-pressed text-[#006cff]' : 'neu-button text-[var(--text-muted)]'}`}
              >
                <span className="font-bold">Paystack</span>
              </button>
              <button
                type="button"
                onClick={() => setProvider('monnify')}
                className={`w-full flex flex-col items-center gap-2 p-4 transition-all ${provider === 'monnify' ? 'neu-card-pressed text-[#006cff]' : 'neu-button text-[var(--text-muted)]'}`}
              >
                <span className="font-bold">Monnify</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('bank')}
                className={`w-full flex flex-col items-center gap-2 p-4 transition-all col-span-2 ${provider === 'bank' ? 'neu-card-pressed text-[#006cff]' : 'neu-button text-[var(--text-muted)]'}`}
              >
                <span className="font-bold">Bank Transfer</span>
              </button>
            </div>
          </div>

          {provider === 'bank' && (
            <div className="neu-card p-4 animate-fade-in text-sm text-[var(--text-muted)]">
              <p className="font-bold text-[var(--text-main)] mb-2">Bank Transfer Details</p>
              <p>Your unique bank transfer details will be generated once you proceed.</p>
              <p className="mt-3 text-[#006cff] text-xs">Note: Include your registered email in the transfer memo.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full neu-button-primary py-3 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (
              <>Proceed to Payment <ArrowRight size={18} /></>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4 flex justify-center items-center gap-1">
            <ShieldCheck size={12} /> Secure encrypted checkout
          </p>
        </form>
      </div>
    </div>
  );
};

export default TopUpModal;

