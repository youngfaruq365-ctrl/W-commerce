import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Search, Copy, CheckCircle2, Clock, X, AlertTriangle,
  RotateCcw, Ban, ArrowRight, ShieldCheck, MapPin, Box, Check,
  MessageSquare, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../utils/apiClient';
import { resolveProductImage, isVideoUrl, getImageUrl } from '../../utils/imageHelpers';

// 7 Standard Milestones
const MILESTONES = [
  { id: 'ordered', label: 'Ordered', stepKey: 0 },
  { id: 'paid', label: 'Paid in Escrow', stepKey: 1 },
  { id: 'hub_processing', label: 'Hub Processing', stepKey: 2 },
  { id: 'export_transit', label: 'In Transit', stepKey: 3 },
  { id: 'customs_cleared', label: 'Customs Cleared', stepKey: 4 },
  { id: 'out_for_delivery', label: 'Out for Delivery', stepKey: 5 },
  { id: 'delivered', label: 'Delivered', stepKey: 6 },
];

export default function PayAIOrderTracker({
  shipments = [],
  formatLocalPrice,
  onOrderUpdated,
  onAskAI,
  onRefresh,
  loading = false,
  initialSearchCode = ''
}) {
  const [searchCode, setSearchCode] = useState(initialSearchCode || '');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});

  // Remote Tracking Search
  const [remoteSearching, setRemoteSearching] = useState(false);
  const [remoteOrderResult, setRemoteOrderResult] = useState(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed mind / found cheaper alternative');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Item not as described');
  const [returnDetails, setReturnDetails] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  useEffect(() => {
    if (initialSearchCode) {
      setSearchCode(initialSearchCode);
    }
  }, [initialSearchCode]);

  const copyText = (txt, label = 'Tracking Code') => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied to clipboard!`);
  };

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Helper to safely format item price avoiding double FX conversion on Naira prices
  const formatItemPrice = (price, currency = 'NGN') => {
    const raw = Number(price) || 0;
    const curr = (currency || 'NGN').toUpperCase();

    // If already in Naira (or numeric value >= 500 which indicates NGN)
    if (curr === 'NGN' || curr === '₦' || curr === 'NAIRA' || (raw >= 500 && curr !== 'USD')) {
      return `₦${Math.round(raw).toLocaleString()} NGN`;
    }

    if (curr === 'USD' || curr === '$') {
      if (formatLocalPrice) return formatLocalPrice(raw, 'USD');
      return `$${raw.toFixed(2)} USD`;
    }

    if (curr === 'GHS') return `GH₵${raw.toFixed(2)}`;
    if (curr === 'KES') return `KSh${Math.round(raw).toLocaleString()}`;
    if (curr === 'GBP') return `£${raw.toFixed(2)}`;

    if (formatLocalPrice) return formatLocalPrice(raw, curr);
    return `₦${Math.round(raw).toLocaleString()} NGN`;
  };

  const getStepProgressIndex = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'ORDERED' || s === 'AWAITING_PAYMENT' || s === 'PENDING') return 0;
    if (s === 'PAID' || s === 'CONFIRMED' || s === 'PAID_IN_ESCROW' || s === 'SELLER_ACCEPTED' || s === 'SELLER_REVIEW') return 1;
    if (s === 'HUB_PROCESSING' || s === 'PROCESSING' || s === 'PREPARING' || s === 'PACKED' || s === 'READY_FOR_PICKUP') return 2;
    if (s === 'EXPORT_TRANSIT' || s === 'IN TRANSIT' || s === 'IN_TRANSIT' || s === 'SHIPPED' || s === 'COURIER_ASSIGNED' || s === 'DISPATCHED') return 3;
    if (s === 'CUSTOMS_CLEARED' || s === 'ARRIVED_LOCAL_HUB' || s === 'HUB_RECEIVED') return 4;
    if (s === 'OUT FOR DELIVERY' || s === 'OUT_FOR_DELIVERY') return 5;
    if (s === 'DELIVERED' || s === 'CONFIRMED_COMPLETED' || s === 'COMPLETED') return 6;
    if (s === 'CANCELLED' || s === 'REFUNDED') return -1;
    return 2;
  };

  // Remote Waybill lookup
  const handleRemoteLookup = async () => {
    const code = searchCode.trim();
    if (!code) return;
    setRemoteSearching(true);
    setRemoteOrderResult(null);
    try {
      const res = await apiClient.get(`/api/v1/payai/orders/${encodeURIComponent(code)}/track`);
      if (res.data?.success && res.data.tracking) {
        const t = res.data.tracking;
        setRemoteOrderResult({
          id: t.orderId || code,
          orderNumber: t.orderNumber || code,
          trackingNumber: t.trackingNumber || code,
          carrier: t.carrier || 'Global Express Logistics',
          status: t.status || 'IN_TRANSIT',
          itemTitle: t.itemTitle || `Package (${t.orderNumber || code})`,
          origin: t.origin || 'Regional Distribution Hub',
          destination: t.destination || 'Delivery Address',
          eta: t.estimatedDelivery ? new Date(t.estimatedDelivery).toLocaleDateString() : 'In 2-4 Days',
          grandTotal: t.amount || 0,
          checkpoints: t.checkpoints || []
        });
        toast.success(`Found live tracking record for ${code}`);
      } else {
        toast.error('No package record found with that tracking code');
      }
    } catch (err) {
      console.warn('Remote tracking error:', err);
      toast.error(err.response?.data?.message || 'Could not locate package on carrier network');
    } finally {
      setRemoteSearching(false);
    }
  };

  // Cancellation Action Handler
  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    setIsSubmittingCancel(true);
    try {
      const orderId = selectedOrder.id || selectedOrder.orderNumber;
      const res = await apiClient.post(`/api/v1/payai/orders/${orderId}/cancel`, {
        reason: cancelReason || 'Buyer requested cancellation'
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Order cancelled. Refund initiated to original source.');
        setCancelModalOpen(false);
        onOrderUpdated && onOrderUpdated();
      } else {
        toast.error(res.data?.message || 'Could not cancel order');
      }
    } catch (err) {
      console.warn('Cancel endpoint error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Unable to cancel order at this fulfillment stage.';
      toast.error(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Return Action Handler
  const handleConfirmReturn = async () => {
    if (!selectedOrder) return;
    setIsSubmittingReturn(true);
    try {
      const orderId = selectedOrder.id || selectedOrder.orderNumber;
      const res = await apiClient.post(`/api/v1/payai/orders/${orderId}/return`, {
        reason: returnReason,
        details: returnDetails
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Return authorized! Pre-paid DHL return label generated.');
        setReturnModalOpen(false);
        onOrderUpdated && onOrderUpdated();
      } else {
        toast.error(res.data?.message || 'Return authorization failed.');
      }
    } catch (err) {
      console.warn('Return endpoint error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Unable to submit return request.';
      toast.error(msg);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Buyer Confirmation of Receipt & Escrow Release
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const handleConfirmReceipt = async (order) => {
    if (!order) return;
    const orderId = order.id || order.orderNumber;
    const confirmPrompt = `Have you received your package (${order.orderNumber || orderId})? Confirming will release escrow funds to the seller in Naira (NGN).`;
    if (!window.confirm(confirmPrompt)) return;

    setIsConfirmingReceipt(true);
    try {
      let res = null;
      try {
        res = await apiClient.post(`/api/v1/orders/${orderId}/confirm-receipt`, {
          orderId,
          sellerId: order.sellerId
        });
      } catch (e1) {
        res = await apiClient.post(`/api/v1/payai/orders/${orderId}/confirm-receipt`, {
          orderId,
          sellerId: order.sellerId
        });
      }

      if (res?.data?.success) {
        toast.success('🎉 Delivery Confirmed! Escrow released to seller in Naira (NGN).');
        onOrderUpdated && onOrderUpdated();
      } else {
        toast.error(res?.data?.message || 'Could not confirm delivery.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delivery confirmation error.');
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  // Combine shipments with remote lookup result if any
  const displayShipments = remoteOrderResult
    ? [remoteOrderResult, ...shipments.filter(s => s.orderNumber !== remoteOrderResult.orderNumber && s.trackingNumber !== remoteOrderResult.trackingNumber)]
    : shipments;

  const filteredShipments = displayShipments.filter(s => {
    if (!searchCode.trim()) return true;
    const q = searchCode.toLowerCase();
    return (
      s.orderNumber?.toLowerCase().includes(q) ||
      s.trackingNumber?.toLowerCase().includes(q) ||
      s.itemTitle?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Waybill / Tracking Search Bar & Controls */}
      <div className="max-w-2xl mx-auto min-w-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRemoteLookup();
              }}
              placeholder="Search Order Number, DHL Waybill, or product name..."
              className="w-full neu-input pl-11 pr-10 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-mono"
            />
            {searchCode && (
              <button
                onClick={() => {
                  setSearchCode('');
                  setRemoteOrderResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-3 rounded-2xl neu-button text-[var(--text-muted)] hover:text-blue-500 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              title="Refresh tracking status"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-500' : ''} />
            </button>
          )}
        </div>

        {/* Quick Sample Waybill Badges */}
        {shipments.length > 0 && (
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto min-w-0 max-w-full hide-scrollbar text-xs shrink-0">
            <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">
              Quick Lookup:
            </span>
            {shipments.slice(0, 4).map((s) => (
              <button
                key={s.trackingNumber || s.orderNumber || s.id}
                onClick={() => setSearchCode(s.trackingNumber || s.orderNumber)}
                className={`neu-card px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors shrink-0 cursor-pointer ${
                  searchCode === s.trackingNumber || searchCode === s.orderNumber
                    ? 'border-blue-500 text-blue-600 font-bold'
                    : 'text-[var(--text-muted)] hover:text-blue-600'
                }`}
              >
                {s.trackingNumber || s.orderNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders List with 7-Step Milestones */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {filteredShipments.length === 0 ? (
          <div className="neu-panel p-10 text-center text-[var(--text-muted)] rounded-3xl">
            <Box size={36} className="opacity-30 mb-2 mx-auto text-blue-500" />
            <h4 className="font-bold text-sm text-[var(--text-main)]">No shipments matching query</h4>
            <p className="text-xs mt-1">Try another tracking code or search the global carrier network.</p>

            {searchCode.trim().length >= 4 && (
              <div className="mt-4">
                <button
                  onClick={handleRemoteLookup}
                  disabled={remoteSearching}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Search size={13} className={remoteSearching ? 'animate-spin' : ''} />
                  <span>{remoteSearching ? 'Searching Network...' : `Query Network for "${searchCode.trim()}"`}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredShipments.map((shipment) => {
            const currentStepIdx = getStepProgressIndex(shipment.status || shipment.fulfillmentStatus || 'CONFIRMED');
            const isCancelled = (shipment.status || shipment.fulfillmentStatus) === 'CANCELLED';
            const orderKey = shipment.trackingNumber || shipment.orderNumber || shipment.id;
            const isExpanded = !!expandedOrders[orderKey];

            return (
              <div
                key={orderKey}
                className="neu-card p-5 sm:p-6 rounded-[2rem] border border-[var(--border-color)] hover:border-blue-500/30 transition-all shadow-sm"
              >
                {/* Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)] mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm ${
                        isCancelled
                          ? 'bg-red-500 text-white'
                          : currentStepIdx >= 5
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {shipment.status || 'IN_TRANSIT'}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {shipment.orderNumber}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-xs sm:max-w-md">
                        • {shipment.itemTitle || (shipment.items?.[0]?.title ? `${shipment.items[0].title}${shipment.items.length > 1 ? ` (+${shipment.items.length - 1} items)` : ''}` : 'W-Commerce Order')}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                      Carrier: <strong>{shipment.carrier || shipment.carrierName || 'GIG Logistics Express'}</strong> • ETA: <strong>{shipment.eta || '2-4 Days'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="neu-card-pressed px-3.5 py-1.5 rounded-full flex items-center justify-between gap-2.5 shadow-inner">
                      <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {shipment.trackingNumber || shipment.orderNumber}
                      </span>
                      <button
                        onClick={() => copyText(shipment.trackingNumber || shipment.orderNumber, 'Waybill')}
                        className="p-1 text-gray-400 hover:text-blue-500 cursor-pointer"
                        title="Copy Waybill"
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => toggleExpand(orderKey)}
                      className="p-2 rounded-full neu-button text-[var(--text-muted)] hover:text-blue-500 cursor-pointer"
                      title={isExpanded ? 'Hide checkpoints' : 'Show checkpoints log'}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Optional Items Preview Strip */}
                {Array.isArray(shipment.items) && shipment.items.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 overflow-x-auto hide-scrollbar py-1">
                    {shipment.items.slice(0, 4).map((it, idx) => {
                      const itemTitle = (it.title && it.title !== 'W-Commerce Direct Order') ? it.title : (shipment.itemTitle || it.title || 'W-Commerce Item');
                      const rawMedia = it.imageUrl || it.image || '';
                      const resolvedImg = resolveProductImage(it, itemTitle, it.category || shipment.category || '');
                      const isVideo = isVideoUrl(rawMedia) || isVideoUrl(resolvedImg);
                      const mediaSrc = getImageUrl(rawMedia || resolvedImg);

                      return (
                        <div key={idx} className="flex items-center gap-2 bg-black/5 dark:bg-white/[0.04] p-1.5 rounded-xl border border-[var(--border-color)] text-xs shrink-0">
                          {isVideo ? (
                            <video
                              src={mediaSrc}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={resolvedImg}
                              alt={itemTitle}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=200&q=80';
                              }}
                            />
                          )}
                          <div className="max-w-[150px] truncate">
                            <p className="font-bold truncate text-[11px] text-[var(--text-main)]">{itemTitle}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">Qty: {it.quantity || 1} • {formatItemPrice(it.price, it.currency || shipment.currency)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {shipment.items.length > 4 && (
                      <span className="text-xs font-bold text-[var(--text-muted)] px-2">+{shipment.items.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* 7-Step Visual Milestone Timeline */}
                <div className="py-4 mb-4 overflow-x-auto min-w-0 max-w-full hide-scrollbar">
                  <div className="min-w-[620px] px-2">
                    <div className="relative flex items-center justify-between">
                      {/* Connecting Line */}
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0" />
                      <div
                        className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, (currentStepIdx / (MILESTONES.length - 1)) * 100))}%`
                        }}
                      />

                      {MILESTONES.map((m, idx) => {
                        const isDone = currentStepIdx > idx;
                        const isCurrent = currentStepIdx === idx;
                        const isPending = currentStepIdx < idx;

                        return (
                          <div key={m.id} className="relative z-10 flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition-all shadow-md ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : isCurrent
                                ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                            }`}>
                              {isDone ? <Check size={13} /> : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1.5 font-bold whitespace-nowrap text-center ${
                              isCurrent ? 'text-blue-600 dark:text-blue-400 font-black' : isDone ? 'text-[var(--text-main)]' : 'text-gray-400'
                            }`}>
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Origin to Destination Banner */}
                <div className="neu-panel p-3.5 rounded-2xl mb-4 flex items-center justify-between text-xs gap-3">
                  <div className="text-center sm:text-left min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Origin Hub</span>
                    <span className="font-bold text-xs truncate block text-[var(--text-main)]" title={shipment.origin}>
                      {shipment.origin || 'Merchant Hub (NG)'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center px-2 shrink-0">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                      {shipment.carrier || shipment.carrierName || 'GIG Logistics Express'}
                    </span>
                    <div className="w-16 sm:w-28 h-0.5 bg-blue-500/40 relative my-1">
                      <Plane size={12} className="text-blue-600 dark:text-blue-400 absolute -top-1.5 left-1/2 -translate-x-1/2 animate-pulse" />
                    </div>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Escrow Protected</span>
                  </div>

                  <div className="text-center sm:text-right min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Destination</span>
                    <span className="font-bold text-xs truncate block text-[var(--text-main)]" title={shipment.destination}>
                      {shipment.destination || 'Buyer Destination'}
                    </span>
                  </div>
                </div>

                {/* Granular Checkpoints Log (Expandable) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="neu-panel p-4 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Truck size={14} className="text-blue-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                            Fulfillment Event History
                          </span>
                        </div>
                        {Array.isArray(shipment.checkpoints) && shipment.checkpoints.length > 0 ? (
                          <div className="space-y-2.5">
                            {shipment.checkpoints.map((cp, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-3 text-xs">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[var(--text-main)]">
                                      {cp.label || cp.status}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                      {cp.timestamp ? new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                                    </span>
                                  </div>
                                  {cp.note && (
                                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{cp.note}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)] py-2">
                            Package tracked via <strong>{shipment.carrier || 'Standard Courier'}</strong>. Active milestone: <em>{shipment.status}</em>.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Order Action Buttons: Ask PayAI, Cancel, Return */}
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2">
                    {onAskAI && (
                      <button
                        onClick={() => onAskAI(shipment)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 neu-card hover:bg-blue-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Ask PayAI in AI Shopper tab about this package"
                      >
                        <MessageSquare size={13} />
                        <span>Ask PayAI</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!isCancelled && shipment.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleConfirmReceipt(shipment)}
                        disabled={isConfirmingReceipt}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Confirm package received and release escrow payout to seller in Naira (NGN)"
                      >
                        <CheckCircle2 size={13} />
                        <span>{isConfirmingReceipt ? 'Releasing...' : 'Confirm Delivery & Release Escrow'}</span>
                      </button>
                    )}

                    {!isCancelled && currentStepIdx <= 2 && (
                      <button
                        onClick={() => {
                          setSelectedOrder(shipment);
                          setCancelModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 neu-card hover:bg-red-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Ban size={13} />
                        <span>Request Cancellation</span>
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        onClick={() => {
                          setSelectedOrder(shipment);
                          setReturnModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--text-main)] neu-card hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>Initiate Return</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CANCELLATION REASON MODAL */}
      <AnimatePresence>
        {cancelModalOpen && selectedOrder && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setCancelModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md neu-panel p-6 rounded-[2rem] bg-[var(--bg-primary)] border border-red-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={18} />
                  <h4 className="font-bold text-sm">Request Order Cancellation</h4>
                </div>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="w-7 h-7 rounded-full neu-button text-gray-400 hover:text-red-500 flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-3">
                Order <strong>{selectedOrder.orderNumber || selectedOrder.id}</strong> has not departed fulfillment and is eligible for a full refund back to your original payment funding source.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                  Reason for Cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full neu-input py-2 px-3 rounded-xl text-xs bg-[var(--bg-secondary)]"
                >
                  <option value="Changed mind / found cheaper alternative">Changed mind / found cheaper alternative</option>
                  <option value="Ordered wrong item or variant">Ordered wrong item or variant</option>
                  <option value="Delivery time too long">Delivery time too long</option>
                  <option value="Other customer reason">Other customer reason</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation & Refund'}
                </button>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl neu-card text-xs font-bold cursor-pointer"
                >
                  Keep Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RETURN INITIATION MODAL */}
      <AnimatePresence>
        {returnModalOpen && selectedOrder && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setReturnModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md neu-panel p-6 rounded-[2rem] bg-[var(--bg-primary)] border border-blue-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-blue-600">
                  <RotateCcw size={18} />
                  <h4 className="font-bold text-sm">Initiate Return</h4>
                </div>
                <button
                  onClick={() => setReturnModalOpen(false)}
                  className="w-7 h-7 rounded-full neu-button text-gray-400 hover:text-red-500 flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs mb-3 space-y-1">
                <strong>W-Commerce Buyer Protection Policy:</strong>
                <p className="text-[11px] leading-relaxed">
                  Items can be returned within 14 days of receipt. Drop off your parcel at any regional W-Commerce hub or request courier pickup.
                </p>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                  Reason for Return:
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full neu-input py-2 px-3 rounded-xl text-xs bg-[var(--bg-secondary)]"
                >
                  <option value="Item not as described">Item not as described</option>
                  <option value="Defective or damaged during transit">Defective or damaged during transit</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Missing parts or accessories">Missing parts or accessories</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                  Additional Details (Optional):
                </label>
                <textarea
                  value={returnDetails}
                  onChange={(e) => setReturnDetails(e.target.value)}
                  rows={2}
                  placeholder="Describe condition or specific defect..."
                  className="w-full neu-input p-2.5 rounded-xl text-xs bg-[var(--bg-secondary)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmReturn}
                  disabled={isSubmittingReturn}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReturn ? 'Authorizing Return...' : 'Submit Return Authorization'}
                </button>
                <button
                  onClick={() => setReturnModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl neu-card text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
