import React from 'react';
import { ShieldAlert, Wallet, RefreshCcw } from 'lucide-react';
import { useBuyerStore } from '../../../../store/buyerStore';

const BuyerWalletTab = ({ onTopUp, onWithdraw }) => {
  const { wallet, walletTransactions = [] } = useBuyerStore();
  return (
  <div className="space-y-6 animate-fade-in">
    <h2 className="text-2xl font-bold mb-6">Escrow Wallet</h2>

    {/* Balance Card */}
    <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-gray)] opacity-10 rounded-full blur-[80px] -mr-10 -mt-10 pointer-events-none" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <p className="text-[var(--text-muted)] mb-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-[var(--accent-gray)]" /> Available Balance
          </p>
          <h3 className="text-5xl font-extrabold text-black tracking-tight">
            NGN {parseFloat(wallet?.balance || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-gray-700 mt-2">Funds are safely held in GlobalX Escrow</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onTopUp}
            className="px-6 py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Wallet size={18} /> Top Up
          </button>
          <button
            onClick={onWithdraw}
            className="px-6 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:border-gray-500 transition-all"
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>

    {/* Transactions */}
    <h3 className="text-xl font-bold mt-8 mb-4">Recent Transactions</h3>
    {walletTransactions.length > 0 ? (
      <div className="space-y-4">
        {walletTransactions.map(tx => (
          <div key={tx.id} className="premium-glass p-5 rounded-xl border border-[var(--border-color)] flex justify-between items-center hover:bg-[var(--bg-tertiary)] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-500">
                {tx.type === 'CREDIT' ? <RefreshCcw size={20} /> : <Wallet size={20} />}
              </div>
              <div>
                <p className="font-bold text-black capitalize">
                  {(tx.referenceType || '').toLowerCase()} — {tx.type}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-extrabold text-lg ${tx.type === 'CREDIT' ? 'text-gray-500' : 'text-black'}`}>
                {tx.type === 'CREDIT' ? '+' : '-'}NGN {parseFloat(tx.amount).toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{tx.description || tx.referenceId}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="premium-glass p-12 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
        <RefreshCcw size={40} className="text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-muted)]">No recent transactions in your wallet.</p>
      </div>
    )}
  </div>
);
};

export default BuyerWalletTab;
