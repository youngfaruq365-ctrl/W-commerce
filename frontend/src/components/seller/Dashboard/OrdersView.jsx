import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Package, CheckCircle, XCircle, Clock, ChevronRight, Eye, Send } from 'lucide-react';
import { getImageUrl } from '../../../utils/imageHelpers';
import { useSellerStore } from '../../../store/sellerStore';

const OrdersView = ({ orders, storeConfig, setPackingOrder, setShippingOrder, approvePaymentProof, rejectPaymentProof, showNotification }) => {
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewProofUrl, setViewProofUrl] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRequestingAddress, setIsRequestingAddress] = useState(false);
  const { requestOrderAddress } = useSellerStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders?.filter(order => {
    const q = searchQuery.toLowerCase();
    const idMatch = (order.id || '').toLowerCase().includes(q);
    const nameMatch = (order.user?.name || order.buyer?.fullName || '').toLowerCase().includes(q);
    return idMatch || nameMatch;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'PENDING_VERIFICATION': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'PAID': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'PACKED': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'SHIPPED': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Sales Orders</h1>
          <p className="text-[var(--text-muted)] text-sm">Manage and fulfill your customer orders.</p>
        </div>
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-[var(--accent-gray)] rounded-xl leading-5 bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out shadow-sm"
            placeholder="Search order ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredOrders?.length > 0 ? filteredOrders.map((order, i) => (
            <motion.div 
              key={order.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => setSelectedOrderDetails(order)}
              className="bg-white dark:bg-[#111] rounded-2xl p-5 border border-[var(--accent-gray)] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">#{order.id.slice(-8).toUpperCase()}</span>
                  <h3 className="font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">{order.user?.name || order.buyer?.fullName || 'Guest User'}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)} whitespace-nowrap`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {order.shippingAddress && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4 border border-[var(--accent-gray)]/50">
                  <div className="flex items-start gap-2 mb-2">
                    <Package className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 font-medium">{storeConfig?.storeName || 'Your Store'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {(() => {
                        try {
                          const parsed = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
                          if (parsed?.customDelivery) return parsed.street;
                          return [parsed?.street, parsed?.city, parsed?.state, parsed?.zipCode || parsed?.postalCode, parsed?.country].filter(Boolean).join(', ');
                        } catch(e) {
                          return order.shippingAddress;
                        }
                      })()}
                    </div>
                  </div>
                  {order.isConsolidated && (
                    <div className="mt-2 text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded inline-block uppercase tracking-wider">
                      Deliver to Hub
                    </div>
                  )}
                </div>
              )}

              {order.items?.length > 0 && (
                <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4 border border-[var(--accent-gray)]/50">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Products Purchased</h4>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs">
                        <span className="text-gray-800 dark:text-gray-200 line-clamp-2 flex-1 pr-2">
                          <span className="font-bold mr-1">{item.quantity}x</span> 
                          {item.product?.title || item.productName || 'Product'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white shrink-0 mt-0.5">
                          ₦{((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-[var(--accent-gray)]">
                {order.status === 'PENDING_VERIFICATION' || order.paymentStatus === 'PROOF_SUBMITTED' ? (
                  <div className="space-y-3">
                    {order.proofUrl && (
                      <button onClick={(e) => { e.stopPropagation(); setViewProofUrl(order.proofUrl); }} className="w-full flex items-center justify-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-lg font-medium transition-colors">
                        <Eye className="w-4 h-4" /> View Payment Proof
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        const success = await approvePaymentProof(order.id);
                        if (success) showNotification('Payment approved.', 'success');
                        else showNotification('Failed to approve payment.', 'error');
                      }} className="flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                        <CheckCircle className="w-4 h-4" /> Verify
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRejectOrderId(order.id); }} className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-bold transition-colors">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ) : ['PENDING', 'PAID'].includes(order.status) ? (
                  <button onClick={(e) => { e.stopPropagation(); setPackingOrder(order); }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
                    <Package className="w-4 h-4" /> Pack Order
                  </button>
                ) : order.status === 'PACKED' ? (
                  <button onClick={(e) => { e.stopPropagation(); setShippingOrder(order); }} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
                    <Package className="w-4 h-4" /> Ship Order
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-[var(--text-muted)] py-2.5 rounded-lg text-sm font-bold cursor-default">
                    <CheckCircle className="w-4 h-4" /> Completed
                  </div>
                )}
              </div>
            </motion.div>
          )) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-[#111] rounded-2xl border border-dashed border-[var(--accent-gray)]"
            >
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No orders yet</h3>
              <p className="text-[var(--text-muted)] text-center max-w-sm">When customers purchase your products, they will appear here for you to manage and fulfill.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reject Payment Modal */}
      {rejectOrderId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#111] border border-[var(--accent-gray)] shadow-2xl rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reject Payment</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Please provide a reason for rejecting this payment proof. The buyer will be notified.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Image is blurry, Wrong amount transferred..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-[var(--accent-gray)] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-500 mb-6 min-h-[120px] resize-none transition-shadow"
            ></textarea>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setRejectOrderId(null); setRejectReason(''); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!rejectReason.trim()) return showNotification('Please provide a reason.', 'error');
                  setIsRejecting(true);
                  const success = await rejectPaymentProof(rejectOrderId, rejectReason);
                  setIsRejecting(false);
                  if (success) {
                    showNotification('Payment rejected successfully.', 'success');
                    setRejectOrderId(null);
                    setRejectReason('');
                  } else {
                    showNotification('Failed to reject payment.', 'error');
                  }
                }}
                disabled={isRejecting}
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
              >
                {isRejecting ? <Clock className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* View Proof Modal */}
      {viewProofUrl && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setViewProofUrl(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewProofUrl(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 font-bold text-lg flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md transition-colors">
              <XCircle className="w-5 h-5" /> Close
            </button>
            <img src={getImageUrl(viewProofUrl)} alt="Payment Proof" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
          </motion.div>
        </div>,
        document.body
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedOrderDetails(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#111] border border-[var(--accent-gray)] shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h2>
              <button onClick={() => setSelectedOrderDetails(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Payment Details */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-[var(--accent-gray)]/50">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Payment Info
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Total Amount</p>
                    <p className="font-bold text-gray-900 dark:text-white">₦{(selectedOrderDetails.totalAmount || selectedOrderDetails.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Method</p>
                    <p className="font-bold text-gray-900 dark:text-white capitalize">{(selectedOrderDetails.paymentMethod || 'Unknown').replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Payment Status</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedOrderDetails.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Order Status</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedOrderDetails.status}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-[var(--accent-gray)]/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Shipping Address
                  </h3>
                  {(() => {
                    const parsed = typeof selectedOrderDetails.shippingAddress === 'string' ? (
                      selectedOrderDetails.shippingAddress.trim().startsWith('{') ? JSON.parse(selectedOrderDetails.shippingAddress) : null
                    ) : selectedOrderDetails.shippingAddress;
                    
                    if (!parsed) {
                      return (
                        <button
                          onClick={async () => {
                            setIsRequestingAddress(true);
                            const success = await requestOrderAddress(selectedOrderDetails.id);
                            setIsRequestingAddress(false);
                            if (success) {
                              showNotification('Address request sent to buyer.', 'success');
                            } else {
                              showNotification('Failed to send address request.', 'error');
                            }
                          }}
                          disabled={isRequestingAddress}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {isRequestingAddress ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Request Details
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {(() => {
                    try {
                      const rawStr = selectedOrderDetails.shippingAddress;
                      if (!rawStr) return <span className="text-gray-400 italic">No address provided</span>;
                      
                      const parsed = typeof rawStr === 'string' && rawStr.trim().startsWith('{') 
                        ? JSON.parse(rawStr) 
                        : typeof rawStr === 'object' ? rawStr : null;
                        
                      if (!parsed) return <span className="text-gray-400 italic">No address provided</span>;
                      
                      return (
                        <div className="space-y-1">
                          <p className="font-bold text-base text-gray-900 dark:text-white mb-2">{parsed.fullName || selectedOrderDetails.user?.name || 'Customer'}</p>
                          {parsed.customDelivery ? (
                            <p>{parsed.street}</p>
                          ) : (
                            <>
                              <p>{parsed.street}</p>
                              <p>{[parsed.city, parsed.state, parsed.zipCode || parsed.postalCode].filter(Boolean).join(', ')}</p>
                              <p>{parsed.country}</p>
                            </>
                          )}
                          {parsed.phone && <p className="mt-3 flex items-center gap-2 text-[var(--text-muted)]"><span className="font-bold">Phone:</span> {parsed.phone}</p>}
                        </div>
                      );
                    } catch(e) {
                      return <span className="text-gray-400 italic">No address provided</span>;
                    }
                  })()}
                </div>
                {selectedOrderDetails.isConsolidated && (
                  <div className="mt-4 text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1.5 rounded inline-block uppercase tracking-wider">
                    Deliver to GlobalX Consolidation Hub
                  </div>
                )}
              </div>

              {/* Products List */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Products ({selectedOrderDetails.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {selectedOrderDetails.items?.map((item, idx) => {
                    const imgUrl = item.product?.images?.[0]?.url || item.product?.images?.[0] || null;
                    return (
                      <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-[#111] border border-[var(--accent-gray)] rounded-xl items-center hover:shadow-md transition-shadow">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                          {imgUrl ? (
                            <img src={getImageUrl(imgUrl)} alt="Product" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 dark:text-white truncate text-base">{item.product?.title || item.productName || 'Unknown Product'}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Qty: <span className="font-bold text-gray-700 dark:text-gray-300">{item.quantity}</span></p>
                          {item.variants && Object.keys(item.variants).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                                {Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Unit: ₦{Number(item.price || item.product?.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          <p className="font-black text-lg text-gray-900 dark:text-white">₦{(Number(item.price || item.product?.price || 0) * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OrdersView;
