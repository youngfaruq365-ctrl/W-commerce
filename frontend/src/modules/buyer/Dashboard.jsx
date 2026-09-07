import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingBag, Heart, Wallet, Star, ChevronRight, Package, Clock, TrendingUp, Gift, Zap, Eye, Plus, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { WCard, WButton, WBadge, WSkeleton } from '../../design/components';
import { apiClient } from '../../utils/apiClient';
import { ROUTES } from '../../constants/routes';

const statusColors = {
  'Delivered': 'text-emerald-400 bg-emerald-400/10',
  'In Transit': 'text-blue-400 bg-blue-400/10',
  'Processing': 'text-amber-400 bg-amber-400/10',
  'Cancelled': 'text-red-400 bg-red-400/10',
  'PENDING': 'text-amber-400 bg-amber-400/10',
  'PROCESSING': 'text-blue-400 bg-blue-400/10',
  'SHIPPED': 'text-purple-400 bg-purple-400/10',
  'DELIVERED': 'text-emerald-400 bg-emerald-400/10'
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [state, setState] = useState({
    status: 'loading', // idle, loading, success, error, retrying
    data: null,
    error: null
  });

  const fetchDashboard = async (isRetry = false) => {
    setState(s => ({ ...s, status: isRetry ? 'retrying' : 'loading' }));
    try {
      const response = await apiClient.get('/api/v1/user/dashboard');
      if (response.data.success) {
        setState({ status: 'success', data: response.data, error: null });
      } else {
        setState({ status: 'error', data: null, error: response.data.message || 'Failed to load dashboard' });
      }
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message || 'Failed to connect to server' });
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (state.status === 'error' || state.status === 'retrying') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold">Unable to load dashboard</h2>
          <p className="text-[var(--text-muted)]">{state.error}</p>
          <WButton 
            variant="primary" 
            onClick={() => fetchDashboard(true)}
            icon={<RefreshCw size={16} className={state.status === 'retrying' ? 'animate-spin' : ''} />}
          >
            {state.status === 'retrying' ? 'Retrying...' : 'Retry'}
          </WButton>
        </div>
      </div>
    );
  }

  const isLoading = state.status === 'loading';
  const data = state.data || {};
  const statsData = data.stats || {};
  const recentOrders = data.recentOrders || [];
  const recommendedProducts = data.recommendedProducts || [];

  const stats = [
    { label: 'Orders', value: isLoading ? 0 : statsData.orderCount, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Wishlist', value: isLoading ? 0 : statsData.wishlistCount, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Wallet', value: isLoading ? '$0.00' : '$' + parseFloat(statsData.walletBalance || 0).toFixed(2), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Points', value: isLoading ? 0 : statsData.points, icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Hero Greeting */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[var(--text-muted)] text-sm font-medium mb-1">{getGreeting()} 👋</p>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent">
                {data.buyer?.fullName || user?.name || 'Alex Johnson'}
              </h1>
              <p className="text-[var(--text-muted)] mt-2 text-sm">Here's what's happening with your account today.</p>
            </div>
            <div className="flex gap-3">
              <WButton onClick={() => navigate(ROUTES.FEED)} variant="ghost" size="sm" icon={<Eye size={14} />}>Browse</WButton>
              <WButton onClick={() => navigate(ROUTES.FEED)} variant="primary" size="sm" icon={<ShoppingBag size={14} />}>Shop Now</WButton>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--border-hover)] transition-all duration-200 hover:shadow-[var(--shadow-md)] cursor-pointer group">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <s.icon size={18} className={s.color} />
              </div>
              {isLoading ? <WSkeleton className="h-7 w-20 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
              <p className="text-[var(--text-muted)] text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Package size={18} className="text-[var(--text-muted)]" /> Recent Orders</h2>
              <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">View all <ChevronRight size={14} /></button>
            </div>
            <div className="space-y-3">
              {isLoading ? [1,2,3].map(i => <WSkeleton key={i} className="h-20 w-full rounded-2xl" />) :
                recentOrders.length === 0 ? (
                  <div className="text-center p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] text-[var(--text-muted)]">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                    <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="sm" className="mt-4">Start Shopping</WButton>
                  </div>
                ) :
                recentOrders.map(order => {
                  const firstItem = order.items?.[0]?.product;
                  return (
                    <div key={order.id}
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4 hover:border-[var(--border-hover)] transition-all duration-200 cursor-pointer group">
                      <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {firstItem?.images?.[0]?.url ? 
                          <img src={firstItem.images[0].url} alt="product" className="w-full h-full object-cover" />
                        : <span className="text-2xl">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate group-hover:text-white transition-colors">
                          {firstItem?.title || `Order ${order.id.substring(0,8)}`} 
                          {order.items?.length > 1 && ` + ${order.items.length - 1} more`}
                        </p>
                        <p className="text-[var(--text-muted)] text-sm">{order.id.substring(0,8)} · {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold">${parseFloat(order.totalAmount || 0).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] || statusColors.Processing}`}>{order.status}</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Wallet Quick Actions */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Wallet size={16} className="text-emerald-400" /> Wallet</h3>
              <div className="text-center py-3">
                {isLoading ? <WSkeleton className="h-10 w-32 mx-auto" /> : <p className="text-3xl font-black">${parseFloat(statsData.walletBalance || 0).toFixed(2)}</p>}
                <p className="text-[var(--text-muted)] text-sm mt-1">Available Balance</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="sm" fullWidth><Plus size={12} />Top Up</WButton>
                <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="sm" fullWidth>Transfer</WButton>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-2">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-[var(--text-muted)]" /> Quick Links</h3>
              {['Track Order', 'Return Request', 'Contact Support', 'Referral Center'].map(link => (
                <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  key={link} className="w-full text-left flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--accent-gray-glow)] transition-colors text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  {link} <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended For You */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} className="text-[var(--text-muted)]" /> Recommended For You</h2>
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm flex items-center gap-1 transition-colors">See all <ArrowRight size={14} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? [1,2,3,4].map(i => <WSkeleton key={i} className="h-48 w-full rounded-2xl" />) :
              recommendedProducts.length === 0 ? (
                <div className="col-span-full text-center p-8 bg-[var(--bg-card)] rounded-2xl text-[var(--text-muted)]">
                  <p>Check back later for recommendations</p>
                </div>
              ) :
              recommendedProducts.map(item => (
              <div key={item.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer group">
                <div className="h-32 bg-[var(--bg-tertiary)] flex items-center justify-center relative overflow-hidden">
                  {item.images?.[0]?.url ? 
                    <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover" />
                  : <span className="text-4xl">🛍️</span>}
                  {item.badge && (
                    <span className="absolute top-2 left-2 text-xs bg-[var(--text-main)] text-[var(--bg-primary)] px-2 py-0.5 rounded-full font-bold">{item.badge}</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate group-hover:text-white transition-colors">{item.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold">${parseFloat(item.price).toFixed(2)}</p>
                    <span className="text-xs text-amber-400 flex items-center gap-0.5"><Star size={11} fill="currentColor" />{item.averageRating || 5.0}</span>
                  </div>
                  <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="xs" fullWidth className="mt-2">Add to Cart</WButton>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
