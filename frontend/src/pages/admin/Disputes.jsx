import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { AlertTriangle, MessageSquare, Unlock, ShieldAlert, Loader2 } from 'lucide-react';

const Disputes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await axios.get('/api/v1/admin/disputes');
      if (res.data.success) {
        setDisputes(res.data.disputes);
        if (res.data.disputes.length > 0) {
          handleSelectDispute(res.data.disputes[0]);
        }
      }
    } catch(e) {
      toast.error('Failed to load disputes');
    }
  };

  const handleSelectDispute = async (dispute) => {
    setSelectedDispute(dispute);
    setLoadingMessages(true);
    try {
      const res = await axios.get(`/api/v1/disputes/${dispute.id}`);
      if (res.data.success) {
        setMessages(res.data.dispute.messages || []);
      }
    } catch(e) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleResolve = async (status) => {
    if (!selectedDispute) return;
    setIsLoading(true);
    try {
      await axios.post('/api/v1/admin/disputes/resolve', { 
        disputeId: selectedDispute.id, 
        status: status === 'SELLER' ? 'RESOLVED_REJECTED' : 'RESOLVED_REFUNDED', 
        resolution: status === 'SELLER' ? 'Admin resolved in seller favor' : 'Admin resolved in buyer favor' 
      }); 
      toast.success(status === 'SELLER' ? 'Released to Seller' : 'Refunded Buyer'); 
      fetchDisputes();
    } catch(e) { 
      toast.error('Failed to resolve dispute'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ShieldAlert className="text-gx-gray" /> Active Disputes
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Dispute List */}
          <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {disputes.map(dispute => (
              <div 
                key={dispute.id} 
                onClick={() => handleSelectDispute(dispute)}
                className={`glass-card p-4 border-l-4 cursor-pointer transition-opacity ${selectedDispute?.id === dispute.id ? 'border-l-gx-gray bg-gx-gray/5 opacity-100' : 'border-l-gx-warning opacity-70 hover:opacity-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${dispute.status.includes('RESOLVED') ? 'bg-gx-success/20 text-gx-success' : 'bg-gx-warning/20 text-gx-warning'}`}>
                    {dispute.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(dispute.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold mb-1">{dispute.reason || 'Dispute'}</h3>
                <p className="text-sm text-gray-400">Order #{dispute.orderId.substring(0, 8)} • ₦{dispute.order?.totalAmount}</p>
              </div>
            ))}
            {disputes.length === 0 && <p className="text-gray-500 text-sm">No active disputes.</p>}
          </div>

          {/* Dispute Details & Resolution */}
          <div className="lg:col-span-2">
            {selectedDispute ? (
              <div className="glass-card flex flex-col h-full min-h-[600px] overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{selectedDispute.reason || 'Dispute'}</h2>
                      <p className="text-gray-400 text-sm">Dispute ID: {selectedDispute.id} • Order: #{selectedDispute.orderId.substring(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gx-gray">₦{selectedDispute.order?.totalAmount}</div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">{selectedDispute.status}</span>
                    </div>
                  </div>
                </div>

                {/* Chat Log between Buyer/Seller/Admin */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/10">
                  {loadingMessages ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                  ) : messages.length > 0 ? (
                    messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col gap-1 ${msg.senderType === 'SELLER' ? 'items-end' : ''}`}>
                        <span className={`text-xs text-gray-400 font-bold ${msg.senderType === 'SELLER' ? 'mr-2' : 'ml-2'}`}>
                          {msg.senderType === 'BUYER' ? `Buyer (${selectedDispute.buyer?.fullName})` : msg.senderType === 'SELLER' ? `Seller (${selectedDispute.seller?.fullName})` : 'Admin'}
                        </span>
                        <div className={`glass-card p-4 rounded-2xl max-w-[80%] text-gray-200 ${msg.senderType === 'SELLER' ? 'bg-blue-500/20 border-blue-500/20 rounded-tr-sm' : 'bg-white/5 rounded-tl-sm'}`}>
                          {msg.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500">No messages found for this dispute.</p>
                  )}
                  
                  <div className="flex justify-center my-6">
                    <span className="bg-gx-gray/20 text-gx-gray text-xs px-3 py-1 rounded-full border border-gx-gray/30 flex items-center gap-2">
                      <AlertTriangle size={12} /> Admin Intervention Requested
                    </span>
                  </div>
                </div>

                {/* Admin Actions */}
                {!selectedDispute.status.includes('RESOLVED') && (
                  <div className="p-6 border-t border-white/10 bg-[#0a0a0d]">
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Resolution Actions</h3>
                    <div className="flex gap-4">
                      <button disabled={isLoading} onClick={() => handleResolve('SELLER')} className="flex-1 glass-btn bg-gx-success/10 text-gx-success border-gx-success/30 hover:bg-gx-success hover:text-black transition-colors py-3 flex justify-center items-center gap-2 font-semibold disabled:opacity-50">
                        <Unlock size={18} /> Release to Seller
                      </button>
                      <button disabled={isLoading} onClick={() => handleResolve('BUYER')} className="flex-1 glass-btn bg-gx-gray/10 text-gx-gray border-gx-gray/30 hover:bg-gx-gray hover:text-black transition-colors py-3 flex justify-center items-center gap-2 font-semibold disabled:opacity-50">
                        <MessageSquare size={18} /> Refund Buyer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card flex flex-col h-full min-h-[600px] justify-center items-center text-gray-500">
                <ShieldAlert size={48} className="mb-4 opacity-50" />
                <p>Select a dispute to view details</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Disputes;
