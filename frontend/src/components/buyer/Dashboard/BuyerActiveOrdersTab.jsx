import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, MapPin, Truck } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { isVideoUrl, getImageUrl } from '@/utils/imageHelpers';

const ACTIVE_STATUSES = [
  'PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER',
  'PENDING_VERIFICATION', 'PAID', 'PACKED', 'CONFIRMED',
  'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
];

/**
 * BuyerActiveOrdersTab
 * Displays all in-flight orders. Receives handler callbacks from Dashboard shell
 * so modal state stays in one place.
 */
const BuyerActiveOrdersTab = ({
  orders = [],
  onTrack,
  onConfirmReceipt,
  onUploadProof,
  onViewReceipt,
  fileInputRef,
}) => {
  const navigate = useNavigate();
  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));

  if (activeOrders.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">Active Orders</h2>
        <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)]">
            <ShoppingBag size={40} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-2xl font-bold text-black mb-3">No Active Orders</h3>
          <p className="text-[var(--text-muted)] max-w-md">
            You don't have any orders currently being processed or shipped.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Active Orders</h2>
      <div className="space-y-4">
        {activeOrders.map(order => (
          <div key={order.id} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] transition-all hover:border-[var(--accent-gray)]">
            {/* Order Header */}
            <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[var(--accent-gray)] font-bold text-lg">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="px-4 py-2 bg-[var(--bg-tertiary)] text-black text-sm rounded-full border border-[var(--border-color)] font-bold tracking-wider">
                {order.status}
              </span>
            </div>

            {/* Order Items */}
            <div className="flex flex-col md:flex-row gap-6">
              {order.items?.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 h-24 bg-white rounded-lg overflow-hidden border border-[var(--border-color)]">
                    {(() => {
                      const media = item.product?.images?.[0]?.url || item.product?.images?.[0];
                      if (isVideoUrl(media)) {
                        return (
                          <video
                            src={getImageUrl(media)}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        );
                      }
                      return (
                        <img
                          src={media ? getImageUrl(media) : PLACEHOLDER_IMAGE}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                          alt="product"
                          loading="lazy"
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <p className="font-bold text-lg line-clamp-1">{item.product?.title}</p>
                    <p className="text-[var(--text-muted)] mt-1">Qty: {item.quantity} × ₦{item.priceAtTime || item.price}</p>
                    {item.variantOptions && (
                      <p className="text-sm text-gray-700 mt-1">{item.variantOptions}</p>
                    )}
                    {(item.product?.store?.location || item.product?.store?.country) && (
                      <p className="text-sm text-[var(--accent-gray)] mt-2 flex items-center gap-1 font-bold">
                        <MapPin size={14} />
                        {item.product.store.location || item.product.store.country}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Footer */}
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex flex-col">
                  <p className="text-[var(--text-muted)] text-xs">Total Amount</p>
                  <p className="text-xl font-extrabold text-[var(--text-main)]">₦{parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>
                {(order.paymentStatus === 'PAID' || ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) && (
                  <button
                    onClick={() => onViewReceipt(order)}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl shadow-sm hover:opacity-90 flex items-center gap-2 ml-4 cursor-pointer"
                  >
                    View Receipt
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {order.status !== 'PENDING' && (
                  <button
                    onClick={() => {
                      if (onTrack) onTrack(order.id);
                      navigate(`/payai?tab=tracking&orderId=${order.id}`);
                    }}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] font-bold rounded-xl hover:border-blue-500 hover:text-blue-500 transition-colors text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Track package in PayAI Live Radar"
                  >
                    <Truck size={14} />
                    <span>Track Order</span>
                  </button>
                )}
                {order.status === 'SHIPPED' && (
                  <button
                    onClick={() => onConfirmReceipt(order.id)}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl hover:brightness-110 transition-colors text-sm cursor-pointer shadow-sm"
                  >
                    Confirm Receipt
                  </button>
                )}
                {order.paymentStatus === 'AWAITING_PROOF' && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) onUploadProof(order.id, file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors text-sm"
                    >
                      Upload Proof
                    </button>
                  </>
                )}
                {order.paymentStatus === 'PROOF_SUBMITTED' && (
                  <span className="text-sm text-yellow-500 font-bold">Proof Submitted, Awaiting Approval</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuyerActiveOrdersTab;
