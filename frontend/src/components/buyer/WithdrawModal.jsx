import React, { useState } from 'react';
import { X, Wallet, ShieldCheck, ArrowRight, Building } from 'lucide-react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useBuyerStore } from '../../store/buyerStore';
import PinVerificationModal from '../shared/PinVerificationModal';

const WithdrawModal = ({ isOpen, onClose, balance }) => {
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { fetchWallet, fetchWalletTransactions } = useBuyerStore();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (Number(amount) > Number(balance)) {
      setError('Insufficient funds');
      return;
    }
    setError('');
    setIsPinModalOpen(true);
  };

  const executeWithdrawal = async (pin) => {
    setIsPinModalOpen(false);
    setLoading(true);

    try {
      const response = await axios.post('/api/v1/wallet/withdraw', {
        amount: Number(amount),
        destination: {
          bankCode,
          accountNumber,
          type: 'bank_account'
        },
        pin,
        idempotencyKey: uuidv4()
      }, { withCredentials: true });

      if (response.data.success) {
        setSuccess(true);
        fetchWallet();
        fetchWalletTransactions();
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setAmount('');
          setBankCode('');
          setAccountNumber('');
        }, 3000);
      } else {
        setError('Failed to initiate withdrawal. Please try again.');
      }
    } catch (err) {
      if (err.response?.data?.message === 'PIN_NOT_SET') {
        setError('Please set your withdrawal PIN first. Click Withdraw to set it.');
        setIsPinModalOpen(true);
      } else {
        setError(err.response?.data?.message || 'An error occurred during withdrawal');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PinVerificationModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={executeWithdrawal} 
        store={useBuyerStore} 
      />
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="modal-3d-glass rounded-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="text-[var(--text-muted)]" /> Withdraw Funds
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-400 500/20 border border-gray-400 500 rounded-full flex items-center justify-center mx-auto text-gray-700 500">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold text-black">Withdrawal Initiated!</h3>
            <p className="text-gray-700">Your funds will be processed and sent to your bank account shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="p-6 space-y-5">
            {error && (
              <div className="bg-gray-400 500/10 border border-gray-400 500/50 text-gray-700 500 p-4 rounded-xl flex items-start gap-3 text-sm">
                <ShieldCheck className="flex-shrink-0 mt-0.5" size={16} />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Amount to Withdraw (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold">₦</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  placeholder="0.00"
                  min="1"
                  max={balance}
                  step="0.01"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">Available: ₦{parseFloat(balance || 0).toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Bank Code / Swift</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700">
                  <Building size={16} />
                </span>
                <input
                  type="text"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="e.g. 044"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-gray-500 transition-colors"
                placeholder="1234567890"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Processing...' : (
                <>Withdraw <ArrowRight size={18} /></>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4 flex justify-center items-center gap-1">
              <ShieldCheck size={12} /> Transfers usually take 1-3 business days
            </p>
          </form>
        )}
      </div>
      </div>
    </>
  );
};

export default WithdrawModal;

