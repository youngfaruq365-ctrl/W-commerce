import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import PaymentProofsList from '../PaymentProofsList';
import WithdrawModal from './WithdrawModal';

const WalletView = ({ paymentGateway, setPaymentGateway, bankDetails, setBankDetails, updateStoreConfig, showNotification, useSellerStore }) => {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const { walletSummary } = useSellerStore();

  return (
    <div className="animate-[fadeIn_0.5s_ease-in-out]">
      {/* WALLET SUMMARY SECTION */}
      <div className="bg-[#0a0a0a] border border-[var(--accent-gray)] shadow-[0_0_15px_var(--accent-gray-dim)] p-6 rounded-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Wallet className="text-[var(--accent-gray)]" />
            Available Balance
          </h2>
          <div className="text-4xl font-extrabold text-white font-mono">
            ₦{walletSummary?.balances?.GONG?.available ? Number(walletSummary.balances.GONG.available).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <p className="text-sm text-gray-500 mt-1">Ready for withdrawal</p>
        </div>
        <button 
          onClick={() => setIsWithdrawModalOpen(true)}
          className="bg-[var(--accent-gray)] text-black font-bold px-6 py-3 rounded-lg hover:brightness-110 transition shadow-[0_0_15px_var(--accent-gray-dim)] whitespace-nowrap"
        >
          Withdraw Funds
        </button>
      </div>

      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-extrabold text-black mb-6">Payment Gateways</h1>
        <div className="bg-[var(--bg-tertiary)] border border-gray-700 p-4 rounded-lg mb-6">
          <p className="text-sm text-black font-medium">DECENTRALIZED MODE: By setting a custom gateway, you handle payments directly.</p>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Gateway Type</label>
          <select value={paymentGateway} onChange={e => setPaymentGateway(e.target.value)} className="w-full bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors">
            <option value="GlobalX Managed (Default Escrow)">GlobalX Managed (Default Escrow)</option>
            <option value="Stripe Custom Integration">Stripe Custom Integration</option>
            <option value="Crypto Wallet Direct">Crypto Wallet Direct</option>
            <option value="Direct Bank Transfer">Direct Bank Transfer</option>
          </select>
        </div>
        
        {paymentGateway === 'Direct Bank Transfer' && (
          <div className="space-y-4 mt-4 p-4 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg bg-white">
            <h3 className="text-black font-bold mb-2">Direct Pay Details</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Bank Name</label>
              <input type="text" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg p-3 text-black outline-none" placeholder="e.g. Chase Bank" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Account Name</label>
              <input type="text" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg p-3 text-black outline-none" placeholder="e.g. TechGlobal LLC" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Account Number</label>
              <input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg p-3 text-black outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Routing Number / Swift Code</label>
              <input type="text" value={bankDetails.routingNumber} onChange={e => setBankDetails({...bankDetails, routingNumber: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg p-3 text-black outline-none" />
            </div>
          </div>
        )}

        <button 
          onClick={async () => {
            const payload = { paymentGatewayType: paymentGateway === 'Direct Bank Transfer' ? 'DIRECT_BANK' : 'ESCROW' };
            if (paymentGateway === 'Direct Bank Transfer') {
              Object.assign(payload, bankDetails);
            }
            const success = await updateStoreConfig(payload);
            if(success) {
              showNotification('Payment Gateway Updated!', 'success');
            } else {
              showNotification(useSellerStore.getState().error || 'Failed to update payment gateway', 'error');
            }
          }}
          className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition mt-6 w-full"
        >
          Save Gateway Settings
        </button>
      </div>

      {/* DIRECT PAYMENT PROOFS SECTION */}
      <div className="mt-12 bg-[#04120c] p-6 rounded-xl border border-emerald-900/30 max-w-4xl">
        <PaymentProofsList />
      </div>

      <WithdrawModal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => setIsWithdrawModalOpen(false)} 
      />
    </div>
  );
};

export default WalletView;
