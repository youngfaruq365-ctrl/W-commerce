import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Package, CheckCircle, XCircle, Clock, ChevronRight, Eye, Send, Truck } from 'lucide-react';
import { getImageUrl } from '../../../utils/imageHelpers';
import { useSellerStore } from '../../../store/sellerStore';
import { apiClient as axios } from '@/utils/apiClient';

const OrdersView = ({ orders, storeConfig, setPackingOrder, setShippingOrder, approvePaymentProof, rejectPaymentProof, showNotification }) => {
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewProofUrl, setViewProofUrl] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRequestingAddress, setIsRequestingAddress] = useState(false);
  const [rateOrderId, setRateOrderId] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isRating, setIsRating] = useState(false);
  
  const { requestOrderAddress } = useSellerStore();
  const currentOrderDetails = selectedOrderDetails ? (orders?.find(o => o.id === selectedOrderDetails.id) || selectedOrderDetails) : null;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders?.filter(order => {
    const q = searchQuery.toLowerCase();
    const idMatch = (order.id || '').toLowerCase().includes(q);
    const nameMatch = (order.user?.name || order.buyer?.fullName || '').toLowerCase().includes(q);
    return idMatch || nameMatch;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'AWAITING_PAYMENT':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'HANDED_TO_COURIER':
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'PACKED':
      case 'PREPARING':
      case 'ACCEPTED':
      case 'PAID':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  const handleRateCourier = async () => {
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      return showNotification('Please provide a rating between 1 and 5.', 'error');
    }
    setIsRating(true);
    try {
      await axios.post(`/api/v1/delivery/${rateOrderId}/rate-courier`, {
        rating: ratingValue,
        comment: ratingComment
      });
      showNotification('Courier rated successfully!', 'success');
      setRateOrderId(null);
      setRatingValue(5);
      setRatingComment('');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to rate courier.', 'error');
    } finally {
      setIsRating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">Sales Orders</h1>
          <p className="text-[var(--text-muted)] text-sm font-medium">Manage and fulfill your customer orders.</p>
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
              className="group relative rounded-[24px] p-[1px] overflow-hidden transition-all duration-500 cursor-pointer h-full shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Neumorphic effect */}
              
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col h-full relative z-10 transition-colors shadow-sm hover:shadow-md">
                
                <div className="flex justify-between items-start mb-5 gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400 tracking-wider uppercase">#{order.id.slice(-8)}</span>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1">{order.user?.name || order.buyer?.fullName || 'Guest User'}</h3>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${getStatusColor(order.status)} whitespace-nowrap shadow-2xs uppercase tracking-wider shrink-0`}>
                    {order.status?.replace(/_/g, ' ') || 'Pending'}
                  </span>
                </div>

                {order.shippingAddress && (
                  <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 mb-5 border border-slate-200/80 dark:border-zinc-700/60 shadow-2xs relative overflow-hidden transition-colors">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 dark:bg-blue-500"></div>
                    <div className="flex items-center gap-2.5 mb-2 pl-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-slate-900 dark:text-zinc-100 font-bold uppercase tracking-wider truncate">{storeConfig?.storeName || 'Your Store'}</span>
                    </div>
                    <div className="flex items-start gap-2 pl-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-slate-700 dark:text-zinc-300 font-medium line-clamp-2 leading-relaxed">
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
                      <div className="mt-3 ml-2 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/40 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 uppercase tracking-wider">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Deliver to Hub
                      </div>
                    )}
                  </div>
                )}

                {order.items?.length > 0 && (
                  <div className="flex-1 bg-slate-50/70 dark:bg-zinc-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-zinc-700/50 mb-6 shadow-2xs">
                    <h4 className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      PRODUCTS PURCHASED
                    </h4>
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm group/item">
                          <span className="text-slate-800 dark:text-zinc-200 line-clamp-1 flex-1 pr-3 font-medium transition-colors group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 flex items-center gap-2">
                            <span className="font-black text-xs text-slate-700 dark:text-zinc-300 bg-slate-200/60 dark:bg-zinc-700/60 px-2 py-1 rounded-md">{item.quantity}x</span> 
                            {item.product?.title || item.productName || 'Product'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white shrink-0 bg-white/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                            ₦{((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-5 border-t border-gray-200/50 dark:border-white/10">
                  {order.status === 'PENDING_VERIFICATION' || order.paymentStatus === 'PROOF_SUBMITTED' ? (
                    <div className="space-y-3">
                      {order.proofUrl && (
                        <button onClick={(e) => { e.stopPropagation(); setViewProofUrl(order.proofUrl); }} className="w-full flex items-center justify-center gap-2 text-sm text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 py-3 rounded-xl font-bold transition-all border border-gray-300/50 dark:border-white/10 backdrop-blur-sm">
                          <Eye className="w-4 h-4" /> View Payment Proof
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          const success = await approvePaymentProof(order.id);
                          if (success) showNotification('Payment approved.', 'success');
                          else showNotification('Failed to approve payment.', 'error');
                        }} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
                          <CheckCircle className="w-4 h-4" /> Verify
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setRejectOrderId(order.id); }} className="flex items-center justify-center gap-2 bg-gray-100/80 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm border border-gray-200 dark:border-white/10">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ) : order.status === 'CANCELLED' ? (
                    <div className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 py-3 rounded-xl text-sm font-bold border border-rose-500/20 cursor-default">
                      <XCircle className="w-4 h-4" /> Cancelled
                    </div>
                  ) : (['PAID', 'SELLER_REVIEW', 'ACCEPTED', 'PREPARING'].includes(order.status) || (order.status === 'PENDING' && (order.paymentStatus === 'PAID' || order.paymentMethod === 'COD'))) ? (
                    <button onClick={(e) => { e.stopPropagation(); setPackingOrder(order); }} className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-black py-3 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] dark:shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5">
                      <Package className="w-4 h-4" /> Pack Order
                    </button>
                  ) : order.status === 'PENDING' ? (
                    <div className="w-full flex items-center justify-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 py-3 rounded-xl text-sm font-bold border border-amber-500/20 cursor-default">
                      <Clock className="w-4 h-4" /> Awaiting Payment
                    </div>
                  ) : order.status === 'PACKED' ? (
                    <button onClick={(e) => { e.stopPropagation(); setShippingOrder(order); }} className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-black py-3 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] dark:shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5">
                      <Truck className="w-4 h-4" /> Request Courier
                    </button>
                  ) : order.status === 'AWAITING_COURIER' ? (
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await axios.post(`/api/v1/fulfillment/${order.id}/handover`);
                        showNotification('Order handed over to courier!', 'success');
                      } catch (err) {
                        // Fallback: try updating via orders endpoint
                        try {
                          await axios.post('/api/v1/orders/update-status', { orderId: order.id, status: 'HANDED_TO_COURIER' });
                          showNotification('Order handed over to courier!', 'success');
                        } catch (err2) {
                          showNotification(err2.response?.data?.message || 'Failed to handover order.', 'error');
                        }
                      }
                    }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                      <Truck className="w-4 h-4" /> Handover to Courier
                    </button>
                  ) : ['HANDED_TO_COURIER', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl text-sm font-bold cursor-default border border-emerald-500/25">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'Delivered' : 'In Transit'}
                      </div>
                      {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && order.deliveryAssignment && !order.deliveryAssignment.courierReview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRateOrderId(order.id);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 py-2.5 rounded-xl text-sm font-bold transition-colors border border-yellow-500/30"
                        >
                          ⭐ Rate Courier
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 bg-gray-100/50 dark:bg-white/5 text-[var(--text-muted)] py-3 rounded-xl text-sm font-bold cursor-default backdrop-blur-sm border border-gray-200/50 dark:border-white/5">
                      <CheckCircle className="w-4 h-4" /> {order.status?.replace(/_/g, ' ') || 'Processing'}
                    </div>
                  )}
                </div>
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
      {currentOrderDetails && createPortal(
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
                    <p className="font-bold text-gray-900 dark:text-white">₦{(currentOrderDetails.items?.reduce((sum, item) => sum + (Number(item.price || item.product?.price || 0) * item.quantity), 0) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Method</p>
                    <p className="font-bold text-gray-900 dark:text-white capitalize">{(currentOrderDetails.paymentMethod || 'Unknown').replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Payment Status</p>
                    <p className="font-bold text-gray-900 dark:text-white">{currentOrderDetails.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Order Status</p>
                    <p className="font-bold text-gray-900 dark:text-white">{currentOrderDetails.status}</p>
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
                    const parsed = typeof currentOrderDetails.shippingAddress === 'string' ? (
                      currentOrderDetails.shippingAddress.trim().startsWith('{') ? JSON.parse(currentOrderDetails.shippingAddress) : null
                    ) : currentOrderDetails.shippingAddress;
                    
                    if (!parsed) {
                      return (
                        <button
                          onClick={async () => {
                            setIsRequestingAddress(true);
                            const success = await requestOrderAddress(currentOrderDetails.id);
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
                      const rawStr = currentOrderDetails.shippingAddress;
                      if (!rawStr) return <span className="text-gray-400 italic">No address provided</span>;
                      
                      const parsed = typeof rawStr === 'string' && rawStr.trim().startsWith('{') 
                        ? JSON.parse(rawStr) 
                        : typeof rawStr === 'object' ? rawStr : null;
                        
                      if (!parsed) return <span className="text-gray-400 italic">No address provided</span>;
                      
                      return (
                        <div className="space-y-1">
                          <p className="font-bold text-base text-gray-900 dark:text-white mb-2">{parsed.fullName || currentOrderDetails.user?.name || currentOrderDetails.buyer?.fullName || 'Customer'}</p>
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
                {currentOrderDetails.isConsolidated && (
                  <div className="mt-4 text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1.5 rounded inline-block uppercase tracking-wider">
                    Deliver to GlobalX Consolidation Hub
                  </div>
                )}
              </div>

              {/* Products List */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Products ({currentOrderDetails.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {currentOrderDetails.items?.map((item, idx) => {
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

      {/* Rate Courier Modal */}
      {rateOrderId && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#111] border border-[var(--accent-gray)] shadow-2xl rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Rate Courier</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">How was the delivery experience?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${ratingValue >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-[var(--accent-gray)] focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-500 mb-6 min-h-[120px] resize-none transition-shadow"
            ></textarea>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setRateOrderId(null); setRatingValue(5); setRatingComment(''); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isRating}
              >
                Cancel
              </button>
              <button 
                onClick={handleRateCourier}
                disabled={isRating}
                className="bg-yellow-500 text-gray-900 px-6 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg shadow-yellow-500/20 flex items-center gap-2"
              >
                {isRating ? <Clock className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default OrdersView;
