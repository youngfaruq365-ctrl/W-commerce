import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingBag, Trash2, ShieldCheck, CheckCircle2, ArrowRight,
  Plane, Sparkles, RefreshCw, AlertCircle, Plus, Minus, Tag, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../utils/apiClient';
import { decodeHtml, resolveProductImage, isVideoUrl, getImageUrl } from '../../utils/imageHelpers';

const FX_RATE = 1480;

export default function PayAICartDrawer({
  isOpen,
  onClose,
  cart,
  sessionId,
  destinationCountry = 'NG',
  formatLocalPrice,
  onProceedToCheckout,
  onRefreshCart
}) {
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [quote, setQuote] = useState(null);

  // Strict user directive: Only native W-Commerce products appear in the cart!
  const rawItems = cart?.items || [];
  const items = rawItems.filter(item => {
    const p = (item.provider || '').toLowerCase();
    // Exclude third-party external stores (Amazon, AliExpress, eBay, ASOS)
    return p === 'w-commerce' || p === 'wcommerce' || p === 'native' || !['amazon', 'aliexpress', 'ebay', 'asos'].includes(p);
  });

  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // Helper to format dual currency: USD total + NGN equivalent
  const formatDualPrice = (usdAmount) => {
    const usd = Number(usdAmount) || 0;
    const ngn = Math.round(usd * FX_RATE);
    return `$${usd.toFixed(2)} (~₦${ngn.toLocaleString()} NGN)`;
  };

  // Auto-fetch or calculate landed cost quote when cart items change
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setQuote(null);
      return;
    }

    async function fetchQuote() {
      setIsCalculatingQuote(true);
      try {
        const res = await apiClient.post('/api/v1/payai/quotes', {
          cartId: cart?.id,
          items: items.map(i => ({
            title: i.title,
            price: Number(getItemUnitPriceUSD(i).toFixed(2)),
            quantity: Number(i.quantity) || 1,
            currency: 'USD',
            category: i.category || 'general',
            provider: 'w-commerce',
            isNative: true
          })),
          marketCode: 'W_COMMERCE_DIRECT',
          targetCurrency: 'NGN'
        });

        if (res.data?.success && res.data.quote) {
          setQuote(res.data.quote);
        }
      } catch (err) {
        console.debug('PayAI W-Commerce quote notice:', err.message);
      } finally {
        setIsCalculatingQuote(false);
      }
    }

    fetchQuote();
  }, [isOpen, items.length, cart?.id]);

  const handleUpdateQuantity = async (item, delta) => {
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      handleRemoveItem(item.id);
      return;
    }
    try {
      await apiClient.post('/api/v1/payai/cart/items', {
        sessionId,
        item: {
          ...item,
          quantity: delta
        }
      });
      onRefreshCart && onRefreshCart();
    } catch (err) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await apiClient.delete(`/api/v1/payai/cart/items/${itemId}`, {
        data: { cartId: cart?.id }
      });
      toast.success('Item removed from PayAI W-Commerce Cart');
      onRefreshCart && onRefreshCart();
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Clear all items from your PayAI W-Commerce Cart?')) return;
    try {
      await apiClient.post('/api/v1/payai/cart/clear', { cartId: cart?.id });
      toast.success('PayAI W-Commerce Cart cleared');
      onRefreshCart && onRefreshCart();
    } catch (err) {
      toast.error('Failed to clear cart');
    }
  };

  // Helper to safely resolve item unit price in USD regardless of NGN/USD raw confusion
  const getItemUnitPriceUSD = (item) => {
    const raw = Number(item.price) || 0;
    const curr = (item.currency || 'USD').toUpperCase();
    if (raw >= 500) {
      return raw / FX_RATE;
    }
    if (curr === 'NGN') {
      return raw > 50 ? raw / FX_RATE : raw;
    }
    return raw;
  };

  // Calculations adhering to directives:
  // Domestic threshold: ₦35,000; International threshold: $150
  const isDomestic = destinationCountry === 'NG';
  const itemsSubtotalUSD = items.reduce((sum, item) => {
    const unitPrice = getItemUnitPriceUSD(item);
    return sum + (unitPrice * (Number(item.quantity) || 1));
  }, 0);
  const itemsSubtotalNGN = Math.round(itemsSubtotalUSD * FX_RATE);

  const isFreeShipping = isDomestic 
    ? itemsSubtotalNGN >= 35000 
    : itemsSubtotalUSD >= 150;

  const standardShippingUSD = isDomestic ? 3.50 : 16.50;
  const shippingUSD = isFreeShipping ? 0 : standardShippingUSD;
  const shippingNGN = Math.round(shippingUSD * FX_RATE);

  const serviceFeeUSD = isDomestic ? 0.99 : 2.99;
  const totalLandedUSD = Number((itemsSubtotalUSD + shippingUSD + serviceFeeUSD).toFixed(2));
  const totalLandedNGN = Math.round(totalLandedUSD * FX_RATE);

  const displayQuote = quote || {
    subtotal: itemsSubtotalUSD,
    shipping: shippingUSD,
    serviceFee: serviceFeeUSD,
    total: totalLandedUSD,
    quoteNumber: `WCOM-PAYPAL-${Date.now().toString().slice(-6)}`,
    itemsSubtotalNGN,
    shippingNGN,
    totalNGN: totalLandedNGN
  };

  const handleCheckoutClick = () => {
    if (items.length === 0) {
      toast.error('Your PayAI W-Commerce Cart is empty');
      return;
    }
    onProceedToCheckout({
      ...displayQuote,
      total: totalLandedUSD,
      totalNGN: totalLandedNGN,
      itemsSubtotalUSD,
      itemsSubtotalNGN,
      shippingUSD,
      shippingNGN,
      isDomestic,
      isFreeShipping
    });
  };

  // Helper to extract negotiated discount details from item
  const getNegotiatedDetails = (item) => {
    if (item.offerSnapshot) {
      try {
        const snap = typeof item.offerSnapshot === 'string' ? JSON.parse(item.offerSnapshot) : item.offerSnapshot;
        if (snap?.negotiated || snap?.discountPct) {
          return {
            isNegotiated: true,
            discountPct: snap.discountPct || 15,
            originalPrice: snap.originalPrice || null
          };
        }
      } catch (e) {}
    }
    if (item.negotiated || item.discountPct) {
      return {
        isNegotiated: true,
        discountPct: item.discountPct || 15,
        originalPrice: item.originalPrice || null
      };
    }
    return { isNegotiated: false, discountPct: 0, originalPrice: null };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[125] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full max-w-md h-full bg-[var(--bg-primary)] shadow-2xl flex flex-col border-l border-[var(--border-color)] overflow-hidden"
          >
            {/* Header: Exact Title & Subtitle as instructed */}
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                    PayAI W-Commerce Cart
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-black">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium leading-tight block">
                    W-Commerce Direct Purchases • Paid in USD via PayPal • Seller receives payout in Naira (NGN)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg text-xs font-semibold cursor-pointer"
                    title="Clear Cart"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full neu-button text-[var(--text-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Cart Items List: Only native W-Commerce items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {items.length === 0 ? (
                /* Empty state required by directive */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
                    <ShoppingBag size={32} />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">
                    Your PayAI W-Commerce Cart is empty.
                  </h4>
                  <p className="text-xs max-w-xs mt-1.5 leading-relaxed">
                    Search native W-Commerce products or negotiate with sellers to checkout with PayPal.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 neu-button-primary px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Browse W-Commerce Stores
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const qty = Number(item.quantity) || 1;
                  const unitPrice = getItemUnitPriceUSD(item);
                  const itemTotalUSD = unitPrice * qty;
                  const sellerName = item.sellerName || item.seller?.name || item.storeName || 'Alpha Tech Store';
                  const storeBadge = `W-COMMERCE • ${sellerName}`;
                  const { isNegotiated, discountPct, originalPrice } = getNegotiatedDetails(item);

                  return (
                    <div
                      key={item.id}
                      className="neu-card p-3 rounded-2xl flex gap-3 relative group border border-[var(--border-color)]"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                        {(() => {
                          const rawMedia = item.imageUrl || item.image || item.images?.[0]?.url || item.images?.[0];
                          if (isVideoUrl(rawMedia)) {
                            return (
                              <video
                                src={getImageUrl(rawMedia)}
                                className="w-full h-full object-cover rounded-lg"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            );
                          }
                          return (
                            <img
                              src={resolveProductImage(item)}
                              alt={decodeHtml(item.title)}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = resolveProductImage(item);
                              }}
                              className="max-h-full max-w-full object-contain"
                            />
                          );
                        })()}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        {/* W-Commerce Store Badge */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wide truncate max-w-[210px]">
                            {storeBadge}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-xs truncate leading-snug">
                          {decodeHtml(item.title)}
                        </h4>

                        {/* Dual Currency Price: USD total + NGN equivalent */}
                        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                          <span className="font-black text-xs text-blue-600 dark:text-blue-400">
                            {formatDualPrice(itemTotalUSD)}
                          </span>
                          {isNegotiated && originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ${(Number(originalPrice) * qty).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Negotiated Deal Badge */}
                        {isNegotiated && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
                            <Tag size={10} />
                            <span>🏷️ Negotiated Deal: -{discountPct}%</span>
                          </div>
                        )}

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--border-color)]/50">
                          <span className="text-[10px] text-[var(--text-muted)] font-semibold">Quantity:</span>
                          <div className="flex items-center gap-2 neu-card px-2 py-0.5 rounded-lg text-xs font-bold">
                            <button
                              onClick={() => handleUpdateQuantity(item, -1)}
                              className="text-gray-400 hover:text-blue-600 p-0.5 cursor-pointer"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-4 text-center font-black">{qty}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item, 1)}
                              className="text-gray-400 hover:text-blue-600 p-0.5 cursor-pointer"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Landed Cost Breakdown & Checkout Section */}
            {items.length > 0 && (
              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-md shrink-0 space-y-3">
                {/* Landed Cost Breakdown Card */}
                <div className="neu-card-pressed p-3.5 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]/70">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-500" />
                      W-Commerce Landed Cost Breakdown
                    </span>
                    {isCalculatingQuote && (
                      <span className="text-[10px] text-blue-500 flex items-center gap-1 animate-pulse">
                        <RefreshCw size={10} className="animate-spin" /> Live FX
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {/* W-Commerce Items Subtotal (USD + NGN) */}
                    <div className="flex justify-between items-baseline">
                      <span className="text-[var(--text-muted)]">W-Commerce Items Subtotal:</span>
                      <span className="font-bold text-right">
                        {formatDualPrice(itemsSubtotalUSD)}
                      </span>
                    </div>

                    {/* Shipping Fee or Free Shipping Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">
                        {isDomestic ? 'Domestic Doorstep Shipping:' : 'International Courier Shipping:'}
                      </span>
                      {isFreeShipping ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-black bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/20">
                          FREE SHIPPING
                        </span>
                      ) : (
                        <span className="font-bold">
                          {formatDualPrice(shippingUSD)}
                        </span>
                      )}
                    </div>

                    {/* Free shipping threshold hint */}
                    {!isFreeShipping && (
                      <div className="text-[10px] text-[var(--text-muted)] italic">
                        {isDomestic 
                          ? `💡 Free domestic shipping on orders over ₦35,000 (add ₦${Math.max(0, 35000 - itemsSubtotalNGN).toLocaleString()})`
                          : `💡 Free international shipping on orders over $150 (add $${Math.max(0, 150 - itemsSubtotalUSD).toFixed(2)})`}
                      </div>
                    )}

                    {/* Service Fee */}
                    <div className="flex justify-between items-baseline">
                      <span className="text-[var(--text-muted)]">PayAI Escrow & Handling:</span>
                      <span className="font-bold">{formatDualPrice(serviceFeeUSD)}</span>
                    </div>

                    {/* Total Landed Cost (USD) with NGN equivalent */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-baseline">
                      <div>
                        <span className="font-black text-xs text-[var(--text-main)] block">
                          Total Landed Cost:
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Seller Naira Payout Guaranteed
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-base text-blue-600 dark:text-blue-400 block">
                          ${totalLandedUSD.toFixed(2)} USD
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-black">
                          ≈ ₦{totalLandedNGN.toLocaleString()} NGN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Directive Checkout Button: APPROVE & CHECKOUT VIA PAYPAL */}
                <button
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>APPROVE & CHECKOUT VIA PAYPAL</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
