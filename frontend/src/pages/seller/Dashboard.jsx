
import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { gxDelete } from '../../components/shared/ui/GXDialog';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart2, Activity, Package, AlertCircle, ShoppingBag, 
  Layout, MessageSquare, ShieldCheck, Zap, Users, 
  Box, Scale, UserCheck, Target, Star, Settings, 
  CreditCard, Truck, Menu, X, Plus, Trash2, Edit, Archive,
  Sparkles, CheckCircle, Loader2, Megaphone
} from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import AddProductModal from '../../components/seller/AddProductModal';
import EditProductModal from '../../components/seller/EditProductModal';
import RespondToRequestModal from '../../components/seller/RespondToRequestModal';
import RespondToDisputeModal from '../../components/seller/RespondToDisputeModal';
import AddProductStudio from '../../components/seller/Dashboard/AddProductStudio';
import PackingAnimationModal from '../../components/seller/PackingAnimationModal';
import ShippingAnimationModal from '../../components/seller/ShippingAnimationModal';
import DashboardSidebar from '../../components/seller/Dashboard/DashboardSidebar';
import DashboardHeader from '../../components/seller/Dashboard/DashboardHeader';
import AnalyticsView from '../../components/seller/Dashboard/AnalyticsView';
import OrdersView from '../../components/seller/Dashboard/OrdersView';
import InventoryView from '../../components/seller/Dashboard/InventoryView';
import WalletView from '../../components/seller/Dashboard/WalletView';
import MessagesView from '../../components/seller/Dashboard/MessagesView';
import VerificationView from '../../components/seller/Dashboard/VerificationView';
import GXSkeleton from '../../components/shared/ui/GXSkeleton';
import StoreUpgradeStudio from '../../components/seller/Dashboard/StoreUpgradeStudio';
import RequestFreightStudio from '../../components/seller/Dashboard/RequestFreightStudio';
import CreateFlashStudio from '../../components/seller/Dashboard/CreateFlashStudio';
// Design Studio removed
import ActiveCartsView from '../../components/seller/Dashboard/ActiveCartsView';

import PremiumUnlockModal from '../../components/PremiumUnlockModal';

