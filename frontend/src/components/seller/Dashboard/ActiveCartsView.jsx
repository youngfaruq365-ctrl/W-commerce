import React, { useState } from 'react';
import { ShoppingCart, MessageSquare, Tag, X, Send, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// ─── Send Offer Modal ─────────────────────────────────────────────────────────
const SendOfferModal = ({ cartGroup, onClose }) => {
  const [discount, setDiscount] = useState(10);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const discountedTotal = cartGroup.totalValue * (1 - discount / 100);

  const handleSend = async () => {
    setSending(true);
    try {
      // Send via messaging API — compose an offer message to the buyer
      const offerText = `🎁 *Special Offer Just for You!*\n\nHi ${cartGroup.buyer.fullName?.split(' ')[0] || 'there'},\n\nI noticed you have items in your cart worth ₦${cartGroup.totalValue.toLocaleString()}. I'd like to offer you a *${discount}% discount* — pay only ₦${Math.round(discountedTotal).toLocaleString()}!\n\n${note ? `📝 ${note}\n\n` : ''}This offer is valid for 24 hours. Reply to claim it! 🚀`;

      await axios.post('/api/v1/messages/send', {
        recipientId: cartGroup.buyer.id,
        content: offerText,
      });
      setSent(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {sent ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <CheckCircle size={56} className="text-emerald-500" />
            </motion.div>
            <h3 className="text-xl font-extrabold text-black">Offer Sent!</h3>
            <p className="text-sm text-gray-500">Your special offer has been sent to {cartGroup.buyer.fullName}.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-black text-lg">Send a Special Offer</h3>
                <p className="text-xs text-gray-400">to {cartGroup.buyer.fullName}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              {/* Buyer + Cart summary */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm shrink-0">
                  {cartGroup.buyer.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-black text-sm">{cartGroup.buyer.fullName}</p>
                  <p className="text-xs text-gray-400">{cartGroup.items.length} item{cartGroup.items.length !== 1 ? 's' : ''} in cart</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Cart value</p>
                  <p className="font-extrabold text-black">₦{cartGroup.totalValue.toLocaleString()}</p>
                </div>
              </div>

              {/* Discount slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-black">Discount</label>
                  <span className="text-lg font-extrabold text-indigo-600">{discount}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Discounted price preview */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-500 font-semibold">Buyer pays</p>
                  <p className="text-2xl font-extrabold text-indigo-700">₦{Math.round(discountedTotal).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">₦{cartGroup.totalValue.toLocaleString()}</p>
                  <p className="text-sm font-bold text-emerald-600">Save ₦{Math.round(cartGroup.totalValue - discountedTotal).toLocaleString()}</p>
                </div>
              </div>

              {/* Personal note */}
              <div>
                <label className="text-sm font-bold text-black mb-1.5 block">Personal note <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Just for you! This deal expires in 24 hours..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {sending ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
const ActiveCartsView = ({ activeCarts = [], onMessageBuyer, onSendOffer }) => {
  const [offerTarget, setOfferTarget] = useState(null);

  if (!activeCarts || activeCarts.length === 0) {
    return (
      <div className="bg-white border border-[var(--border-color)] p-12 rounded-xl text-center min-h-[600px] flex flex-col items-center justify-center">
        <ShoppingCart size={48} className="text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-black mb-2">No Active Carts</h3>
        <p className="text-[var(--text-muted)] text-sm">When buyers add your products to their carts, they will appear here.</p>
      </div>
    );
  }

  // Group cart items by buyer
  const groupedCarts = activeCarts.reduce((acc, item) => {
    const buyerId = item.cart?.user?.id;
    if (!buyerId) return acc;
    if (!acc[buyerId]) {
      acc[buyerId] = {
        buyer: item.cart.user,
        items: [],
        totalValue: 0,
        updatedAt: item.cart.updatedAt
      };
    }
    acc[buyerId].items.push(item);
    acc[buyerId].totalValue += (Number(item.product?.price || 0) * item.quantity);
    return acc;
  }, {});

  const cartsList = Object.values(groupedCarts).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const handleMessage = (cartGroup) => {
    if (onMessageBuyer) {
      onMessageBuyer(cartGroup.buyer);
    }
  };

  const handleOffer = (cartGroup) => {
    setOfferTarget(cartGroup);
  };

  return (
    <>
      <AnimatePresence>
        {offerTarget && (
          <SendOfferModal cartGroup={offerTarget} onClose={() => setOfferTarget(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-black mb-2">Active &amp; Abandoned Carts</h1>
            <p className="text-[var(--text-muted)] text-sm">Monitor buyers who have added your items to their cart. Reach out to close the sale.</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-extrabold text-indigo-700">{cartsList.length}</p>
            <p className="text-xs text-indigo-400 font-semibold">Active Buyers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cartsList.map((cartGroup, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white border border-[var(--border-color)] rounded-xl p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4 border-b border-[var(--border-color)] pb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {cartGroup.buyer?.avatarUrl || cartGroup.buyer?.profileImage ? (
                    <img src={cartGroup.buyer?.avatarUrl || cartGroup.buyer?.profileImage} alt={cartGroup.buyer?.fullName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-gray-500">{cartGroup.buyer?.fullName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-black text-sm truncate">{cartGroup.buyer?.fullName || 'Guest'}</h4>
                  <p className="text-xs text-[var(--text-muted)]">Updated {new Date(cartGroup.updatedAt).toLocaleDateString()}</p>
                </div>
                {/* Recency badge */}
                {(() => {
                  const hoursAgo = (Date.now() - new Date(cartGroup.updatedAt)) / 3600000;
                  return hoursAgo < 24 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">Active</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full shrink-0">Abandoned</span>
                  );
                })()}
              </div>

              <div className="space-y-3 mb-4 max-h-[150px] overflow-y-auto pr-1">
                {cartGroup.items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded shrink-0 overflow-hidden">
                      {item.product?.images?.[0]?.url && (
                        <img src={item.product.images[0].url} alt={item.product.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-black truncate">{item.product?.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">Qty: {item.quantity}</p>
                      <p className="text-xs font-bold text-black mt-1">₦{Number(item.product?.price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-4">
                <span className="text-sm font-medium text-gray-700">Total Potential:</span>
                <span className="font-extrabold text-black">₦{cartGroup.totalValue.toLocaleString()}</span>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-[var(--accent-gray,#f3f4f6)] text-black px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:opacity-80 transition-opacity"
                  onClick={() => handleMessage(cartGroup)}
                >
                  <MessageSquare size={14} /> Message
                </button>
                <button
                  className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-indigo-700 transition-colors"
                  onClick={() => handleOffer(cartGroup)}
                >
                  <Tag size={14} /> Send Offer
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ActiveCartsView;
