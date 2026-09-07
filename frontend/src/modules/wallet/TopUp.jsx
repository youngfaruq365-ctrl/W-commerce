import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Building2, Zap, Plus, CheckCircle,
  Info, Shield, Loader2, AlertTriangle
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Credit / Debit Card (Paystack)', icon: CreditCard },
  { id: 'flutterwave', label: 'Bank Transfer (Flutterwave)', icon: Building2 },
];

export default function TopUp() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount > 0 ? (selectedMethod === 'paystack' ? numAmount * 0.015 : 0) : 0;
  const total = numAmount + fee;

  const handleConfirm = async () => {
    if (!numAmount || numAmount < 1) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Initialize funding
      const initRes = await apiClient.post(`/api/v1/wallet/fund/${selectedMethod}`, {
        amount: numAmount,
        idempotencyKey: `topup-${Date.now()}`
      });

      if (!initRes.data.success) {
        throw new Error(initRes.data.message || 'Failed to initialize funding');
      }

      const { authorization_url, reference } = initRes.data;

      // 2. Mock bypass for local dev
      if (authorization_url && authorization_url.includes('mock-checkout')) {
        // Automatically verify mock funding
        const verifyRes = await apiClient.get(`/api/v1/wallet/fund/verify-${selectedMethod}/${reference}`);
        if (verifyRes.data.success) {
          setSuccess(true);
          setTimeout(() => navigate('/wallet'), 2000);
        } else {
          throw new Error('Mock verification failed');
        }
      } else if (authorization_url) {
        // Redirect to real provider
        window.location.href = authorization_url;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to process top-up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center animate-[fadeInUp_0.4s_ease_forwards]">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Top Up Successful!</h2>
          <p className="text-[var(--text-muted)]">{numAmount.toFixed(2)} GONG added to your wallet</p>
          <p className="text-sm text-[var(--text-faint)] mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-main)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 px-4 py-4 max-w-xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
            <ArrowLeft size={20} className="text-[var(--text-muted)] hover:text-white" />
          </button>
          <h1 className="text-lg font-bold">Top Up Wallet</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Amount Input */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4 shadow-[var(--shadow-md)]">
          <label className="text-sm font-semibold">Enter Amount (GONG)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--text-muted)]">G</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-4 text-2xl font-bold text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
            />
          </div>
          {/* Preset Amounts */}
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map(p => (
              <button
                key={p}
                onClick={() => setAmount(p.toString())}
                className={`py-2 rounded-xl text-sm font-semibold border transition-all ${amount === p.toString() ? 'bg-[var(--text-main)] border-[var(--text-main)] text-[var(--bg-primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]'}`}
              >
                ${p}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-3 shadow-[var(--shadow-md)]">
          <label className="text-sm font-semibold">Payment Method</label>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${selectedMethod === method.id ? 'border-[var(--text-main)] bg-[var(--text-main)]/5' : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'}`}
              >
                <method.icon size={18} className={selectedMethod === method.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'} />
                <span className={`flex-1 text-sm font-medium text-left ${selectedMethod === method.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{method.label}</span>
                <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedMethod === method.id ? 'border-[var(--text-main)]' : 'border-[var(--border-hover)]'}`}>
                  {selectedMethod === method.id && <div className="w-full h-full rounded-full bg-[var(--text-main)] scale-50 block" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fee Summary */}
        {numAmount > 0 && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-3 animate-[fadeInUp_0.2s_ease_forwards] shadow-[var(--shadow-md)]">
            <label className="text-sm font-semibold">Summary</label>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Amount</span>
                <span className="text-[var(--text-main)]">{numAmount.toFixed(2)} GONG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Processing Fee</span>
                <span className="text-green-400">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[var(--border-color)] pt-3 mt-1">
                <span className="text-[var(--text-main)]">Total Charged</span>
                <span className="text-[var(--text-main)]">{numAmount.toFixed(2)} GONG</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border-color)] p-4 z-20">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleConfirm}
            disabled={!numAmount || numAmount < 1 || loading}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-main)] text-[var(--bg-primary)] font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            {loading ? 'Processing...' : `Top Up ${numAmount > 0 ? numAmount.toFixed(2) : '0.00'} GONG`}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield size={12} className="text-[var(--text-faint)]" />
            <p className="text-xs text-[var(--text-faint)]">Secured payment via {selectedMethod === 'paystack' ? 'Paystack' : 'Flutterwave'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
