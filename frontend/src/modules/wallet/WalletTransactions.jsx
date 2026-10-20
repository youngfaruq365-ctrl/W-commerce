import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Filter, Download, ArrowDownLeft, ArrowUpRight,
  ChevronDown, Calendar, RefreshCw, TrendingUp, TrendingDown, CheckCircle,
  Clock, XCircle, ShoppingBag, Gift, RotateCcw, Wallet, EyeOff, Copy
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalletStore } from '../../store/walletStore';

const CATEGORY_ICONS = {
  topup: ArrowDownLeft,
  purchase: ShoppingBag,
  refund: RotateCcw,
  reward: Gift,
  withdrawal: ArrowUpRight,
  transfer: ArrowUpRight,
};

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  PENDING:   { label: 'Pending',   color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  FAILED:    { label: 'Failed',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  REVERSED:  { label: 'Reversed',  color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function WalletTransactions() {
  const navigate = useNavigate();
  const { transactions, fetchTransactions, currency } = useWalletStore();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const PER_PAGE = 8;
  const currencySymbol = currency === 'NGN' ? '₦' : (currency === 'USD' ? '₦' : currency);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(tx => {
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
            <p className="text-sm font-bold text-green-400">+{currencySymbol}{totalCredits.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--text-faint)]">Debits</p>
            <p className="text-sm font-bold text-red-400">-{currencySymbol}{totalDebits.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <p className="text-xs text-[var(--text-faint)]">Net</p>
            <p className={`text-sm font-bold ${totalCredits - totalDebits >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalCredits - totalDebits >= 0 ? '+' : ''}{currencySymbol}{(totalCredits - totalDebits).toFixed(2)}
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
                const IconComp = CATEGORY_ICONS[tx.category || tx.icon] || Wallet;
                const statusConf = STATUS_CONFIG[tx.status] || STATUS_CONFIG['COMPLETED'];
                return (
                  <div key={tx.id} onClick={() => setSelectedTx(tx)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors">
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
                        {tx.type === 'CREDIT' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
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