// ── Error Boundary: prevents blank white screen on any render crash ───────────
class SellerDashboardErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[SellerDashboard] Render crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
          <div className="bg-white border border-red-200 rounded-2xl p-10 max-w-lg text-center shadow-xl">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Error</h2>
            <p className="text-slate-500 mb-6 text-sm">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SellerDashboard = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
    navigate('/login');
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [respondingDispute, setRespondingDispute] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedTierToUnlock, setSelectedTierToUnlock] = useState(null);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  
  const [portfolio, setPortfolio] = useState({ theme: 'Aura Modern', slug: '' });
  const [brandConfig, setBrandConfig] = useState({ primaryColor: '#d3d3d3', secondaryColor: '#1a1a1a', fontFamily: 'Inter', customCss: '' });
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '', accountNumber: '', accountName: '', routingNumber: '', bankCountry: ''
  });
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Subtabs removed to reduce bloat
  
  const [packingOrder, setPackingOrder] = useState(null);
  const [shippingOrder, setShippingOrder] = useState(null);
  const { 
    orders, products, storeConfig: fetchedStoreConfig, analytics, isLoading, error,
    alerts, messages, toPack, packed, disputes, buyers, buyerRequests, reviews, activeCarts,
    fetchSellerOrders, fetchSellerProducts, fetchStoreConfig, fetchAnalytics, 
    fetchAlerts, fulfillOrder,
    fetchMessages, fetchPackingOrders, fetchDisputes,
    fetchBuyers, fetchBuyerRequests, fetchReviews, fetchWalletSummary, fetchActiveCarts,
    deleteProduct, updateStoreConfig, packOrder, restoreProduct, unlockPremiumStore, approvePaymentProof, rejectPaymentProof,
    activeEngine, setActiveEngine
  } = useSellerStore();

  const storeConfig = fetchedStoreConfig || {};
  const setStoreConfig = (update) => {
    useSellerStore.setState((state) => ({ storeConfig: typeof update === 'function' ? update(state.storeConfig) : update }));
  };

  // Derive chart data from real analytics fetched by the store.
  // Falls back to a 4-week flat line so the chart renders nicely instead of broken axes.
  const performanceData = analytics?.monthlySales?.length > 0 ? analytics.monthlySales : [
    { name: 'Week 1', sales: 0, visits: 0 },
    { name: 'Week 2', sales: 0, visits: 0 },
    { name: 'Week 3', sales: 0, visits: 0 },
    { name: 'Week 4', sales: 0, visits: 0 }
  ];

  // Real-time socket events — refresh data when buyers interact
  useSocket({
    'order:new':         () => { fetchSellerOrders(); fetchPackingOrders(); fetchAnalytics(); },
    'order:updated':     () => { fetchSellerOrders(); fetchAnalytics(); },
    'dispute:new':       () => fetchDisputes(),
    'review:new':        () => fetchReviews(),
    'new_notification':  () => {},
  });

  React.useEffect(() => {
    fetchSellerProducts();
    fetchSellerOrders();
    fetchAnalytics();
    fetchAlerts();
    fetchMessages();
    fetchPackingOrders();
    fetchDisputes();
    fetchBuyers();
    fetchBuyerRequests();
    fetchReviews();
    fetchStoreConfig();
    fetchWalletSummary();
    fetchActiveCarts();
  }, []);

  React.useEffect(() => {
    if (fetchedStoreConfig) {
      setPortfolio(prev => ({
        ...prev,
        theme: fetchedStoreConfig.portfolioLayout || prev.theme,
        slug: fetchedStoreConfig.portfolioSlug || fetchedStoreConfig.storeName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || prev.slug,
        sellerTier: fetchedStoreConfig.sellerTier || 'Free'
      }));
      if (fetchedStoreConfig.portfolioConfig) {
        try {
          const parsed = JSON.parse(fetchedStoreConfig.portfolioConfig);
          // setBrandConfig handles ALL parsed settings (whatsapp, call, brand, etc.)
          // Do NOT call setStoreConfig here — it writes back to Zustand which changes
          // fetchedStoreConfig and causes an infinite re-render loop.
          setBrandConfig(parsed);
        } catch(e) {}
      }
    }
  }, [fetchedStoreConfig]);

  const handlePackSubmit = async () => {
    if (!packingOrder) return;
    setPackingOrder(null);
    showNotification('Order successfully packed.', 'success');
    fetchPackingOrders();
  };

  const handleShipSubmit = async () => {
    if (!shippingOrder) return;
    setShippingOrder(null);
    showNotification('Order shipped successfully.', 'success');
    fetchPackingOrders();
  };

  const commerceTabs = [
    { id: 'analytics', label: 'Analytics', iconName: 'seller.analytics' },
    { id: 'performance', label: 'Performance', iconName: 'seller.performance' },
    { id: 'products', label: 'Inventory', iconName: 'seller.inventory' },
    { id: 'inventory-alerts', label: 'Alerts', iconName: 'shared.bell' },
    { id: 'orders', label: 'Orders', iconName: 'seller.orders' },
    { id: 'active-carts', label: 'Active Carts', iconName: 'seller.orders' },
    { id: 'studio', label: 'Studio', iconName: 'seller.dashboard' },
    { id: 'messages', label: 'Messages', iconName: 'seller.messages' },
    { id: 'verify', label: 'Verification', iconName: 'seller.verification' },
    { id: 'packing', label: 'Packing', iconName: 'seller.inventory' },
    { id: 'disputes', label: 'Disputes', iconName: 'seller.verification' },
    { id: 'buyers', label: 'Buyers', iconName: 'seller.verification' },
    { id: 'buyer-requests', label: 'Requests', iconName: 'seller.performance' },
    { id: 'reviews', label: 'Reviews', iconName: 'shared.star' },
    { id: 'settings', label: 'Settings', iconName: 'seller.settings' },
    { id: 'payments', label: 'Payouts', iconName: 'seller.wallet' },
    { id: 'logistics', label: 'Logistics', iconName: 'seller.inventory' },
  ];

  const restaurantTabs = [
    { id: 'kitchen', label: 'Kitchen Display', iconName: 'seller.dashboard' },
    { id: 'menu', label: 'QR Menu Config', iconName: 'seller.inventory' },
    { id: 'tables', label: 'Table Booking', iconName: 'seller.orders' },
    { id: 'settings', label: 'Settings', iconName: 'seller.settings' },
  ];

  const tabs = activeEngine === 'restaurant' ? restaurantTabs : commerceTabs;

  const handleSaveBrandConfig = async () => {
    setIsSavingBrand(true);
    const payload = {
      portfolioConfig: JSON.stringify({
        ...storeConfig, // Keep whatsapp/call settings
        ...brandConfig // Update brand settings
      })
    };
    const success = await updateStoreConfig(payload);
    setIsSavingBrand(false);
    if (success) {
      showNotification('Brand Configuration saved successfully!', 'success');
      // Update local fetch config so it persists in the frontend session
      fetchStoreConfig();
    } else {
      showNotification('Failed to save brand config', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] pt-20 pb-12 font-sans selection:bg-[var(--color-10-accent)] selection:text-white relative transition-colors duration-500">
      {/* Global Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-10-accent)] opacity-[0.08] dark:opacity-[0.04] blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500 opacity-[0.05] dark:opacity-[0.03] blur-[150px] rounded-full mix-blend-screen" />
      </div>
      {notification.show && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'error' ? 'bg-gray-950/80 border-gray-900 text-gray-200' : 'bg-gray-950/80 border-gray-900 text-gray-200'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-gray-900/50' : 'bg-gray-900/50'}`}>
            {notification.type === 'error' ? <X size={16} className="text-gray-400" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div></div>}
          </div>
          <p className="font-medium tracking-wide">{notification.message}</p>
        </div>
      )}

      {packingOrder && (
        <PackingAnimationModal 
          order={packingOrder} 
          onClose={() => setPackingOrder(null)} 
          onSuccess={handlePackSubmit} 
        />
      )}

      {shippingOrder && (
        <ShippingAnimationModal 
          order={shippingOrder} 
          onClose={() => setShippingOrder(null)} 
          onSuccess={handleShipSubmit} 
        />
      )}
      
      {isFreightModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-[var(--border-color)] shadow-2xl rounded-3xl w-full max-w-4xl p-6 relative flex flex-col h-[80vh] overflow-y-auto">
            <button onClick={() => setIsFreightModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"><X size={24} /></button>
            <RequestFreightStudio onSuccess={() => setIsFreightModalOpen(false)} />
          </div>
        </div>
      )}

      {isPremiumModalOpen && selectedTierToUnlock && (
        <PremiumUnlockModal 
          isOpen={isPremiumModalOpen}
          tier={selectedTierToUnlock} 
          onClose={() => {
            setIsPremiumModalOpen(false);
            setSelectedTierToUnlock(null);
          }} 
          onConfirm={async (payload) => {
            const success = await unlockPremiumStore(payload);
            if (success) {
              showNotification(`Successfully unlocked ${selectedTierToUnlock.name} Portfolio!`, 'success');
              setIsPremiumModalOpen(false);
              fetchStoreConfig();
            } else {
              showNotification(`Failed to unlock ${selectedTierToUnlock.name}`, 'error');
            }
          }} 
        />
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="lg:hidden">
          <DashboardHeader setIsSidebarOpen={setIsSidebarOpen} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 mt-4 lg:mt-0">
          
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <DashboardSidebar 
            tabs={tabs} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen} 
            user={user} 
            handleLogout={handleLogout} 
          />

        <main className="flex-1 glass-premium rounded-[2.5rem] p-6 lg:p-12 min-h-[750px] shadow-[var(--shadow-level-4)] border border-white/30 dark:border-white/5 relative overflow-hidden transition-all duration-500 group/main">
          {isLoading && !analytics && !fetchedStoreConfig ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 <GXSkeleton variant="card" />
                 <GXSkeleton variant="card" />
                 <GXSkeleton variant="card" />
                 <GXSkeleton variant="card" />
              </div>
              <GXSkeleton variant="table" className="h-[400px]" />
            </div>
          ) : (
          <div className="relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            {/* Dynamic internal dashboard ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-[var(--color-10-accent)] opacity-[0.05] blur-[120px] rounded-[100%] pointer-events-none"></div>

            <div className="relative z-10 animate-[fadeIn_0.5s_ease-in-out]">



            {activeTab === 'analytics' && (
              <AnalyticsView analytics={analytics} performanceData={performanceData} products={products} />
            )}

            {activeTab === 'performance' && (() => {
              const avgRating = parseFloat(analytics?.avgRating) || 0;
              let tierName = 'Silver Tier';
              let tierColors = 'from-gray-400 to-gray-300';
              let nextTier = 'Gold';
              let targetRating = 4.5;
              let progress = 50;
              let bgGlow = '';
              let tierSimple = '';
              
              if (avgRating >= 4.8) {
                tierName = 'Platinum Tier';
                tierColors = 'from-blue-400 to-cyan-300';
                nextTier = 'Diamond';
                targetRating = 4.9;
                progress = Math.min(99, ((avgRating - 4.8) / 0.1) * 100);
              } else if (avgRating >= 4.5) {
                tierName = 'Gold Tier';
                tierColors = 'from-yellow-600 to-yellow-400';
                nextTier = 'Platinum';
                targetRating = 4.8;
                progress = Math.min(99, ((avgRating - 4.5) / 0.3) * 100);
                bgGlow = 'bg-yellow-500/5';
                tierSimple = 'Gold';
              } else {
                progress = Math.min(99, (avgRating / 4.5) * 100);
                tierSimple = 'Bronze';
              }

              return (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Performance Scale Board</h1>
                    <p className="text-slate-500 text-sm">Monitor your seller tier, metrics, and unlock new benefits.</p>
                  </div>
                  <div className={`bg-gradient-to-r ${tierColors} px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transform transition-transform hover:scale-105`}>
                    <Star className="text-current" fill="currentColor" size={20} />
                    <span className="font-extrabold tracking-widest uppercase">{tierName}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/60 p-8 rounded-3xl shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-64 h-64 ${bgGlow} blur-[100px] rounded-full pointer-events-none`}></div>
                  <div className="flex justify-between items-end mb-4 relative z-10">
                    <div>
                      <h3 className="text-xl font-bold text-black">Next Tier: {nextTier}</h3>
                      <p className="text-[var(--text-muted)] text-sm mt-1">Increase sales volume and reach a {targetRating} average rating.</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-black">{Math.round(progress)}%</div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mt-1">Progress</p>
                    </div>
                  </div>
                  <div className="w-full bg-white border border-[var(--border-color)] rounded-full h-4 mb-3 relative z-10 p-0.5">
                    <div className={`bg-gradient-to-r ${tierColors} h-full rounded-full shadow-lg relative`} style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-right font-mono mt-4">Rating Performance Scaling</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: "Fulfillment Rate", value: "98.5%", target: "> 95%", status: "Excellent", color: "text-gray-400", border: "border-gray-500/20", bg: "bg-gray-500/5", glow: "shadow-[0_0_15px_rgba(34,197,94,0.05)]" },
                    { title: "Average Rating", value: parseFloat(analytics?.avgRating) || 0, target: "> 4.5", status: "Excellent", color: "text-gray-400", border: "border-gray-500/20", bg: "bg-gray-500/5", glow: "shadow-[0_0_15px_rgba(34,197,94,0.05)]" },
                    { title: "Response Rate", value: "92%", target: "> 90%", status: "Good", color: "text-yellow-400", border: "border-yellow-500/20", bg: "bg-yellow-500/5", glow: "shadow-[0_0_15px_rgba(234,179,8,0.05)]" },
                    { title: "Dispute Rate", value: "1.2%", target: "< 2%", status: "Warning", color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/5", glow: "shadow-[0_0_15px_rgba(249,115,22,0.05)]" },
                  ].map((metric, idx) => (
                    <div key={idx} className={`p-6 rounded-xl border ${metric.border} ${metric.bg} ${metric.glow} backdrop-blur-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg duration-300`}>
                      <h4 className="text-[var(--text-muted)] text-sm font-medium mb-1">{metric.title}</h4>
                      <div className="text-3xl font-black text-black mb-4 tracking-tight">{metric.value}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Target: {metric.target}</span>
                        <span className={`font-bold ${metric.color} px-2.5 py-1 rounded-md bg-white/40 border ${metric.border}`}>{metric.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Scale size={18} className="text-slate-500"/> Scale Board Benefits</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { tier: "Bronze", req: "0 - ₦10k Sales", ben: "Standard fees, basic support, 50 product limit", active: false, color: "text-[#cd7f32]", border: "border-[#cd7f32]" },
                      { tier: "Silver", req: "$10k - ₦25k Sales", ben: "Reduced fees, priority support, 200 product limit", active: false, color: "text-gray-800", border: "border-gray-300" },
                      { tier: "Gold", req: "$25k - ₦50k Sales", ben: "Lowest fees, dedicated manager, unlimited products, flash deal access", active: true, color: "text-yellow-400", border: "border-yellow-400" },
                      { tier: "Platinum", req: "$50k+ Sales", ben: "Zero listing fees, API access, homepage featuring, early payouts", active: false, color: "text-cyan-300", border: "border-cyan-300" }
                    ].map((t, idx) => (
                      <div key={idx} className={`p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-300 ${t.active ? 'bg-[var(--bg-tertiary)]/60 shadow-inner' : 'hover:bg-[var(--bg-tertiary)]/20'}`}>
                        <div className="flex items-center gap-4 min-w-[200px]">
                          <div className={`p-2.5 rounded-full border shadow-sm ${t.active ? `border-current ${t.color} bg-white` : 'border-[var(--border-color)] text-gray-700 bg-[var(--bg-tertiary)]/50'}`}>
                            <Star size={18} fill={t.active ? "currentColor" : "none"} className={t.active ? "drop-shadow-[0_0_8px_currentColor]" : ""} />
                          </div>
                          <div>
                            <h4 className={`font-bold text-lg tracking-wide ${t.active ? t.color : 'text-[var(--text-muted)]'}`}>{t.tier}</h4>
                            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{t.req}</p>
                          </div>
                        </div>
                        <div className="flex-1 border-l border-[var(--border-color)]/50 pl-6 hidden md:block">
                          <p className={`text-sm leading-relaxed ${t.active ? 'text-black' : 'text-gray-600'}`}>{t.ben}</p>
                        </div>
                        <div className="flex-1 block md:hidden">
                          <p className={`text-sm leading-relaxed ${t.active ? 'text-black' : 'text-gray-600'}`}>{t.ben}</p>
                        </div>
                        {t.active && (
                          <div className="px-4 py-1.5 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            Current Tier
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
              );
            })()}

            {activeTab === 'products' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
                  <InventoryView
                    products={products}
                    setIsAddProductModalOpen={() => setIsAddProductModalOpen(true)}
                    setIsCreateDealModalOpen={setIsCreateDealModalOpen}
                    setEditingProduct={setEditingProduct}
                    setIsEditProductModalOpen={setIsEditProductModalOpen}
                    deleteProduct={deleteProduct}
                    restoreProduct={restoreProduct}
                    showNotification={showNotification}
                    useSellerStore={useSellerStore}
                  />
              </div>
            )}

            {activeTab === 'inventory-alerts' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-2">Inventory Alerts</h1>
                <div className="bg-white border border-[var(--border-color)] p-6 rounded-xl">
                  <h3 className="font-bold text-black mb-4">Low Stock Warnings</h3>
                  <div className="space-y-3">
                    {alerts?.length > 0 ? alerts.map((alert, i) => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-[var(--border-color)]">
                        <span className="text-gray-800">{alert.message || alert.title}</span>
                        <span className="text-gray-500 text-sm font-bold">{alert.severity || 'Urgent'}</span>
                      </div>
                    )) : (
                      <p className="text-[var(--text-muted)] text-sm">No inventory alerts right now. Stock is healthy.</p>
                    )}
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <OrdersView
                orders={orders}
                storeConfig={storeConfig}
                setPackingOrder={setPackingOrder}
                setShippingOrder={setShippingOrder}
                approvePaymentProof={approvePaymentProof}
                rejectPaymentProof={rejectPaymentProof}
                showNotification={showNotification}
              />
              </div>
            )}

            {activeTab === 'active-carts' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
                <ActiveCartsView
                  activeCarts={activeCarts}
                  onMessageBuyer={(buyer) => {
                    setActiveTab('messages');
                    // small delay to let the tab render, then we can set recipient
                    setTimeout(() => window.__gxOpenChat?.(buyer), 100);
                  }}
                  onSendOffer={(cartGroup) => {
                    setActiveTab('messages');
                    setTimeout(() => window.__gxOpenOfferChat?.(cartGroup), 100);
                  }}
                />
              </div>
            )}

            {activeTab === 'studio' && (
              <StoreUpgradeStudio
                portfolio={portfolio}
                setPortfolio={setPortfolio}
                brandConfig={brandConfig}
                setBrandConfig={setBrandConfig}
                storeConfig={storeConfig}
                updateStoreConfig={updateStoreConfig}
                showNotification={showNotification}
                useSellerStore={useSellerStore}
                user={user}
              />
            )}

            {activeTab === 'messages' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <MessagesView messages={messages} />
              </div>
            )}

            {activeTab === 'verify' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <VerificationView showNotification={showNotification} />
              </div>
            )}



            {activeTab === 'packing' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
                <div className="space-y-6">
                  <h1 className="text-3xl font-extrabold text-black mb-6">Packing Station</h1>
                
                  <h3 className="text-xl font-bold mt-4">To Pack</h3>
                  {toPack?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {toPack.map(order => (
                        <div key={order.id} className="bg-white border border-[var(--border-color)] rounded-xl p-5">
                          <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-black text-lg">#{order.id.slice(-8).toUpperCase()}</h4>
                             <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Awaiting Packing</span>
                          </div>
                          <button onClick={() => setPackingOrder(order)} className="w-full bg-[var(--accent-gray)] text-black font-bold py-2 rounded mt-2 hover:opacity-90 transition-opacity hover:shadow-[0_0_15px_var(--accent-gray-dim)]">Mark as Packed</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                      <Package size={40} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-[var(--text-muted)]">All caught up! No orders left to pack.</p>
                    </div>
                  )}

                  <h3 className="text-xl font-bold mt-8">Packed</h3>
                  {packed?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {packed.map(order => (
                        <div key={order.id} className="bg-white border border-[var(--border-color)] rounded-xl p-5">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-black text-lg">#{order.id.slice(-8).toUpperCase()}</h4>
                            <span className="bg-gray-900 text-gray-700 border border-gray-400 px-2 py-1 rounded text-xs">Ready for Pickup</span>
                          </div>

                          {(order.deliveryAssignment?.pickupQrCode || order.packingConfirmationCode) && (
                            <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Pickup QR Code</p>
                                <p className="text-3xl font-black tracking-widest text-black">{order.packingConfirmationCode || 'SCAN'}</p>
                              </div>
                              <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                <QRCode value={String(order.deliveryAssignment?.pickupQrCode || order.packingConfirmationCode)} size={64} />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm text-[var(--text-muted)]">Carrier: GlobalX Logistics</p>
                            <button 
                              onClick={() => setIsFreightModalOpen(true)}
                              className="text-xs bg-[var(--accent-gray)] hover:opacity-90 text-black px-3 py-1.5 rounded transition-colors font-bold shadow-[0_0_10px_var(--accent-gray-dim)]"
                            >
                              Request Global Freight
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                      <Package size={40} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-[var(--text-muted)]">No orders have been packed yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'disputes' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-6">Disputes Resolution Center</h1>
                {disputes?.length > 0 ? (
                  <div className="space-y-4">
                    {disputes.map(dispute => (
                      <div key={dispute.id} className="bg-white border border-[var(--border-color)] p-6 rounded-xl border-l-4 border-l-gray-300">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-black">{dispute.reason || 'Dispute Created'}</h4>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Order #{dispute.orderId?.slice(-8).toUpperCase()}</p>
                            <p className="text-sm text-[var(--text-muted)] mt-2">{dispute.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs uppercase bg-[var(--bg-tertiary)] px-2 py-1 rounded text-gray-800 border border-gray-700">{dispute.status}</span>
                            <button 
                              onClick={() => { setRespondingDispute(dispute); setIsDisputeModalOpen(true); }}
                              className="text-sm bg-gray-100 px-3 py-1 rounded text-black hover:bg-gray-700 transition-colors"
                            >
                              Respond
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                    <ShieldCheck size={40} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-[var(--text-muted)] text-lg">Great job! You have zero active disputes.</p>

                  </div>
                )}
              </div>
</div>
            )}

            {activeTab === 'buyers' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-6">My Buyers</h1>
                {buyers?.length > 0 ? (
                  <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-sm">
                        {buyers.map(buyer => (
                          <tr key={buyer.id || buyer.buyerId} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                            <td className="p-4 text-black font-medium">{buyer.name}</td>
                            <td className="p-4 text-[var(--text-muted)] font-mono">{buyer.email}</td>
                            <td className="p-4 text-[var(--text-muted)]">{buyer.orderCount || buyer.ordersCount || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                    <UserCheck size={40} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-[var(--text-muted)]">No buyers yet. Time to market your products!</p>

                  </div>
                )}
              </div>
</div>
            )}

            {activeTab === 'buyer-requests' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-6">Sourcing Requests</h1>
                {buyerRequests?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {buyerRequests.map(req => (
                      <div key={req.id} className="bg-white border border-[var(--border-color)] rounded-xl p-6 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-black mb-1">{req.title || 'Product Request'}</h4>
                          <span className="text-xs px-2 py-1 bg-[var(--bg-tertiary)] text-gray-800 rounded border border-[var(--border-color)] inline-block mb-3">{req.category}</span>
                          <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{req.description}</p>
                          <div className="text-xs text-[var(--text-muted)] mb-4">
                            Target Price: <span className="text-black font-mono"> ₦{req.targetPrice}</span> | Qty: {req.quantity}
                          </div>
                        </div>
                        <button 
                          onClick={() => { setRespondingRequest(req); setIsRespondModalOpen(true); }}
                          className="border border-[var(--accent-gray)] text-black px-4 py-2 rounded-xl text-sm hover:bg-[var(--accent-gray)] transition-colors font-bold w-full shadow-[0_0_15px_var(--accent-gray-dim)] hover-3d"
                        >
                          Submit Quote
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                    <Target size={40} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-[var(--text-muted)]">No active buyer requests match your inventory right now.</p>

                  </div>
                )}
              </div>
</div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-6">Customer Feedback</h1>
                {reviews?.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-white border border-[var(--border-color)] p-6 rounded-xl">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex text-yellow-500 gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-600"} />
                            ))}
                          </div>
                          <span className="font-bold text-black">{review.title || 'Review'}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-2">{review.comment}</p>
                        <p className="text-xs text-gray-600 mt-3">- {review.user?.fullName || review.user?.name || 'Anonymous'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[var(--border-color)] rounded-xl p-12 text-center">
                    <Star size={40} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-[var(--text-muted)]">No reviews yet. Keep delivering great service!</p>

                  </div>
                )}
              </div>
</div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6 max-w-2xl">
                <h1 className="text-3xl font-extrabold text-black mb-6">Store Settings</h1>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Store Display Name</label>
                    <input type="text" value={storeConfig.storeName || ''} onChange={e => setStoreConfig({...storeConfig, storeName: e.target.value})} className="w-full bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Store Description</label>
                    <textarea value={storeConfig.description || ''} onChange={e => setStoreConfig({...storeConfig, description: e.target.value})} className="w-full bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors min-h-[100px]" placeholder="Tell buyers about your brand..." />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Logo URL</label>
                    <div className="flex items-center gap-4">
                      {storeConfig.logoUrl && <img src={storeConfig.logoUrl} alt="Logo" className="h-12 w-12 object-contain bg-gray-100 rounded" />}
                      <input type="text" value={storeConfig.logoUrl || ''} onChange={e => setStoreConfig({...storeConfig, logoUrl: e.target.value})} className="flex-1 bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors" placeholder="https://..." />
                      <label className="cursor-pointer bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                        Upload
                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const formData = new FormData();
                            formData.append('file', e.target.files[0]);
                            formData.append('type', 'logo');
                            const toast = (await import('react-hot-toast')).default;
                            try {
                              const res = await axios.post('/api/v1/stores/upload-asset', formData);
                              if (res.data.success) {
                                setStoreConfig({...storeConfig, logoUrl: res.data.url});
                                toast.success('Logo uploaded');
                              }
                            } catch (err) { toast.error('Upload failed'); }
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Banner URL</label>
                    <div className="flex flex-col gap-2">
                      {storeConfig.bannerUrl && <img src={storeConfig.bannerUrl} alt="Banner" className="h-24 w-full object-cover bg-gray-100 rounded-lg border" />}
                      <div className="flex items-center gap-4">
                        <input type="text" value={storeConfig.bannerUrl || ''} onChange={e => setStoreConfig({...storeConfig, bannerUrl: e.target.value})} className="flex-1 bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors" placeholder="https://..." />
                        <label className="cursor-pointer bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                          Upload
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const formData = new FormData();
                              formData.append('file', e.target.files[0]);
                              formData.append('type', 'banner');
                              const toast = (await import('react-hot-toast')).default;
                              try {
                                const res = await axios.post('/api/v1/stores/upload-asset', formData);
                                if (res.data.success) {
                                  setStoreConfig({...storeConfig, bannerUrl: res.data.url});
                                  toast.success('Banner uploaded');
                                }
                              } catch (err) { toast.error('Upload failed'); }
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Support Email</label>
                    <input type="email" value={storeConfig.supportEmail || ''} onChange={e => setStoreConfig({...storeConfig, supportEmail: e.target.value})} className="w-full bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Shipping Origin Hub</label>
                    <select value={storeConfig.hub || ''} onChange={e => setStoreConfig({...storeConfig, hub: e.target.value})} className="w-full bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors">
                      <option>Dubai, UAE (DXB)</option>
                      <option>New York, USA (NYC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Base Shipping Rate ($)</label>
                    <input type="number" value={storeConfig.directShippingRate || ''} onChange={e => setStoreConfig({...storeConfig, directShippingRate: e.target.value})} className="w-full bg-white border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors" placeholder="e.g. 25.00" />
                    <p className="text-xs text-gray-500 mt-1">This rate is charged for direct shipping to buyers.</p>
                  </div>

                  {/* Store Layout & Theme */}
                  <div className="bg-white border border-[var(--border-color)] p-4 rounded-lg mt-4">
                     <h3 className="text-black font-bold mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2"><Layout size={16}/> Store Layout & Theme</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Product Layout</label>
                           <select value={brandConfig.productLayout || 'grid'} onChange={e => setBrandConfig({...brandConfig, productLayout: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors">
                             <option value="grid">Grid (Standard)</option>
                             <option value="list">List View</option>
                             <option value="masonry">Masonry</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Banner Layout</label>
                           <select value={brandConfig.bannerLayout || 'standard'} onChange={e => setBrandConfig({...brandConfig, bannerLayout: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors">
                             <option value="standard">Standard (Full Width)</option>
                             <option value="split">Split (Half Banner, Half Text)</option>
                             <option value="overlay">Overlay (Text over Image)</option>
                           </select>
                        </div>
                        <div className="flex items-center mt-4">
                           <input type="checkbox" id="showBannerWaves" checked={brandConfig.showBannerWaves !== false} onChange={e => setBrandConfig({...brandConfig, showBannerWaves: e.target.checked})} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                           <label htmlFor="showBannerWaves" className="ml-2 text-sm font-medium text-gray-900">Show Banner Waves / Curves</label>
                        </div>
                        <div>
                           <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Primary Theme Color</label>
                           <input type="color" value={brandConfig.primaryColor || '#d3d3d3'} onChange={e => setBrandConfig({...brandConfig, primaryColor: e.target.value})} className="w-16 h-10 bg-transparent border-0 cursor-pointer" />
                        </div>
                        <div>
                           <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Theme Mode</label>
                           <select value={brandConfig.themeMode || 'light'} onChange={e => setBrandConfig({...brandConfig, themeMode: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-500 transition-colors">
                             <option value="light">Light Mode</option>
                             <option value="dark">Dark Mode</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  
                  {/* WhatsApp Integration */}
                  <div className="bg-white border border-[var(--border-color)] p-4 rounded-lg mt-4">
                     <h3 className="text-black font-bold mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2"><MessageSquare size={16}/> Contact Integrations</h3>
                     <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                           <span className="text-sm font-bold text-gray-800">Enable WhatsApp Contact</span>
                           <input type="checkbox" checked={brandConfig.whatsappEnabled || false} onChange={e => setBrandConfig({...brandConfig, whatsappEnabled: e.target.checked})} className="accent-green-500 w-4 h-4" />
                        </label>
                        {brandConfig.whatsappEnabled && (
                          <div>
                             <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">WhatsApp Number (incl. country code)</label>
                             <input type="text" placeholder="e.g. 1234567890" value={brandConfig.whatsappNumber || ''} onChange={e => setBrandConfig({...brandConfig, whatsappNumber: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-gray-400 transition-colors" />
                          </div>
                        )}
                        
                        <label className="flex items-center justify-between cursor-pointer pt-2">
                           <span className="text-sm font-bold text-gray-800">Enable Call Now</span>
                           <input type="checkbox" checked={brandConfig.callNowEnabled || false} onChange={e => setBrandConfig({...brandConfig, callNowEnabled: e.target.checked})} className="accent-blue-500 w-4 h-4" />
                        </label>
                        {brandConfig.callNowEnabled && (
                          <div>
                             <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">Direct Contact Number</label>
                             <input type="text" placeholder="e.g. 1234567890" value={brandConfig.contactNumber || ''} onChange={e => setBrandConfig({...brandConfig, contactNumber: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 text-black outline-none focus:border-blue-500 transition-colors" />
                          </div>
                        )}
                     </div>
                  </div>

                  <button disabled={isSavingBrand} onClick={async () => {
                    setIsSavingBrand(true);
                    // Bundle the custom config into portfolioConfig
                    const payload = {
                       ...storeConfig,
                       portfolioConfig: JSON.stringify({
                         ...brandConfig
                       })
                    };
                    const success = await updateStoreConfig(payload);
                    setIsSavingBrand(false);
                    if(success) {
                      showNotification('Configuration saved!', 'success');
                    } else {
                      showNotification(useSellerStore.getState().error || 'Failed to save configuration', 'error');
                    }
                  }} className="w-full bg-[var(--accent-gray)] text-black font-bold py-3 rounded-lg mt-4 hover:bg-opacity-80 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingBrand ? <><Loader2 className="animate-spin w-5 h-5"/> Saving...</> : 'Save Configuration'}
                  </button>
                </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
                    <WalletView
                      paymentGateway={paymentGateway}
                      setPaymentGateway={setPaymentGateway}
                      bankDetails={bankDetails}
                      setBankDetails={setBankDetails}
                      updateStoreConfig={updateStoreConfig}
                      showNotification={showNotification}
                      useSellerStore={useSellerStore}
                    />
              </div>
            )}

            {activeTab === 'logistics' && (
              <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-8 rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold text-black mb-6">Logistics & Warehousing</h1>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-[var(--border-color)] p-6 rounded-xl border-t-4 border-t-white">
                    <h3 className="font-bold text-black mb-2">DXB Central Hub</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-4">Your primary warehouse location.</p>
                    <div className="flex justify-between items-center text-sm border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-muted)]">Space Used</span>
                      <span className="font-mono text-black">42%</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => setIsFreightModalOpen(true)}
                    className="bg-white border border-[var(--border-color)] p-6 rounded-xl border-dashed flex flex-col justify-center items-center text-center cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <Truck size={32} className="text-gray-600 mb-2" />
                    <p className="text-sm font-bold text-black">Request Global Freight</p>
                  </div>
                </div>
                </div>
              </div>
            )}



            </div>
          </div>
          )}
        </main>
      </div>
    </div>
      {/* Modals */}
      {isCreateDealModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#fafafa] w-full max-w-2xl rounded-2xl overflow-hidden relative shadow-2xl animate-[slide-up_0.3s_ease-out]">
            <button onClick={() => setIsCreateDealModalOpen(false)} className="absolute top-4 right-4 p-2 text-black hover:bg-gray-200 rounded-full z-[110] transition-colors"><X size={24} /></button>
            <CreateFlashStudio onSuccess={() => setIsCreateDealModalOpen(false)} />
          </div>
        </div>
      )}
      <AddProductModal 
        isOpen={isAddProductModalOpen} 
        onClose={() => setIsAddProductModalOpen(false)} 
      />

      <EditProductModal 
        isOpen={isEditProductModalOpen} 
        onClose={() => { setIsEditProductModalOpen(false); setEditingProduct(null); }} 
        product={editingProduct}
      />
      <RespondToRequestModal 
        isOpen={isRespondModalOpen} 
        onClose={() => { setIsRespondModalOpen(false); setRespondingRequest(null); }} 
        request={respondingRequest}
      />

      <RespondToDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => { setIsDisputeModalOpen(false); setRespondingDispute(null); }}
        dispute={respondingDispute}
      />
    </div>
  );
};

export default function SellerDashboardWithBoundary() {
  return (
    <SellerDashboardErrorBoundary>
      <SellerDashboard />
    </SellerDashboardErrorBoundary>
  );
}

