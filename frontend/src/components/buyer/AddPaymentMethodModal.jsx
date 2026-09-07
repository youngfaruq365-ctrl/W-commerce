import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';

const AddPaymentMethodModal = ({ isOpen, onClose }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/v1/payment/v2/vault-card', {
        cardNumber,
        expiry,
        cvv
      });

      if (response.data.success) {
        setLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setCardNumber('');
          setExpiry('');
          setCvv('');
          onClose();
        }, 1500);
      } else {
        setLoading(false);
        window.__gxAlert?.(response.data.message || 'Failed to vault card');
      }
    } catch (error) {
      setLoading(false);
      window.__gxAlert?.(error.response?.data?.message || 'An error occurred');
    }
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
    if (formattedValue.length <= 19) setCardNumber(formattedValue);
  };

  const handleExpiryChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length >= 3) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2, 4)}`);
    } else {
      setExpiry(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-3d-glass rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-black">
            <CreditCard className="text-[var(--accent-gray)]" /> Add New Card
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="text-emerald-500 w-24 h-24 animate-[bounce_1s_ease-in-out]" />
            <h3 className="text-2xl font-bold text-black text-center">Card Added!</h3>
            <p className="text-[var(--text-muted)] text-center">Your card has been securely vaulted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CVV</label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) setCvv(val);
                  }}
                  placeholder="123"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-gray)] text-black font-bold py-3 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
              ) : 'Save Payment Method'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4 flex justify-center items-center gap-1">
              <ShieldCheck size={12} /> Securely encrypted and vaulted by Stripe
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddPaymentMethodModal;

