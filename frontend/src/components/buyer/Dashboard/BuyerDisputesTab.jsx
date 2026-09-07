import React from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

const BuyerDisputesTab = ({ disputes = [], onOpenDispute, onSetTab }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Dispute Center</h2>
      <button
        onClick={onOpenDispute}
        className="px-4 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-colors flex items-center gap-2"
      >
        <ShieldAlert size={18} /> Raise Dispute
      </button>
    </div>

    {disputes.length > 0 ? (
      <div className="space-y-4">
        {disputes.map(dispute => (
          <div key={dispute.id} className="premium-glass p-6 rounded-xl border border-gray-700/50 hover:border-gray-500/50 transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 font-bold text-lg">
                Dispute #{dispute.id?.slice(0, 8).toUpperCase()}
              </span>
              <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full font-bold">
                {dispute.status}
              </span>
            </div>
            <p className="font-bold text-black mb-2">{dispute.reason}</p>
            <p className="text-[var(--text-muted)] mb-4 line-clamp-2">{dispute.description}</p>
            <button onClick={() => onSetTab('messages')}  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:text-black transition-colors text-sm">
              View Details
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
        <ShieldAlert size={40} className="text-[var(--text-muted)] mb-4" />
        <h3 className="text-xl font-bold text-black mb-2">No Active Disputes</h3>
        <p className="text-[var(--text-muted)] mt-2">
          You don't have any ongoing disputes. Escrow protects you in case of any issues.
        </p>
        <button
          onClick={onOpenDispute}
          className="mt-6 px-6 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:bg-[var(--accent-gray)] hover:text-black transition-all"
        >
          Raise a Dispute
        </button>
      </div>
    )}
  </div>
);

export default BuyerDisputesTab;
