import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Palette, Settings, Bell, Search, TrendingUp, Users, DollarSign, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AnalyticsClient from '../lib/analyticsClient';
import { DashboardCard } from '../components/ui/DashboardCard';
import { DashboardGrid } from '../components/ui/DashboardGrid';
import { WSkeleton } from '../components/motion/WSkeleton';
import { WPageTransition } from '../components/motion/WPageTransition';
import { useOperationStore } from '../store/operationStore';
import { WGenerationExperience } from '../components/motion/WGenerationExperience';
import { useSellerStore } from '../store/sellerStore';
import { useAuthStore } from '../store/authStore';

export const SellerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { status: operationStatus, operation: currentOperation } = useOperationStore();
  const [metrics, setMetrics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const { user } = useAuthStore();
  const {
    products,
    orders,
    reviews,
    isLoading: storeLoading,
    fetchSellerProducts,
    fetchSellerOrders,
    fetchReviews,
  } = useSellerStore();

  // Load dashboard data
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    async function loadDashboard() {
      setIsLoading(true);
      setSalesLoading(true);
      const [perfRes, weeklyRes, salesRes] = await Promise.all([
        AnalyticsClient.getPerformanceMetrics(),
        AnalyticsClient.getWeeklySummary(),
        AnalyticsClient.getSalesByPeriod('7d'),
      ]);

      if (perfRes.success) setMetrics(perfRes.data);

      // Recent orders — only from real API, no fake fallback
      if (weeklyRes.success && weeklyRes.data?.recentOrders?.length > 0) {
        setRecentOrders(weeklyRes.data.recentOrders.map(o => ({
          id: `#${o.id.substring(0, 8).toUpperCase()}`,
          customer: o.buyer?.fullName || 'Guest',
          date: new Date(o.createdAt).toLocaleDateString(),
          total: o.items?.reduce((acc, i) => acc + (i.priceAtTime * i.quantity), 0) || 0,
          status: o.status,
        })));
      } else {
        setRecentOrders([]);
      }

      // Real sales chart data
      if (salesRes.success && salesRes.data) {
        setSalesData(salesRes.data);
      } else {
        setSalesData(null);
      }

      setIsLoading(false);
      setSalesLoading(false);
    }
    loadDashboard();
  }, [activeTab]);

  // Load products when on products tab
  useEffect(() => {
    if (activeTab === 'products') fetchSellerProducts();
  }, [activeTab]);

  // Load orders when on orders tab
  useEffect(() => {
    if (activeTab === 'orders') fetchSellerOrders();
  }, [activeTab]);

  // Load reviews when on reviews tab
  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab]);

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        activeTab === id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-black'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  const handleGenerateStore = async () => {
    const { start, update, complete, fail } = useOperationStore.getState();

    start({
      operation: 'store_generation',
      steps: [
        { id: 'identity', label: 'Analyzing brand identity' },
        { id: 'products', label: 'Processing inventory' },
        { id: 'structure', label: 'Building store structure' },
        { id: 'design', label: 'Applying aesthetic design' },
        { id: 'finalize', label: 'Finalizing storefront' },
      ],
      step: 'identity',
      message: 'Preparing your store...',
      progress: 0,
    });

    try {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const checkCancelled = () => {
        if (useOperationStore.getState().status === 'error') throw new Error('CANCELLED');
      };

      await wait(1000); checkCancelled();
      update({ step: 'identity', progress: 15, message: 'Analyzing brand identity...', estimatedRemaining: '12s' });

      await wait(2500); checkCancelled();
      update({ step: 'products', progress: 35, message: 'Processing inventory...', estimatedRemaining: '9s' });

      await wait(2000); checkCancelled();
      update({ step: 'structure', progress: 60, message: 'Building store structure...', estimatedRemaining: '6s' });

      await wait(2500); checkCancelled();
      update({ step: 'design', progress: 85, message: 'Applying aesthetic design...', estimatedRemaining: '3s' });

      await wait(1500); checkCancelled();
      update({ step: 'finalize', progress: 95, message: 'Finalizing storefront...', estimatedRemaining: '1s' });

      await wait(1500); checkCancelled();
      complete('Your store is ready to launch!');
    } catch (e) {
      if (e.message !== 'CANCELLED') {
        fail('An unexpected error occurred during generation.');
      }
    }
  };

  // Build real revenue chart from salesData
  const renderRevenueChart = () => {
    if (salesLoading) {
      return (
        <div className="flex-1 flex items-end justify-between gap-2 mt-4 pt-10 border-b border-gray-100 pb-4">
          {Array(7).fill(null).map((_, i) => (
            <WSkeleton key={i} className="w-full h-24 rounded-t-lg" />
          ))}
        </div>
      );
    }

    if (!salesData || Object.keys(salesData).length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-gray-400">
          <BarChart3 size={32} className="mb-3 opacity-30" />
          <p className="text-sm font-bold">No sales data yet</p>
          <p className="text-xs mt-1">Your revenue chart will appear here once customers place orders.</p>
        </div>
      );
    }

    const entries = Object.entries(salesData);
    const maxRevenue = Math.max(...entries.map(([, v]) => v.revenue), 1);

    return (
      <>
        <div className="flex-1 flex items-end justify-between gap-2 mt-4 pt-10 border-b border-gray-100 pb-4">
          {entries.map(([date, { revenue }], i) => {
            const heightPct = Math.max(4, (revenue / maxRevenue) * 100);
            return (
              <div
                key={i}
                className="w-full bg-black rounded-t-lg relative group transition-all hover:bg-gray-700"
                style={{ height: `${heightPct}%` }}
              >
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  ${revenue.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs font-bold text-gray-400 mt-4">
          {entries.map(([date], i) => (
            <span key={i}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Generation Overlay */}
      {currentOperation === 'store_generation' && operationStatus !== 'idle' && (
        <WGenerationExperience
          steps={useOperationStore.getState().steps}
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full flex flex-col z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-black text-xl">W</div>
          <div>
            <div className="font-black text-lg leading-none tracking-tight">Commerce OS</div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Merchant</div>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
          <SidebarItem icon={Package} label="Products" id="products" />
          <SidebarItem icon={ShoppingBag} label="Orders" id="orders" />
          <SidebarItem icon={BarChart3} label="Analytics" id="analytics" />
          <Link
            to="/seller-portal"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 hover:text-black transition-all"
          >
            <Palette size={18} /> Full Seller Portal
          </Link>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
              {(user?.fullName || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm leading-none truncate max-w-[120px]">{user?.fullName || 'Seller'}</div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{(user?.subscriptionTier || 'Basic').toLowerCase()} Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="relative w-96">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search orders, products, or customers..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center relative hover:bg-gray-100">
              <Bell size={18} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <Link
              to="/seller-portal"
              className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-full hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <ExternalLink size={14} /> Seller Portal
            </Link>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <WPageTransition key="dashboard">
                <h1 className="text-3xl font-black mb-8">Overview</h1>

                {/* Generate Store Promo */}
                <div className="bg-black text-white p-8 rounded-2xl mb-8 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#10b981]/20 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                      <Palette className="text-[#10b981]" /> Your Store
                    </h2>
                    <p className="text-gray-400 mb-6 max-w-md">Your storefront isn't published yet. Let our AI engine analyze your products and generate a beautiful, high-converting store.</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleGenerateStore}
                        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <span className="text-xl">✦</span> Generate My Store
                      </button>
                      <Link to="/seller-portal" className="px-6 py-3 text-white font-bold hover:text-gray-300 transition-colors">
                        Customize manually →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* KPI Cards */}
                <DashboardGrid className="mb-8">
                  <DashboardCard
                    title="Total Revenue"
                    value={isLoading ? <WSkeleton className="h-9 w-28" /> : `$${(metrics?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    iconColor="text-green-600"
                    iconBg="bg-green-50"
                    meta="All-time"
                    metaIcon={TrendingUp}
                    metaColor="text-green-500"
                  />

                  <DashboardCard
                    title="Orders"
                    value={isLoading ? <WSkeleton className="h-9 w-16" /> : (metrics?.totalOrders || 0)}
                    icon={ShoppingBag}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                    meta="Total"
                    metaIcon={TrendingUp}
                    metaColor="text-green-500"
                  />

                  <DashboardCard
                    title="Conversion Rate"
                    value={isLoading ? <WSkeleton className="h-9 w-24" /> : (metrics?.conversionRate || '0.00%')}
                    icon={BarChart3}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                    meta="Target 4%"
                    metaColor="text-gray-400"
                  />

                  <DashboardCard
                    title="Products Listed"
                    value={isLoading ? <WSkeleton className="h-9 w-16" /> : (metrics?.totalProducts || 0)}
                    icon={Package}
                    iconColor="text-orange-600"
                    iconBg="bg-orange-50"
                    meta="Active"
                    metaColor="text-gray-400"
                  />
                </DashboardGrid>

                {/* Charts & Orders Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Real Revenue Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="font-bold text-lg">Revenue Overview</h2>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Last 7 Days</span>
                    </div>
                    {renderRevenueChart()}
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="font-bold text-lg">Recent Orders</h2>
                      <button onClick={() => setActiveTab('orders')} className="text-sm font-bold text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map(i => <WSkeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                      ) : recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                          <ShoppingBag size={28} className="mb-2 opacity-30" />
                          <p className="text-sm font-bold">No orders yet</p>
                          <p className="text-xs mt-1">Orders will appear here once customers purchase your products.</p>
                        </div>
                      ) : recentOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                          <div>
                            <div className="font-bold text-sm">{order.customer}</div>
                            <div className="text-xs text-gray-500 font-medium">{order.id} · {order.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-sm">${order.total.toFixed(2)}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${order.status === 'PROCESSING' || order.status === 'PENDING' ? 'text-blue-500' : order.status === 'SHIPPED' ? 'text-orange-500' : 'text-green-500'}`}>
                              {order.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </WPageTransition>
            )}

            {/* ── PRODUCTS TAB ── */}
            {activeTab === 'products' && (
              <WPageTransition key="products">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black">Products</h1>
                  <Link to="/seller-portal" className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-full hover:opacity-90 flex items-center gap-2">
                    <ExternalLink size={14} /> Manage in Seller Portal
                  </Link>
                </div>
                {storeLoading ? (
                  <div className="space-y-4">{[1,2,3,4].map(i => <WSkeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package size={48} className="text-gray-200 mb-4" />
                    <h2 className="text-xl font-black text-gray-800 mb-2">No products yet</h2>
                    <p className="text-gray-500 max-w-sm mb-6">Create your first product listing to start selling on W-Commerce.</p>
                    <Link to="/seller-portal" className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:opacity-90">
                      Go to Seller Portal
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
                        <img src={p.images?.[0]?.url || '/placeholder.png'} alt={p.title} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{p.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.category} · Stock: {p.stock}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black">${Number(p.price).toFixed(2)}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${p.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </WPageTransition>
            )}

            {/* ── ORDERS TAB ── */}
            {activeTab === 'orders' && (
              <WPageTransition key="orders">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black">Orders</h1>
                  <Link to="/seller-portal" className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-full hover:opacity-90 flex items-center gap-2">
                    <ExternalLink size={14} /> Full Order Manager
                  </Link>
                </div>
                {storeLoading ? (
                  <div className="space-y-4">{[1,2,3].map(i => <WSkeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ShoppingBag size={48} className="text-gray-200 mb-4" />
                    <h2 className="text-xl font-black text-gray-800 mb-2">No orders yet</h2>
                    <p className="text-gray-500 max-w-sm">Orders will appear here once customers purchase your products.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 20).map(o => (
                      <div key={o.id} className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                        <div>
                          <div className="font-bold text-sm">#{o.id.substring(0, 8).toUpperCase()}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {o.buyer?.fullName || 'Guest'} · {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{o.items?.length || 0} item(s)</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black">${Number(o.totalAmount).toFixed(2)}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                            o.status === 'PENDING' ? 'text-yellow-500' :
                            o.status === 'PAID' || o.status === 'PROCESSING' ? 'text-blue-500' :
                            o.status === 'SHIPPED' ? 'text-orange-500' :
                            o.status === 'DELIVERED' || o.status === 'COMPLETED' ? 'text-green-500' :
                            'text-red-500'
                          }`}>
                            {o.status}
                          </div>
                        </div>
                      </div>
                    ))}
                    {orders.length > 20 && (
                      <Link to="/seller-portal" className="block text-center py-3 text-blue-600 font-bold text-sm hover:underline">
                        View all {orders.length} orders in Seller Portal →
                      </Link>
                    )}
                  </div>
                )}
              </WPageTransition>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && (
              <WPageTransition key="analytics">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black">Analytics</h1>
                  <Link to="/seller-portal" className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-full hover:opacity-90 flex items-center gap-2">
                    <ExternalLink size={14} /> Full Analytics Suite
                  </Link>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-200">
                  <BarChart3 size={48} className="text-gray-200 mb-4" />
                  <h2 className="text-xl font-black text-gray-800 mb-2">Advanced Analytics</h2>
                  <p className="text-gray-500 max-w-sm mb-6">Access detailed sales charts, customer insights, top products, and conversion funnels in the full Seller Portal.</p>
                  <Link to="/seller-portal" className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:opacity-90">
                    Open Seller Portal
                  </Link>
                </div>
              </WPageTransition>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
