import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, XCircle, CheckCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';
import GenerateReceiptModal from './GenerateReceiptModal';
import { getImageUrl } from '../../utils/imageHelpers';

const PaymentProofsList = () => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProof, setSelectedProof] = useState(null);
  const [receiptModalProof, setReceiptModalProof] = useState(null);

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/payment/seller-proofs');
      if (res.data.success) {
        setProofs(res.data.proofs);
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (proofId, action) => {
    if (action === 'REJECT' && !rejectReason) {
      return window.__gxAlert?.('Please provide a reason for rejection.') ?? console.warn('Please provide a reason for rejection.');
    }
    
    try {
      setActionLoading(proofId);
      const res = await axios.post(`/api/v1/payment/verify-proof/${proofId}`, {
        action,
        rejectReason: action === 'REJECT' ? rejectReason : undefined
      });
      
      if (res.data.success) {
        window.__gxAlert?.(res.data.message) ?? console.warn(res.data.message);
        setSelectedProof(null);
        setRejectReason('');
        fetchProofs();
        if (useSellerStore.getState().fetchSellerOrders) {
          useSellerStore.getState().fetchSellerOrders();
          useSellerStore.getState().fetchPackingOrders();
        }
      }
    } catch (err) {
      alert('Verification failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-emerald-400 p-8 text-center animate-pulse">Loading payment proofs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-emerald-900/30 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-black flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" />
            Direct Payment Proofs
          </h2>
          <p className="text-emerald-100/60 text-sm mt-1">Review and approve bank transfers directly to your account.</p>
        </div>
      </div>

      {proofs.length === 0 ? (
        <div className="text-center py-12 bg-white/40 rounded-xl border border-emerald-900/20">
          <p className="text-emerald-100/50">No payment proofs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proofs.map(proof => (
            <div key={proof.id} className="bg-[#04120c] border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/40 transition">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                    <ImageIcon className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black">Order: {proof.orderId.slice(-8)}</h3>
                    <p className="text-sm text-emerald-100/60">From: {proof.buyerName}</p>
                    <p className="text-xs font-mono text-emerald-400 mt-1">Ref: {proof.transactionRef}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xl font-extrabold text-emerald-400"> ₦{Number(proof.amount).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${
                    proof.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    proof.status === 'REJECTED' ? 'bg-gray-400 500/20 text-gray-700 400 border border-gray-400 500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {proof.status}
                  </span>
                </div>
              </div>

              {proof.status === 'PENDING' && (
                <div className="mt-6 pt-6 border-t border-emerald-900/30 flex flex-wrap gap-3">
                  <a 
                    href={getImageUrl(proof.proofImageUrl)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-2 hover:bg-emerald-500/10 transition"
                  >
                    View Receipt <ExternalLink size={16} />
                  </a>
                  
                  {selectedProof === proof.id ? (
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Reason for rejection..." 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="flex-1 bg-white/50 border border-gray-400 500/50 rounded-lg px-3 py-2 text-black focus:outline-none"
                      />
                      <button 
                        onClick={() => handleVerify(proof.id, 'REJECT')}
                        disabled={actionLoading === proof.id}
                        className="px-4 py-2 bg-gray-400 500 text-black font-bold rounded-lg hover:bg-gray-400 600 transition"
                      >
                        {actionLoading === proof.id ? 'Processing...' : 'Confirm Reject'}
                      </button>
                      <button 
                        onClick={() => setSelectedProof(null)}
                        className="px-3 py-2 text-gray-700 hover:text-black"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setReceiptModalProof(proof)}
                        disabled={actionLoading === proof.id}
                        className="px-6 py-2 bg-emerald-500 text-black font-extrabold rounded-lg hover:bg-emerald-400 transition ml-auto flex items-center gap-2"
                      >
                        <CheckCircle size={18} /> Approve Payment
                      </button>
                      <button 
                        onClick={() => setSelectedProof(proof.id)}
                        className="px-4 py-2 bg-gray-400 500/10 text-gray-700 400 border border-gray-400 500/20 font-bold rounded-lg hover:bg-gray-400 500/20 transition flex items-center gap-2"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <GenerateReceiptModal 
        isOpen={!!receiptModalProof}
        onClose={() => setReceiptModalProof(null)}
        proof={receiptModalProof}
        onSuccess={fetchProofs}
      />
    </div>
  );
};

export default PaymentProofsList;
