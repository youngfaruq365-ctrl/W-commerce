import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Filter, Download, ArrowDownLeft, ArrowUpRight,
  ChevronDown, Calendar, RefreshCw, TrendingUp, TrendingDown, CheckCircle,
  Clock, XCircle, ShoppingBag, Gift, RotateCcw, Wallet
} from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';

const ALL_TRANSACTIONS = [
  { id: 't1', type: 'CREDIT', amount: 500.00, desc: 'Order Refund #ORD-2341', date: '2026-07-12', category: 'refund', status: 'COMPLETED' },
  { id: 't2', type: 'DEBIT', amount: 89.99, desc: 'Purchase – Wireless Headset Pro', date: '2026-07-11', category: 'purchase', status: 'COMPLETED' },
  { id: 't3', type: 'CREDIT', amount: 25.00, desc: 'Cashback – Tech Purchase', date: '2026-07-10', category: 'cashback', status: 'COMPLETED' },
  { id: 't4', type: 'DEBIT', amount: 299.99, desc: 'Purchase – Ergonomic Gaming Chair', date: '2026-07-09', category: 'purchase', status: 'COMPLETED' },
  { id: 't5', type: 'CREDIT', amount: 50.00, desc: 'Referral Bonus – 2 friends', date: '2026-07-07', category: 'referral', status: 'COMPLETED' },
  { id: 't6', type: 'DEBIT', amount: 45.00, desc: 'Top Up Fee – Card Payment', date: '2026-07-06', category: 'topup', status: 'COMPLETED' },
  { id: 't7', type: 'CREDIT', amount: 200.00, desc: 'Wallet Top Up – Visa ••4242', date: '2026-07-05', category: 'topup', status: 'COMPLETED' },
  { id: 't8', type: 'DEBIT', amount: 12.99, desc: 'Purchase – Phone Case', date: '2026-07-04', category: 'purchase', status: 'PENDING' },
  { id: 't9', type: 'CREDIT', amount: 15.00, desc: 'Reward Points Redeemed', date: '2026-07-03', category: 'reward', status: 'COMPLETED' },
  { id: 't10', type: 'DEBIT', amount: 150.00, desc: 'Withdrawal to Chase ••4521', date: '2026-07-02', category: 'withdrawal', status: 'COMPLETED' },
  { id: 't11', type: 'DEBIT', amount: 59.99, desc: 'Purchase – Smart LED Strip', date: '2026-07-01', category: 'purchase', status: 'FAILED' },
  { id: 't12', type: 'CREDIT', amount: 10.00, desc: 'Gift Card Received', date: '2026-06-30', category: 'gift', status: 'COMPLETED' },
];

const CATEGORY_ICONS = {
  refund: RotateCcw,
  purchase: ShoppingBag,
  cashback: TrendingUp,
  referral: Gift,
  topup: Wallet,
  withdrawal: TrendingDown,
  reward: Gift,
  gift: Gift,
};

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', color: 'text-green-400 bg-green-500/15 border-green-500/30' },
  PENDING: { label: 'Pending', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
  FAILED: { label: 'Failed', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
};

export default function WalletTransactions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = ALL_TRANSACTIONS.filter(tx => {
    if (activeTab === 'credits' && tx.type !== 'CREDIT') return false;
    if (activeTab === 'debits' && tx.type !== 'DEBIT') return false;
    if (search && !tx.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const totalCredits = filtered.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalDebits = filtered.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
            <ArrowLeft size={20} className="text-[var(--text-muted)]" />
          </button>
          <h1 className="text-lg font-bold text-[var(--text-main)] flex-1">Transaction History</h1>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Calendar size={18} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-1.5">
            <Download size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Summary Row */}
        <div className="flex gap-3 px-4 pb-3 max-w-2xl mx-auto">
          <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--text-faint)]">Credits</p>
            <p className="text-sm font-bold text-green-400">+${totalCredits.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--text-faint)]">Debits</p>
            <p className="text-sm font-bold text-red-400">-${totalDebits.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--text-faint)]">Net</p>
            <p className={`text-sm font-bold ${totalCredits - totalDebits >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalCredits - totalDebits >= 0 ? '+' : ''}${(totalCredits - totalDebits).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Date filter */}
        {showDateFilter && (
          <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-4 flex gap-3 animate-[fadeInUp_0.2s_ease_forwards]">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-hover)]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-hover)]"
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-1 gap-1">
          {['all', 'credits', 'debits'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-[var(--bg-tertiary)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw size={32} className="text-[var(--text-faint)] mb-3" />
              <p className="text-[var(--text-muted)] text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {paginated.map((tx) => {
                const IconComp = CATEGORY_ICONS[tx.category] || Wallet;
                const statusConf = STATUS_CONFIG[tx.status];
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'CREDIT' ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                      <IconComp size={17} className={tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-main)] truncate font-medium">{tx.desc}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-faint)]">{tx.date}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className={`text-sm font-bold ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <button
            onClick={() => setPage(p => p + 1)}
            className="w-full py-3 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)] transition-all flex items-center justify-center gap-2"
          >
            <ChevronDown size={16} />
            Load More Transactions
          </button>
        )}

        {/* Export */}
        <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full py-3 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)] transition-all flex items-center justify-center gap-2">
          <Download size={16} />
          Export as CSV / PDF
        </button>
      </div>
    </div>
  );
}
