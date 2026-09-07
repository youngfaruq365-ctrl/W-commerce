import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, PackageCheck, MapPin } from 'lucide-react';
import { useBuyerStore } from '../../../../store/buyerStore';

/**
 * BuyerOverviewTab
 * Shows key stats + recent hub activity.
 * Subscribes to orders/wishlist from useBuyerStore.
 */
const BuyerOverviewTab = () => {
  const { orders = [], wishlist = [] } = useBuyerStore();
  const [stats, setStats] = useState({ activeEscrows: 0, totalSpent: 0, savedItems: 0, hubItems: 0 });

  useEffect(() => {
    let active = 0, spent = 0, hub = 0;
    const ACTIVE_STATUSES = ['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    orders.forEach(order => {
      if (ACTIVE_STATUSES.includes(order.status)) active += 1;
      if (['DELIVERED', 'COMPLETED'].includes(order.status)) spent += parseFloat(order.totalAmount || 0);
      if (order.isConsolidated && ['PROCESSING', 'SHIPPED'].includes(order.status)) hub += 1;
    });
    setStats({ activeEscrows: active, totalSpent: spent, savedItems: wishlist?.length || 0, hubItems: hub });
  }, [orders, wishlist]);

  const statCards = [
    { title: 'Active Escrows', value: stats.activeEscrows.toString(), color: 'text-[var(--accent-gray)]' },
    { title: 'Total Spent', value: `NGN ${stats.totalSpent.toFixed(2)}`, color: 'text-black' },
    { title: 'Saved Items', value: stats.savedItems.toString(), color: 'text-yellow-500' },
    { title: 'Hub Items', value: stats.hubItems.toString(), color: 'text-purple-500' },
  ];

  const hubOrders = orders.filter(o => o.isConsolidated).slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Buyer Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover-3d hover:border-[var(--accent-gray)] transition-colors">
            <h3 className="text-[var(--text-muted)] text-sm mb-2">{stat.title}</h3>
            <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Hub Activity */}
      <div className="mt-8 premium-glass p-6 rounded-xl border border-[var(--border-color)]">
        <h3 className="text-xl font-bold mb-4 border-b border-[var(--border-color)] pb-4">Recent Hub Activity</h3>
        <div className="space-y-4">
          {hubOrders.length > 0 ? hubOrders.map(order => (
            <div key={order.id} className="flex justify-between items-center p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg overflow-hidden border border-[var(--accent-gray)] flex items-center justify-center shadow-[0_0_10px_var(--accent-gray-dim)] flex-shrink-0">
                  {order.items?.[0]?.product?.images?.[0] ? (
                     <img src={order.items[0].product.images[0]?.url || order.items[0].product.images[0]} alt="product" className="w-full h-full object-cover" />
                  ) : (
                     <PackageCheck className="text-[var(--accent-gray)]" />
                  )}
                </div>
                <div>
                  <p className="font-bold">{order.items?.[0]?.product?.title || 'Consolidated Item'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <span className="text-[var(--text-muted)] text-sm">{order.status}</span>
            </div>
          )) : (
            <p className="text-[var(--text-muted)] text-sm">No recent hub activity.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerOverviewTab;
