import React, { useState } from 'react';
import { History, Star, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../../../store/cartStore';

const HISTORY_STATUSES = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'];

const BuyerOrderHistoryTab = ({ orders = [], onLeaveReview }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const [isReordering, setIsReordering] = useState(false);
  const historyOrders = orders.filter(o => HISTORY_STATUSES.includes(o.status));

  if (historyOrders.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">Order History</h2>
        <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
          <History size={40} className="text-[var(--text-muted)] mb-4" />
          <h3 className="text-2xl font-bold text-black mb-2">No Order History</h3>
          <p className="text-[var(--text-muted)]">Past orders will appear here once delivered or completed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Order History</h2>
      <div className="space-y-4">
        {historyOrders.map(order => (
          <div key={order.id} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] opacity-75 hover:opacity-100 transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-black font-bold text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</span>
              <span className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-sm rounded-full border border-[var(--border-color)]">
                {order.status}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border border-[var(--border-color)]">
                <img
                  src={order.items?.[0]?.product?.images?.[0]?.url || 'https://placehold.co/100x100/111/333?text=No+Image'}
                  className="w-full h-full object-cover grayscale"
                  alt="product"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="font-bold text-[var(--text-muted)] line-clamp-1">
                  {order.items?.[0]?.product?.title || 'Unknown Product'}
                </p>
                <p className="text-sm font-bold mt-1 text-black">Total: ₦{parseFloat(order.totalAmount || 0).toFixed(2)}</p>
              </div>
            </div>
            {['DELIVERED', 'COMPLETED'].includes(order.status) && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-end gap-3">
                <button
                  onClick={async () => {
                    if (isReordering) return;
                    setIsReordering(true);
                    try {
                      for (const item of order.items || []) {
                        if (item.product) {
                          await addToCart(item.product.id, item.quantity);
                        }
                      }
                      navigate('/cart');
    } catch (err) {
                      // handle error
                    } finally {
                      setIsReordering(false);
                    }
                  }}
                  disabled={isReordering}
                  className="px-4 py-2 bg-[var(--accent-gray)] text-black rounded-lg hover:opacity-90 transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <ShoppingCart size={14} /> {isReordering ? 'Adding...' : 'Reorder All'}
                </button>
                <button
                  onClick={() => onLeaveReview(order)}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:border-yellow-500 hover:text-yellow-500 transition-all text-sm font-bold flex items-center gap-2"
                >
                  <Star size={14} /> Leave Review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuyerOrderHistoryTab;
