import React, { useState, useEffect } from 'react';
import { X, Landmark, Bitcoin, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { useSellerStore } from '../../../store/sellerStore';
import PinVerificationModal from '../../shared/PinVerificationModal';

const WithdrawModal = ({ isOpen, onClose }) => {
  const { withdrawFunds, isLoading, error } = useSellerStore();
  const [amount, setAmount] = useState('');
  const [destinationType, setDestinationType] = useState('BANK');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: ''
  });
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitError('');
      useSellerStore.getState().clearError?.();
    }
  }, [isOpen]);

  const handleClose = () => {
    setSubmitError('');
    useSellerStore.getState().clearError?.();
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    useSellerStore.getState().clearError?.();
    
    if (!amount || Number(amount) <= 0) {
      setSubmitError('Please enter a valid amount');
      return;
    }
    
    setIsPinModalOpen(true);
  };

  const executeWithdrawal = async (pin) => {
    setIsPinModalOpen(false);
    
    const destination = destinationType === 'BANK' ? {
      type: 'BANK',
      ...bankDetails
    } : {
      type: 'CRYPTO',
      address: cryptoAddress
    };

    const success = await withdrawFunds(Number(amount), destination, pin);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setAmount('');
        onClose();
      }, 2000);
    } else {
      const errorMsg = useSellerStore.getState().error;
      if (errorMsg === 'PIN_NOT_SET') {
        setSubmitError('Please set your withdrawal PIN first. Click Withdraw Funds again to set it.');
        setIsPinModalOpen(true);
      } else {
        setSubmitError(errorMsg || 'Withdrawal request failed');
      }
    }
  };


  return (
    <>
      <PinVerificationModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={executeWithdrawal} 
        store={useSellerStore} 
      />
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="modal-3d-glass rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(255,0,50,0.15)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--accent-gray)] sticky top-0 bg-[#0a0a0a] z-10">
          <h2 className="text-2xl font-bold text-black flex items-center gap-2">
            <Wallet className="text-[var(--accent-gray)]" />
            Withdraw Funds
          </h2>
          <button onClick={handleClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Request Submitted!</h3>
              <p className="text-gray-700 text-sm">Your withdrawal request is being processed. You will be notified once it is completed.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(submitError || error) && (
                <div className="bg-[#d3d3d3]/10 border border-[#d3d3d3]/30 text-[#d3d3d3] p-4 rounded-xl text-sm font-bold flex items-start gap-3 shadow-[0_0_20px_rgba(255,0,60,0.1)]">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <span>{submitError || error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Amount to Withdraw (₦)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 font-bold">₦</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Withdraw To</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setDestinationType('BANK')}
                    className={`flex flex-col items-center justify-center py-4 rounded-xl border ${destinationType === 'BANK' ? 'border-[var(--accent-gray)] bg-[var(--accent-gray)]/10 text-black' : 'border-gray-200 bg-white text-gray-500'} transition-colors`}
                  >
                    <Landmark size={24} className="mb-2" />
                    <span className="text-sm font-bold">Bank Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationType('CRYPTO')}
                    className={`flex flex-col items-center justify-center py-4 rounded-xl border ${destinationType === 'CRYPTO' ? 'border-[var(--accent-gray)] bg-[var(--accent-gray)]/10 text-black' : 'border-gray-200 bg-white text-gray-500'} transition-colors`}
                  >
                    <Bitcoin size={24} className="mb-2" />
                    <span className="text-sm font-bold">Crypto Wallet</span>
                  </button>
                </div>

                {destinationType === 'BANK' ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                      type="text" 
                      required
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                      placeholder="Bank Name (e.g., Access Bank)"
                    />
                    <input 
                      type="text" 
                      required
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                      placeholder="Account Name"
                    />
                    <input 
                      type="text" 
                      required
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                      placeholder="Account Number"
                    />
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                      type="text" 
                      required
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                      placeholder="USDT (TRC20) Address"
                    />
                    <p className="text-xs text-gray-500">Ensure this is a valid TRC20 address. Withdrawals to incorrect addresses cannot be reversed.</p>
                  </div>
                )}
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
                  className="px-6 py-3 rounded-xl font-bold bg-[var(--accent-gray)] text-black hover:brightness-110 transition-colors shadow-[0_0_15px_var(--accent-gray-dim)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                  {isLoading ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

// Simple CheckCircle icon for success state
const CheckCircle = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default WithdrawModal;
