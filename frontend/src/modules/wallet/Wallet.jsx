import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Plus, Send, QrCode,
  CreditCard, Building2, Gift, Star, TrendingUp, ChevronRight,
  ArrowUp, ArrowDown, Shield, Zap, Copy, Eye, EyeOff
} from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WalletPage() {
  const navigate = useNavigate();
  const { balance, currency, rewards, transactions, fetchWallet, fetchRewards, fetchTransactions } = useWalletStore();
  const { user } = useAuthStore();
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    fetchWallet();
    fetchRewards();
    fetchTransactions();
  }, []);

  const walletId = 'WLT-' + (user?.id || '84921').toString().padStart(6, '0');

  const handleCopy = () => {
    navigator.clipboard.writeText(walletId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickActions = [
    { label: 'Top Up', icon: Plus, color: 'from-emerald-500 to-green-600', path: 'topup' },
    { label: 'Withdraw', icon: ArrowUp, color: 'from-orange-500 to-red-500', path: 'withdraw' },
    { label: 'Transfer', icon: Send, color: 'from-blue-500 to-indigo-600', path: 'transfer' },
    { label: 'Scan QR', icon: QrCode, color: 'from-purple-500 to-pink-600', path: 'scan' },
  ];

  const menuLinks = [
    { label: 'Transaction History', icon: TrendingUp, path: 'transactions' },
    { label: 'Saved Cards', icon: CreditCard, path: 'cards' },
    { label: 'Bank Accounts', icon: Building2, path: 'banks' },
    { label: 'Rewards & Points', icon: Star, path: 'rewards' },
    { label: 'Cashback', icon: Zap, path: 'cashback' },
    { label: 'Coupons', icon: Gift, path: 'coupons' },
    { label: 'Gift Cards', icon: Gift, path: 'giftcards' },
    { label: 'Referral Earnings', icon: TrendingUp, path: 'referral' },
    { label: 'Affiliate Earnings', icon: TrendingUp, path: 'affiliate' },
  ];

  const pointsPercent = Math.min(((rewards?.points ?? 0) / 5000) * 100, 100);
  const recentTransactions = transactions.slice(0, 5);
  const currencySymbol = currency === 'NGN' ? '₦' : (currency === 'USD' ? '₦' : currency);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 py-4">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-2">
            <Wallet className="text-[var(--accent-gray)]" size={22} />
            <h1 className="text-lg font-bold text-[var(--text-main)]">My Wallet</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded-full border border-[var(--border-color)]">
              {walletId}
            </span>
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
              <Copy size={15} className={copied ? 'text-green-400' : 'text-[var(--text-muted)]'} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Balance Card */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-6 right-16 w-20 h-20 rounded-full bg-blue-500/10" />

          <div className="relative p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-200/70 uppercase tracking-widest font-medium">Total Balance</span>
              <button onClick={() => setShowBalance(!showBalance)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                {showBalance ? <Eye size={14} className="text-blue-200" /> : <EyeOff size={14} className="text-blue-200" />}
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-sm text-blue-200/80 font-medium">{currency || 'USD'}</span>
              <span className="text-5xl font-black text-white tracking-tight">
                {showBalance ? (balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('topup')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-all shadow-lg"
              >
                <Plus size={16} />
                Add Money
              </button>
              <button
                onClick={() => navigate('transfer')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-all border border-white/20"
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)] transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <action.icon size={18} className="text-white" />
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cashback Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-500/20 to-yellow-500/10 border border-orange-500/30 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <Zap size={22} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-300">You've earned {currencySymbol}{(rewards?.cashbackThisMonth ?? 0).toFixed(2)} cashback this month!</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Shop more to unlock 5% cashback tier</p>
          </div>
          <button onClick={() => navigate('cashback')} className="flex-shrink-0 text-orange-400 hover:text-orange-300 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Reward Points */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold text-[var(--text-main)]">Reward Points</span>
            </div>
            <button onClick={() => navigate('rewards')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors">
              Redeem <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-black text-[var(--text-main)]">{(rewards?.points ?? 0).toLocaleString()}</span>
            <span className="text-sm text-[var(--text-muted)]">/ 5,000 pts</span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700"
              style={{ width: `${pointsPercent}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">{Math.max(0, 5000 - (rewards?.points ?? 0))} pts to Gold tier</p>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <span className="text-sm font-semibold text-[var(--text-main)]">Recent Transactions</span>
            <button onClick={() => navigate('transactions')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors">
              See All <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-muted)] text-sm">No recent transactions</div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} onClick={() => setSelectedTx(tx)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'CREDIT' ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                    {tx.type === 'CREDIT'
                      ? <ArrowDownLeft size={16} className="text-green-400" />
                      : <ArrowUpRight size={16} className="text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-main)] truncate">{tx.desc}</p>
                    <p className="text-xs text-[var(--text-faint)]">{tx.date}</p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Menu Links */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {menuLinks.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-tertiary)] transition-colors group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center group-hover:border-[var(--border-hover)] transition-colors">
                  <item.icon size={15} className="text-[var(--text-muted)]" />
                </div>
                <span className="flex-1 text-sm text-[var(--text-main)]">{item.label}</span>
                <ChevronRight size={15} className="text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Shield size={13} className="text-[var(--text-faint)]" />
          <span className="text-xs text-[var(--text-faint)]">Your wallet is protected by 256-bit encryption</span>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-[var(--text-main)]">Transaction Details</h3>
                <button onClick={() => setSelectedTx(null)} className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <EyeOff size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-4 mb-6 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-1">{selectedTx.type === 'CREDIT' ? 'Received' : 'Spent'}</p>
                <div className={`text-4xl font-black ${selectedTx.type === 'CREDIT' ? 'text-green-400' : 'text-[var(--text-main)]'}`}>
                  {selectedTx.type === 'CREDIT' ? '+' : '-'}{currencySymbol}{selectedTx.amount.toFixed(2)}
                </div>
                <div className={`mt-2 px-2 py-0.5 rounded text-xs font-semibold ${selectedTx.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : selectedTx.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {selectedTx.status}
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start pb-4 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Description</span>
                  <span className="text-[var(--text-main)] text-right font-medium max-w-[60%]">{selectedTx.desc}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Date & Time</span>
                  <span className="text-[var(--text-main)] font-medium">{selectedTx.date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Reference ID</span>
                  <span className="text-[var(--text-main)] font-mono text-xs uppercase bg-[var(--bg-tertiary)] px-2 py-1 rounded">{selectedTx.id.substring(0, 12)}...</span>
                </div>
              </div>
              
              <button className="w-full mt-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 flex items-center justify-center gap-2">
                <Copy size={16} />
                Download Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
