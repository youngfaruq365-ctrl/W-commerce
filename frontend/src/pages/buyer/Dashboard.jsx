import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import { 
  LayoutDashboard, ShoppingBag, History, Heart, Store, MessageSquare, 
  Wallet, RefreshCcw, ShieldAlert, Star, Truck, PackageCheck, 
  CreditCard, MapPin, Bell, Lock, Settings, HelpCircle, Menu, X, ShieldCheck, Plus, Key, Target
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBuyerStore } from '../../store/buyerStore';
import { useSocket } from '../../hooks/useSocket';
import NotificationBell from '../../components/shared/NotificationBell';
import { celebrate } from '../../components/CelebrationController';
import TopUpModal from '../../components/buyer/TopUpModal';
import WithdrawModal from '../../components/buyer/WithdrawModal';
import CreateDisputeModal from '../../components/buyer/CreateDisputeModal';
import LeaveReviewModal from '../../components/buyer/LeaveReviewModal';
import AddPaymentMethodModal from '../../components/buyer/AddPaymentMethodModal';
import AddAddressModal from '../../components/buyer/AddAddressModal';
import AddBankDetailsModal from '../../components/buyer/AddBankDetailsModal';
import ContactSupportModal from '../../components/buyer/ContactSupportModal';
import PrintableReceiptModal from '../../components/buyer/PrintableReceiptModal';
import TrackingModal from '../../components/buyer/TrackingModal';
import ProvideAddressModal from '../../components/buyer/Dashboard/ProvideAddressModal';
import CreateSourcingRequestModal from '../../components/buyer/CreateSourcingRequestModal';
import { subscribeToPushNotifications } from '../../utils/pushService';
import { registerPasskey } from '../../utils/webauthnService';
import { showNotification } from '../../utils/notifications';
import BuyerDisputesTab from '../../components/buyer/Dashboard/BuyerDisputesTab';
import SavedAddresses from '../../modules/buyer/SavedAddresses';
import { MapView } from '../../maps/MapView';
import { PLACEHOLDER_IMAGE, PLACEHOLDER_AVATAR, PLACEHOLDER_MAP } from '@/constants/placeholders';
const formatAddress = (addr) => {
  if (!addr) return 'N/A';
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      return `${parsed.street ? parsed.street + ', ' : ''}${parsed.city || ''} ${parsed.country || ''}`.trim() || 'N/A';
    } catch(e) { return addr; }
  }
  return typeof addr === 'object' ? `${addr.street ? addr.street + ', ' : ''}${addr.city || ''} ${addr.country || ''}`.trim() || 'N/A' : 'N/A';
};

const BuyerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = React.useRef(null);
  const { 
    orders, wishlist, wallet, walletTransactions, savedShops, messages, disputes, reviews, notifications, profile, buyerRequests,
    fetchOrders, fetchWishlist, fetchWallet, fetchWalletTransactions, fetchSavedShops, fetchMessages, fetchDisputes, fetchReviews, fetchNotifications, fetchProfile, confirmReceipt, interactWithNotification, removeFromWishlist, addToCartFromWishlist, uploadPaymentProof, fetchBuyerRequests
  } = useBuyerStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const fundingProvider = searchParams.get('funding');
    const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref') || searchParams.get('transaction_id');
    
    if (fundingProvider && reference) {
      // NOTE: Route paths must match backend walletRoutes.js exactly:
      //   GET /api/v1/wallet/fund/verify-paystack/:reference
      //   GET /api/v1/wallet/fund/verify-flutterwave/:txRef
      const verifyEndpoint = fundingProvider === 'paystack' 
        ? `/api/v1/wallet/fund/verify-paystack/${encodeURIComponent(reference)}`
        : `/api/v1/wallet/fund/verify-flutterwave/${encodeURIComponent(reference)}`;
        
      axios.get(verifyEndpoint)
        .then(res => {
          if (res.data.success) {
            window.__gxAlert?.('Wallet funded successfully!') ?? toast.success('Wallet funded successfully!');
            fetchWallet();
            fetchWalletTransactions();
          }
        })
        .catch(err => {
          console.error('Funding verification failed:', err);
          const msg = err.response?.data?.message || 'Failed to verify wallet funding.';
          window.__gxAlert?.(msg) ?? toast.error(msg);
        })
        .finally(() => {
          // Remove query params to prevent re-verification on refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    const rawTab = searchParams.get('tab');
    let tab = rawTab === 'orders' ? 'active_orders' : rawTab;
    if (!tab && (location.pathname.includes('/orders') || location.pathname === '/buyer/orders')) {
      tab = 'active_orders';
    } else if (!tab && location.pathname.includes('/tracking')) {
      tab = 'tracking';
    } else if (!tab && location.pathname.includes('/history')) {
      tab = 'history';
    } else if (!tab && location.pathname.includes('/disputes')) {
      tab = 'disputes';
    }
    if (tab) {
      setActiveTab(tab);
    }
    
    const action = searchParams.get('action');
    const actionOrderId = searchParams.get('orderId');
    if (action === 'provide_address' && actionOrderId) {
      setProvideAddressOrderId(actionOrderId);
    }
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const raw = params.get('tab');
    if (raw === 'orders') return 'active_orders';
    if (raw) return raw;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (pathname.includes('/orders')) return 'active_orders';
    if (pathname.includes('/tracking')) return 'tracking';
    if (pathname.includes('/history')) return 'history';
    if (pathname.includes('/disputes')) return 'disputes';
    if (pathname.includes('/wishlist')) return 'wishlist';
    if (pathname.includes('/notifications')) return 'notifications';
    return 'overview';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [isAddBankDetailsModalOpen, setIsAddBankDetailsModalOpen] = useState(false);
  const [isContactSupportModalOpen, setIsContactSupportModalOpen] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [passkeySetup, setPasskeySetup] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [orderToDispute, setOrderToDispute] = useState(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [provideAddressOrderId, setProvideAddressOrderId] = useState(null);
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [emailNotifEnabled, setEmailNotifEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Missing Notifications Interactive State
  const [interactingNotifId, setInteractingNotifId] = useState(null);
  const [notifReply, setNotifReply] = useState('');
  const [notifRating, setNotifRating] = useState(0);

  const handleInteractSubmit = async (notifId) => {
    try {
      await interactWithNotification(notifId, { rating: notifRating, reply: notifReply });
      setInteractingNotifId(null);
    } catch (error) {
      console.error('Failed to save interaction', error);
      toast('Failed to save interaction');
      throw error;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'active_orders', label: 'Active Orders', icon: ShoppingBag },
    { id: 'history', label: 'Order History', icon: History },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'saved_shops', label: 'Saved Shops', icon: Store },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'wallet', label: 'Escrow Wallet', icon: Wallet },
    { id: 'refunds', label: 'Refund Requests', icon: RefreshCcw },
    { id: 'disputes', label: 'Dispute Center', icon: ShieldAlert },
    { id: 'sourcing', label: 'Sourcing Requests', icon: Target },
    { id: 'reviews', label: 'Reviews Given', icon: Star },
    { id: 'tracking', label: 'Delivery Tracking', icon: Truck },
    { id: 'hub', label: 'Hub Consolidation', icon: PackageCheck },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & 2FA', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'support', label: 'Support & Help', icon: HelpCircle }
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeEscrows: 0,
    totalSpent: 0,
    savedItems: 0,
    hubItems: 0,
  });

  // Real-time socket events â€” refresh data when backend emits cross-user events
  const socketEvents = React.useMemo(() => ({
    'order:updated':     () => fetchOrders(),
    'order:shipped':     () => { fetchOrders(); fetchNotifications(); },
    'order:delivered':   () => { fetchOrders(); fetchNotifications(); },
    'dispute:resolved':  () => { fetchDisputes(); fetchNotifications(); },
    'refund:processed':  () => { fetchWallet(); fetchWalletTransactions(); fetchNotifications(); },
    'new_notification':  () => fetchNotifications(),
    'notification':      () => fetchNotifications(),
    'live_activity':     () => {},
  }), [fetchOrders, fetchNotifications, fetchDisputes, fetchWallet, fetchWalletTransactions]);
  useSocket(socketEvents);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchProfile(), fetchOrders(), fetchWishlist(), fetchWallet(),
          fetchWalletTransactions(), fetchSavedShops(), fetchMessages(),
          fetchDisputes(), fetchReviews(), fetchNotifications(),
          fetchBuyerRequests()
        ]);
      } catch (e) { toast.error('Failed to load dashboard data'); } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  React.useEffect(() => {
    let active = 0;
    let spent = 0;
    let hub = 0;
    
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        if (['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAYMENT_SUBMITTED', 'PROOF_SUBMITTED', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status)) {
          active += 1;
        }
        if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
          spent += parseFloat(order.totalAmount || 0);
        }
        if (order.isConsolidated && ['PROCESSING', 'SHIPPED'].includes(order.status)) {
          hub += 1;
        }
      });
    }

    setStats({
      activeEscrows: active,
      totalSpent: spent,
      savedItems: wishlist?.length || 0,
      hubItems: hub
    });
  }, [orders, wishlist]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-black mb-6">Buyer Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Active Escrows', value: stats.activeEscrows.toString(), color: 'text-[var(--text-main)]' },
                { title: 'Total Spent', value: `NGN ${stats.totalSpent.toFixed(2)}`, color: 'text-blue-600' },
                { title: 'Saved Items', value: stats.savedItems.toString(), color: 'text-yellow-500' },
                { title: 'Hub Items', value: stats.hubItems.toString(), color: 'text-purple-500' }
              ].map((stat, i) => (
                <div key={i} className="neu-card p-6 flex flex-col items-center text-center justify-center">
                  <h3 className="text-[11px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{stat.title}</h3>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
               {/* Delivery Tracking Widget */}
               <div className="neu-panel p-6 flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black">Delivery Tracking</h3>
                     <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Live</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden relative border border-[var(--border-color)]">
                     <img src={PLACEHOLDER_MAP} alt="Map" className="w-full h-full object-cover" />
                     {/* Map Pin */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-12 h-12 bg-[var(--bg-primary)] rounded-xl shadow-lg flex items-center justify-center border border-[var(--border-color)] animate-bounce">
                           <Truck size={24} className="text-[var(--text-main)]" />
                        </div>
                     </div>
                  </div>
                  <div className="mt-6">
                     <div className="flex justify-between items-end">
                        <div>
                           <p className="font-bold text-lg">In transit to Lagos Hub</p>
                           <p className="text-xs text-[var(--text-muted)] mt-1">Est. delivery: Tomorrow, 2:00 PM</p>
                        </div>
                        <button className="neu-button px-4 py-2 text-xs" onClick={() => setActiveTab('tracking')}>Track</button>
                     </div>
                  </div>
               </div>

               {/* Recent Orders Table Widget */}
               <div className="neu-panel p-6 flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black">Recent Orders</h3>
                     <button className="text-xs font-bold text-blue-500 uppercase tracking-wider hover:underline" onClick={() => setActiveTab('active_orders')}>View All</button>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2">
                     {orders.filter(o => o.status !== 'CART').slice(0, 4).map(order => (
                        <div key={order.id} className="flex gap-4 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-color)]">
                           <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-[var(--border-color)]">
                              <img src={order.items?.[0]?.product?.images?.[0]?.url || order.items?.[0]?.product?.images?.[0] || PLACEHOLDER_IMAGE} className="w-full h-full object-cover" alt="item" />
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <p className="font-bold text-sm line-clamp-1">{order.items?.[0]?.product?.title || 'Unknown Product'}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">#{order.id.slice(0,8).toUpperCase()}</p>
                           </div>
                           <div className="flex flex-col justify-center items-end shrink-0">
                              <p className="font-bold text-sm">NGN {parseFloat(order.totalAmount || 0).toFixed(0)}</p>
                              <p className="text-[10px] font-bold mt-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">{order.status}</p>
                           </div>
                        </div>
                     ))}
                     {orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                           <ShoppingBag size={32} className="mb-2 opacity-20" />
                           <p className="text-sm font-bold">No recent orders</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        );
      case 'active_orders':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Active Orders</h2>
            {orders && orders.filter(o => ['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAYMENT_SUBMITTED', 'PROOF_SUBMITTED', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'HANDED_TO_COURIER', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => ['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAYMENT_SUBMITTED', 'PROOF_SUBMITTED', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'HANDED_TO_COURIER', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).map(order => (
                  <div key={order.id} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-8 rounded-2xl border border-[var(--border-color)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
                    <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-4">
                      <div>
                         <span className="text-[var(--accent-gray)] font-bold text-lg">Order #{order.id.slice(0,8).toUpperCase()}</span>
                         <p className="text-sm text-[var(--text-muted)] mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] text-[var(--accent-gray)] text-xs rounded-full border border-[var(--border-color)] font-sans font-bold tracking-widest uppercase">{order.status}</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                       {order.items?.map(item => (
                         <div key={item.id} className="flex gap-6">
                            <div className="w-32 h-32 aspect-square bg-white rounded-xl overflow-hidden border border-[var(--border-color)] flex-shrink-0">
                               <img src={item.product?.images?.[0]?.url || item.product?.images?.[0] || PLACEHOLDER_IMAGE} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="product" />
                            </div>
                            <div>
                               <p className="font-bold text-lg line-clamp-1">{item.product?.title}</p>
                               <p className="text-[var(--text-muted)] mt-1">Qty: {item.quantity} x NGN {item.priceAtTime || item.price}</p>
                               {item.variantOptions && <p className="text-sm text-gray-700 mt-1">{item.variantOptions}</p>}
                               {(item.product?.store?.location || item.product?.store?.country) && (
                                 <p className="text-sm text-[var(--accent-gray)] mt-2 flex flex-wrap items-center gap-1 font-bold">
                                    <MapPin size={14} /> 
                                    Seller Address: {item.product.store.location || item.product.store.country} 
                                    <span className="mx-2 text-gray-600">|</span> 
                                    Buyer Address: {formatAddress(order.shippingAddress)}
                                 </p>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                       <div className="flex gap-4 items-center">
                         <div className="flex flex-col">
                           <p className="text-[var(--text-muted)] text-xs">Total Amount</p>
                           <p className="text-xl font-extrabold text-[var(--text-main)]"> NGN {parseFloat(order.totalAmount || 0).toFixed(2)}</p>
                         </div>
                         {(order.paymentStatus === 'PAID' || ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) && (
                            <button 
                              onClick={() => setSelectedReceiptOrder(order)}
                              className="px-6 py-3 min-h-[44px] bg-white dark:bg-zinc-800 border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl shadow-sm hover:opacity-90 flex items-center gap-2 ml-4 cursor-pointer"
                            >
                              View Receipt
                            </button>
                         )}
                       </div>
                       <div className="flex items-center gap-4">
                         {order.status !== 'PENDING' && (
                            <button 
                              onClick={() => {
                                 setTrackingOrderId(order.id); navigate(`/payai?tab=tracking&orderId=${order.id}`);
                              }}
                              className="px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] font-bold rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors text-sm flex items-center gap-2 cursor-pointer"
                            >
                              Track Order
                            </button>
                         )}
                         {['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'HANDED_TO_COURIER'].includes(order.status) && (
                           <button 
                             onClick={() => confirmReceipt(order.id)}
                             className="px-6 py-3 min-h-[44px] bg-[var(--accent-gray)] text-[var(--text-main)] font-bold rounded-lg hover:brightness-110 transition-colors text-sm cursor-pointer"
                           >
                             Confirm Receipt
                           </button>
                         )}
                         {order.paymentStatus === 'AWAITING_PROOF' && (
                           <div>
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               className="hidden" 
                               accept="image/*,application/pdf"
                               onChange={async (e) => {
                                 const file = e.target.files[0];
                                 if (file) {
                                   const success = await uploadPaymentProof(order.id, file);
                                   if (success) {
                                     showNotification('Payment proof uploaded successfully!', 'success');
                                   } else {
                                     showNotification('Failed to upload proof.', 'error');
                                   }
                                 }
                               }} 
                             />
                             <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="px-6 py-3 min-h-[44px] bg-blue-600 text-black font-bold rounded-lg hover:bg-blue-500 transition-colors text-sm"
                             >
                               Upload Proof
                             </button>
                           </div>
                         )}
                         {order.paymentStatus === 'PROOF_SUBMITTED' && (
                           <span className="text-sm text-yellow-500 font-bold">Proof Submitted, Awaiting Approval</span>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)]">
                  <ShoppingBag size={40} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">No Active Orders</h3>
                <p className="text-[var(--text-muted)] max-w-md">You don't have any orders currently being processed or shipped. Browse the marketplace to find amazing deals!</p>
              </div>
            )}
          </div>
        );
      case 'wishlist':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Wishlist</h2>
              <span className="text-sm text-[var(--text-muted)]">{wishlist?.length || 0} item{wishlist?.length !== 1 ? 's' : ''}</span>
            </div>
            {wishlist && Array.isArray(wishlist) && wishlist.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(item => {
                  if (!item || !item.product) return null; // Skip if product was deleted
                  const productId = item.productId || item.product?.id;
                  return (
                    <div key={item.id || productId} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-[var(--border-color)] overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="aspect-[4/3] w-full relative bg-white border-b border-[var(--border-color)] overflow-hidden">
                        <img src={item.product?.images?.[0]?.url || item.product?.images?.[0] || PLACEHOLDER_IMAGE} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="product" />
                        <button
                          onClick={() => removeFromWishlist(productId)}
                          title="Remove from wishlist"
                          className="absolute top-3 right-3 bg-white/60 p-2 rounded-full backdrop-blur-md text-[var(--accent-gray)] hover:bg-gray-500/30 transition-colors"
                        >
                          <Heart size={20} fill="currentColor" />
                        </button>
                        {item.product?.store?.storeName && (
                          <div className="absolute bottom-3 left-3 bg-white/60 px-2 py-1 rounded-full backdrop-blur-md">
                            <p className="text-xs text-gray-800">{item.product.store.storeName}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-sans font-bold tracking-tight text-xl mb-1 line-clamp-1">{item.product?.title}</h3>
                        <p className="font-sans text-3xl font-black tracking-tight text-[var(--text-main)] mb-6"> NGN {parseFloat(item.product?.price || 0).toFixed(2)}</p>
                        <button
                          onClick={() => addToCartFromWishlist(productId)}
                          className="w-full py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                          <ShoppingBag size={18} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)]">
                  <Heart size={40} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">Your Wishlist is Empty</h3>
                <p className="text-[var(--text-muted)] max-w-md">Save items you like to your wishlist so you can easily find them later when you're ready to buy.</p>
                <button onClick={() => navigate('/shop')} className="mt-6 px-6 py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all">
                  Browse Products
                </button>
              </div>
            )}
          </div>
        );
      case 'wallet':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Escrow Wallet</h2>
            {isLoading ? (
              <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] animate-pulse">
                <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-gray-300 dark:bg-zinc-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/3"></div>
              </div>
            ) : (
            <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-gray)] opacity-10 rounded-full blur-[80px] -mr-10 -mt-10 pointer-events-none"></div>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div>
                     <p className="text-[var(--text-muted)] mb-2 flex items-center gap-2"><ShieldAlert size={16} className="text-[var(--accent-gray)]"/> Available Balance</p>
                     <h3 className="text-5xl font-extrabold text-black tracking-tight"> NGN {parseFloat(wallet?.balances?.GONG?.available || 0).toFixed(2)}</h3>
                     <p className="text-sm text-gray-700 mt-2">Funds are safely held in GlobalX Escrow</p>
                  </div>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => setIsTopUpModalOpen(true)}
                       className="px-6 py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2">
                       <Wallet size={18} /> Top Up
                     </button>
                     <button 
                       onClick={() => setIsWithdrawModalOpen(true)}
                       className="px-6 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:border-gray-500 transition-all">
                       Withdraw
                     </button>
                  </div>
               </div>
            </div>
            )}
            
            <h3 className="text-xl font-bold mt-8 mb-4">Recent Transactions</h3>
            {walletTransactions && walletTransactions.length > 0 ? (
              <div className="space-y-4">
                {walletTransactions.map(tx => (
                  <div key={tx.id} className="premium-glass p-5 rounded-xl border border-[var(--border-color)] flex justify-between items-center hover:bg-[var(--bg-tertiary)] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.direction === 'CREDIT' ? 'bg-gray-500/20 text-gray-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        {tx.direction === 'CREDIT' ? <RefreshCcw size={20} /> : <Wallet size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-black capitalize">
                          {tx.referenceType ? tx.referenceType.toLowerCase() : (tx.direction === 'CREDIT' ? 'Deposit' : 'Withdrawal')} - {tx.direction}
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-extrabold text-lg ${tx.direction === 'CREDIT' ? 'text-gray-500' : 'text-black'}`}>
                        {tx.direction === 'CREDIT' ? '+' : '-'}NGN {parseFloat(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{tx.description || tx.referenceId}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-12 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                  <RefreshCcw size={40} className="text-[var(--text-muted)] mb-4" />
                  <p className="text-[var(--text-muted)]">No recent transactions in your wallet.</p>
              </div>
            )}
          </div>
        );
      case 'history':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Order History</h2>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] animate-pulse flex gap-4">
                     <div className="w-16 h-16 bg-gray-300 dark:bg-zinc-700 rounded-lg"></div>
                     <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/4"></div>
                     </div>
                  </div>
                ))}
              </div>
            ) : orders && orders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).map(order => (
                  <div key={order.id} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] opacity-75 hover:opacity-100 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-black font-bold text-lg">Order #{order.id.slice(0,8).toUpperCase()}</span>
                      <span className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-sm rounded-full border border-[var(--border-color)]">{order.status}</span>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border border-[var(--border-color)]">
                          <img src={order.items?.[0]?.product?.images?.[0]?.url || order.items?.[0]?.product?.images?.[0] || PLACEHOLDER_IMAGE} className="w-full h-full object-cover grayscale" alt="product" />
                       </div>
                       <div>
                         <p className="font-bold text-[var(--text-muted)] line-clamp-1">{order.items?.[0]?.product?.title || 'Unknown Product'}</p>
                         <p className="text-sm font-bold mt-1 text-black">Total: NGN {parseFloat(order.totalAmount || 0).toFixed(2)}</p>
                       </div>
                    </div>
                    {['DELIVERED', 'COMPLETED'].includes(order.status) && (
                       <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-end">
                         <button
                           onClick={() => { setSelectedReviewOrder(order); setIsReviewModalOpen(true); }}
                           className="px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:border-yellow-500 hover:text-yellow-500 transition-all text-sm font-bold flex items-center gap-2"
                         >
                           <Star size={14} /> Leave Review
                         </button>
                       </div>
                     )}
                   </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <History size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-2xl font-bold text-black mb-2">No Order History</h3>
                <p className="text-[var(--text-muted)]">Past orders will appear here once they are delivered or completed.</p>
              </div>
            )}
          </div>
        );
      case 'refunds': {
        const refundDisputes = disputes?.filter(d => ['RESOLVED_REFUNDED', 'OPEN', 'SELLER_RESPONSE', 'MEDIATION'].includes(d.status)) || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Refund Requests</h2>
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:border-yellow-500 transition-all text-sm"
              >
                Request Refund
              </button>
            </div>
            {refundDisputes.length > 0 ? (
              <div className="space-y-4">
                {refundDisputes.map(dispute => {
                  const isResolved = dispute.status === 'RESOLVED_REFUNDED';
                  return (
                    <div key={dispute.id} className="premium-glass p-6 rounded-xl border border-yellow-900/50 hover:border-yellow-500/50 transition-all relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-2 h-full ${isResolved ? 'bg-gray-500' : 'bg-yellow-500'}`}></div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-yellow-500 font-bold text-lg">
                          Dispute #{dispute.id?.slice(0,8).toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 text-sm rounded-full font-bold ${isResolved ? 'bg-gray-500/20 text-gray-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                          {isResolved ? 'Refund Approved' : dispute.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {dispute.order && (
                        <p className="text-sm text-[var(--text-muted)] mb-1">Order #{dispute.order.id.slice(0,8).toUpperCase()} â€” NGN {parseFloat(dispute.order.totalAmount).toFixed(2)}</p>
                      )}
                      <p className="text-black font-semibold mb-1">{dispute.reason.replace(/_/g, ' ')}</p>
                      <p className="text-[var(--text-muted)] text-sm mb-4 line-clamp-2">{dispute.description}</p>
                      <p className="text-xs text-gray-500">Funds are securely locked in escrow until resolution.</p>
                      <button
                        onClick={() => setActiveTab('disputes')}
                        className="mt-4 px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:text-black transition-colors text-sm"
                      >
                        View Dispute Details
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <RefreshCcw size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Active Refunds</h3>
                <p className="text-[var(--text-muted)]">You don't have any pending refund requests. Open a dispute to request a refund.</p>
              </div>
            )}
          </div>
        );
      }
      case 'tracking': {
        const activeOrdersForTracking = orders?.filter(o => ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PACKED', 'CONFIRMED', 'PENDING'].includes(o.status)) || [];
        const lastOrder = activeOrdersForTracking.length > 0 ? activeOrdersForTracking[0] : orders?.[0]; // fallback to last order ever if no active
        
        // Mock route for MapView if it doesn't have one from API yet
        const activeRoute = lastOrder ? {
            pickupLat: 6.4281, // VI
            pickupLng: 3.4219,
            pickupAddress: "GlobalX Distribution Center",
            dropoffLat: 6.5244, // Ikeja
            dropoffLng: 3.3792,
            dropoffAddress: lastOrder.deliveryAddress || "Buyer Address"
        } : null;

        return (
          <div className="space-y-6 animate-fade-in flex flex-col min-h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-3xl font-black">Delivery Tracking</h2>
                {lastOrder && <span className="font-bold text-sm bg-black text-white px-3 py-1 rounded-full">Order #{lastOrder.id?.slice(0,8).toUpperCase()}</span>}
            </div>

            {lastOrder ? (
                <div className="flex-1 neu-panel rounded-3xl flex flex-col lg:flex-row overflow-hidden p-0 border-0">
                    {/* Map Area */}
                    <div className="w-full lg:w-2/3 h-72 lg:h-auto relative bg-[#e5e3df] rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none overflow-hidden">
                        <MapView activeRoute={activeRoute} className="w-full h-full" />
                        
                        {/* Overlay gradient for aesthetics */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--surface)] lg:from-transparent lg:bg-gradient-to-r lg:to-transparent lg:w-24 lg:right-0 lg:h-full lg:bottom-auto pointer-events-none z-10"></div>
                    </div>
                    
                    {/* Tracking Info Area */}
                    <div className="w-full lg:w-1/3 h-full overflow-y-auto p-6 bg-[var(--surface)] z-20">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border border-[var(--border-color)] shadow-sm">
                                    <Truck size={24} className="text-black" />
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider">Tracking Number</p>
                                    <p className="font-bold text-lg text-black font-mono">{lastOrder.trackingNumber || 'PENDING-UPDATE'}</p>
                                </div>
                            </div>
                            
                            {lastOrder.courier && (
                                <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] p-2 pr-4 rounded-full border border-[var(--border-color)]">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--border-color)]">
                                        <img src={lastOrder.courier.avatarUrl || PLACEHOLDER_AVATAR} alt="Courier" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase">Assigned Courier</p>
                                        <p className="text-sm font-bold text-black">{lastOrder.courier.name || lastOrder.courier.fullName}</p>
                                    </div>
                                </div>
                            )}
                        </div>


                        <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-gray-300">
                            {lastOrder.trackingEvents && lastOrder.trackingEvents.length > 0 ? (
                                lastOrder.trackingEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((event, index) => (
                                    <div key={event.id || index} className={`relative ${index !== 0 ? 'opacity-50' : ''}`}>
                                        <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full ${index === 0 ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.3)]' : 'bg-[var(--surface)] border-2 border-gray-400'}`}></div>
                                        <p className="font-bold text-black">{event.status.replace(/_/g, ' ')} {event.location ? `- ${event.location}` : ''}</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">{event.description || 'Status updated'}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="relative">
                                    <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
                                    <p className="font-bold text-black">Order Placed</p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Awaiting dispatch and carrier tracking details.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
              <div className="neu-panel p-16 rounded-3xl flex flex-col items-center justify-center text-center flex-1">
                <Truck size={48} className="text-gray-400 mb-4 drop-shadow-md" />
                <h3 className="text-2xl font-bold text-black mb-2">No Recent Orders</h3>
                <p className="text-[var(--text-muted)] font-medium max-w-sm">When you place an order, the live map tracking and delivery route will appear here.</p>
              </div>
            )}
          </div>
        );
      }
      case 'hub':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Hub Consolidation</h2>
            <div className="premium-glass p-6 rounded-xl border border-[var(--accent-gray)] mb-6 bg-[var(--accent-gray)]/5">
               <div className="flex items-start gap-4">
                  <PackageCheck size={24} className="text-[var(--accent-gray)] mt-1 flex-shrink-0" />
                  <div>
                     <h3 className="font-bold text-black text-lg">GlobalX Smart Hub</h3>
                     <p className="text-[var(--text-muted)] text-sm mt-1">
                       Items from multiple sellers are routed to our secure verification hub before being shipped to you in a single, consolidated package to save on international shipping fees.
                     </p>
                  </div>
               </div>
            </div>
            {orders && orders.filter(o => o.isConsolidated && !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => o.isConsolidated && !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).map(order => {
                  const hubReceived = order.trackingEvents?.some(e => e.status.toLowerCase().includes('hub') || e.location?.toLowerCase().includes('hub'));
                  const shippedFromHub = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status);
                  
                  let progressW = 'w-1/3 bg-yellow-500';
                  let statusText = 'En route to Hub';
                  if (shippedFromHub) {
                    progressW = 'w-full bg-gray-500';
                    statusText = 'Consolidated & Shipped';
                  } else if (hubReceived) {
                    progressW = 'w-2/3 bg-blue-500';
                    statusText = 'Received at Hub - Awaiting Consolidation';
                  }

                  return (
                  <div key={order.id} className="premium-glass p-5 rounded-xl border border-[var(--border-color)] flex gap-4 items-center">
                     <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border border-[var(--border-color)] flex-shrink-0">
                        <img src={order.items?.[0]?.product?.images?.[0] || PLACEHOLDER_IMAGE} className="w-full h-full object-cover" alt="product" />
                     </div>
                     <div className="flex-1">
                       <p className="font-bold text-sm line-clamp-1">{order.items?.[0]?.product?.title}</p>
                       <div className="w-full bg-[var(--bg-tertiary)] h-2 mt-3 rounded-full overflow-hidden">
                          <div className={`h-full ${progressW}`}></div>
                       </div>
                       <p className="text-xs text-[var(--text-muted)] mt-1">{statusText}</p>
                     </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <PackageCheck size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Hub Items</h3>
                <p className="text-[var(--text-muted)]">You don't have any items currently being consolidated at our hubs.</p>
              </div>
            )}
          </div>
        );
      case 'saved_shops':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Saved Shops</h2>
              <span className="text-sm text-[var(--text-muted)]">{savedShops?.length || 0} shop{savedShops?.length !== 1 ? 's' : ''} saved</span>
            </div>
            {savedShops && savedShops.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedShops.map(shop => (
                  <div key={shop.id} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-all flex flex-col items-center text-center group">
                    <div className="w-24 h-24 bg-white rounded-full overflow-hidden border-2 border-[var(--accent-gray)] mb-4 shadow-[0_0_15px_var(--accent-gray-dim)] group-hover:shadow-[0_0_25px_var(--accent-gray)]  transition-shadow">
                       <img src={shop.avatar || PLACEHOLDER_AVATAR} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="store" />
                    </div>
                    <h3 className="font-bold text-lg text-black mb-1">{shop.name || 'Store Name'}</h3>
                    <p className="text-xs text-[var(--accent-gray)] mb-1">Category: {shop.category}</p>
                    <p className="text-sm text-[var(--text-muted)] mb-4">Location: {shop.location}</p>
                    <button
                      onClick={() => navigate(`/store/${shop.slug || shop.storeId}`)}
                      className="px-6 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all w-full"
                    >
                       Visit Shop
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <Store size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Saved Shops</h3>
                <p className="text-[var(--text-muted)]">When you follow a seller, their shop will appear here.</p>
                <button onClick={() => navigate('/sellers')} className="mt-6 px-6 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:border-[var(--accent-gray)] transition-all">
                  Explore Sellers
                </button>
              </div>
            )}
          </div>
        );
      case 'messages':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Messages</h2>
            {messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.conversationId || msg.id} onClick={() => navigate('/messages')} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex gap-4 items-center hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors">
                     <div className="w-12 h-12 bg-white rounded-full overflow-hidden border border-[var(--border-color)] flex-shrink-0">
                        <img src={msg.otherUser?.avatarUrl || PLACEHOLDER_AVATAR} className="w-full h-full object-cover" alt="user" />
                     </div>
                     <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-black">{msg.otherUser?.fullName || 'Seller'}</p>
                          <span className="text-xs text-[var(--text-muted)]">{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : 'N/A'}</span>
                       </div>
                       <p className="text-sm text-[var(--text-muted)] line-clamp-1">{msg.lastMessageText || 'No messages yet...'}</p>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <MessageSquare size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Messages</h3>
                <p className="text-[var(--text-muted)]">Your inbox is empty.</p>
              </div>
            )}
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Notifications</h2>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map(notif => {
                   const isFlashDeal = notif.type === 'FLASH_DEAL_ALERT';
                   const bodyText = notif.body || notif.message || '';
                   // Extract promo code from metadata if available
                   let meta = null;
                   try { meta = notif.metadata ? (typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : notif.metadata) : null; } catch(e) {}
                   const promoCode = meta?.promoCode || null;

                   return (
                    <div key={notif.id} className={`p-5 rounded-xl border transition-all ${isFlashDeal ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-md' : 'premium-glass border-[var(--border-color)]'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {isFlashDeal && <span className="text-lg">🔥</span>}
                          <span className={`font-bold ${isFlashDeal ? 'text-indigo-800' : 'text-black'}`}>{notif.title}</span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                      <p className={`text-sm ${isFlashDeal ? 'text-indigo-700' : 'text-gray-700'}`}>{bodyText}</p>

                      {/* Flash Deal extras */}
                      {isFlashDeal && promoCode && (
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 bg-white border-2 border-dashed border-indigo-400 rounded-lg px-3 py-2">
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Promo Code</span>
                            <span className="font-mono font-extrabold text-indigo-800 tracking-widest">{promoCode}</span>
                          </div>
                          <a
                            href="/shop"
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            🛍️ Shop Now
                          </a>
                        </div>
                      )}
                      {isFlashDeal && !promoCode && (
                        <a href="/shop" className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                          🛍️ Shop Now
                        </a>
                      )}

                      {notif.interactive && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                           <button onClick={() => setInteractingNotifId(notif.id)} className="text-sm text-[var(--accent-gray)] font-bold hover:underline">Interact</button>
                        </div>
                      )}

                      {interactingNotifId === notif.id && (
                        <div className="ml-9 mt-2 p-4 border border-[var(--accent-gray)] bg-[var(--bg-secondary)] rounded-xl">
                          <div className="flex gap-2 mb-4">
                            {[1,2,3,4,5].map(star => (
                              <button key={star} onClick={() => setNotifRating(star)} className={`text-xl hover:scale-110 transition-transform ${star <= notifRating ? 'text-[var(--accent-gray)]' : 'text-gray-300'}`}>
                                <Star fill={star <= notifRating ? 'currentColor' : 'none'} size={24} />
                              </button>
                            ))}
                          </div>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded focus:border-[var(--accent-gray)] focus:outline-none mb-3 text-sm"
                            placeholder="Write a reply..."
                            value={notifReply}
                            onChange={(e) => setNotifReply(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleInteractSubmit(notif.id)} className="px-4 py-1.5 bg-[var(--accent-gray)] text-black font-bold rounded text-sm hover:opacity-90">Save</button>
                            <button onClick={() => setInteractingNotifId(null)} className="px-4 py-1.5 border border-gray-300 text-gray-700 font-bold rounded text-sm hover:bg-gray-100">Cancel</button>
                          </div>
                        </div>
                      )}
                   </div>
                   );
                })}

              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <Bell size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Notifications</h3>
                <p className="text-[var(--text-muted)]">You're all caught up!</p>
              </div>
            )}
          </div>
        );
      case 'addresses':
        return <div className="animate-fade-in -mx-6 -mt-6"><SavedAddresses /></div>;
      case 'disputes':
        return <BuyerDisputesTab disputes={disputes} onOpenDispute={() => setIsDisputeModalOpen(true)} onSetTab={setActiveTab} />;
      case 'sourcing':
        return (
          <div className="bg-white rounded-3xl p-8 border border-[var(--border-color)] animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">Sourcing Requests</h2>
              <button 
                onClick={() => setIsCreateRequestModalOpen(true)}
                className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-[0_0_15px_var(--accent-primary-dim)] transition-all"
              >
                <Plus size={18} />
                New Request
              </button>
            </div>
            {buyerRequests?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {buyerRequests.map(req => (
                  <div key={req.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-black mb-1 text-lg">{req.productName}</h4>
                        <span className="text-xs px-2 py-1 bg-white text-gray-800 rounded border border-[var(--border-color)]">{req.category}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'RESPONDED' || req.status === 'QUOTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mb-4">{req.description}</p>
                    <div className="flex justify-between items-center text-sm font-semibold border-t border-[var(--border-color)] pt-4 mt-4">
                      <div><span className="text-[var(--text-muted)] font-normal">Target:</span> ₦{req.budget?.toLocaleString()}</div>
                      <div><span className="text-[var(--text-muted)] font-normal">Qty:</span> {req.quantity}</div>
                    </div>
                    {req.responses?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                        <h5 className="font-bold text-sm mb-2 text-[var(--accent-primary)]">{req.responses.length} Seller Quote(s)</h5>
                        {req.responses.map(resp => (
                          <div key={resp.id} className="bg-white p-3 rounded-lg border border-[var(--border-color)] text-sm mb-2">
                            <div className="flex justify-between font-bold mb-1">
                              <span>{resp.seller?.storeName || 'Store'}</span>
                              <span>₦{resp.quotedPrice?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <p className="text-[var(--text-muted)] text-xs">{resp.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
                <Target size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-bold text-black mb-2">No Requests Yet</h3>
                <p className="text-[var(--text-muted)] mb-6">Looking for a specific item? Submit a request and let sellers come to you.</p>
                <button 
                  onClick={() => setIsCreateRequestModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
                >
                  <Plus size={20} />
                  Submit a Request
                </button>
              </div>
            )}
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Reviews Given</h2>
            </div>
            {reviews?.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] flex justify-between items-start">
                    <div>
                       <div className="flex text-yellow-500 mb-2">
                         {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                       </div>
                       <p className="text-[var(--text-main)]">{review.comment}</p>
                       <p className="text-[var(--text-muted)] text-xs mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <Star size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Reviews Yet</h3>
                <p className="text-[var(--text-muted)]">You haven't left any product reviews.</p>
              </div>
            )}
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Payment Methods</h2>
              <button onClick={() => toast('Feature coming soon')} className="px-6 py-3 min-h-[44px] bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-colors flex items-center gap-2">
                <Plus size={18} /> Add Method
              </button>
            </div>
            <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
               <CreditCard size={40} className="text-[var(--text-muted)] mb-4" />
               <h3 className="text-xl font-bold text-black mb-2">Secure Payments</h3>
               <p className="text-[var(--text-muted)]">We currently process payments securely via our automated direct bank transfer and Escrow system. Saved cards will appear here.</p>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Security & 2FA</h2>
            <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)] space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-6">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2"><Lock size={18} /> Two-Factor Authentication</h3>
                  <p className="text-[var(--text-muted)] text-sm">Add an extra layer of security to your account.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled} onChange={(e) => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    toast.success(!twoFactorEnabled ? '2FA Enabled Successfully' : '2FA Disabled');
                    if (!twoFactorEnabled) celebrate('standard', e);
                  }} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-gray)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2"><Key size={18} /> Passkey Setup</h3>
                  <p className="text-[var(--text-muted)] text-sm">Use biometrics to login faster.</p>
                </div>
                <button
                  onClick={async () => {
                    if (passkeyLoading || passkeyDone) return;
                    setPasskeyLoading(true);
                    const { setupFingerprint } = useAuthStore.getState();
                    const result = await setupFingerprint();
                    setPasskeyLoading(false);
                    if (result.success) {
                      setPasskeyDone(true);
                      toast.success('✅ Passkey registered! You can now sign in with your fingerprint or face.', { duration: 6000 });
                    } else {
                      toast.error(result.message || 'Failed to set up passkey. Please try again.');
                    }
                  }}
                  disabled={passkeyLoading || passkeyDone}
                  className={`px-6 py-3 min-h-[44px] border rounded-lg text-sm font-bold transition-all ${
                    passkeyDone
                      ? 'border-green-500 text-green-600 bg-green-50 cursor-default'
                      : passkeyLoading
                      ? 'border-[var(--border-color)] opacity-60 cursor-wait'
                      : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {passkeyDone ? '✓ Passkey Active' : passkeyLoading ? 'Setting up...' : 'Setup Passkey'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Preferences</h2>
            <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)] space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-6">
                <div>
                  <h3 className="font-bold text-lg">Email Notifications</h3>
                  <p className="text-[var(--text-muted)] text-sm">Receive order updates via email.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={emailNotifEnabled} onChange={(e) => {
                    setEmailNotifEnabled(!emailNotifEnabled);
                    toast.success(!emailNotifEnabled ? 'Email Notifications Enabled' : 'Email Notifications Disabled');
                    if (!emailNotifEnabled) celebrate('standard', e);
                  }} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-gray)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Promotional Emails</h3>
                  <p className="text-[var(--text-muted)] text-sm">Receive exclusive deals and offers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={promoEnabled} onChange={(e) => {
                    setPromoEnabled(!promoEnabled);
                    toast.success(!promoEnabled ? 'Promotional Emails Enabled' : 'Promotional Emails Disabled');
                    if (!promoEnabled) celebrate('standard', e);
                  }} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-gray)]"></div>
                </label>
              </div>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Support & Help</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-colors cursor-pointer" onClick={() => window.open('/help', '_blank')}>
                <HelpCircle size={32} className="text-[var(--accent-gray)] mb-4 mx-auto" />
                <h3 className="font-bold text-lg mb-2 text-center">Help Center</h3>
                <p className="text-[var(--text-muted)] text-sm text-center">Browse our comprehensive guides and FAQs.</p>
              </div>
              <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-colors cursor-pointer" onClick={() => setIsContactSupportModalOpen(true)}>
                <MessageSquare size={32} className="text-[var(--accent-gray)] mb-4 mx-auto" />
                <h3 className="font-bold text-lg mb-2 text-center">Contact Support</h3>
                <p className="text-[var(--text-muted)] text-sm text-center">Get in touch with our customer service team.</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Coming Soon</h2>
            <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
              <PackageCheck size={40} className="text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-muted)]">This section is currently under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans relative overflow-x-hidden selection:bg-[var(--accent-gray)] selection:text-black">
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Glows removed */}
      </div>
      <div className="fixed top-0 left-0 h-full w-20 neu-panel !rounded-none border-r border-[var(--border-color)] flex flex-col items-center py-8 z-50 hidden md:flex">
        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-black/20">
          <span className="text-[var(--accent-gray)] font-black text-xl tracking-tighter">W</span>
        </div>
        <div className="flex-1 flex flex-col gap-6 w-full px-4">
          <button onClick={() => navigate('/shop')} className="w-full aspect-square rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-black transition-all group relative">
            <Store size={22} className="group-hover:scale-110 transition-transform" />
          </button>
          <button className="w-full aspect-square rounded-xl bg-[var(--accent-gray)] flex items-center justify-center text-black shadow-lg shadow-[var(--accent-gray)]/20 relative group">
            <LayoutDashboard size={22} />
          </button>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
          <X size={20} />
        </button>
      </div>
      <div className="md:ml-20 min-h-screen flex flex-col relative z-10">
        <header className="h-20 neu-panel !rounded-none border-b border-[var(--border-color)] flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-black" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight hidden sm:block">W-Commerce <span className="text-[var(--accent-gray)]">Buyer</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell notifications={notifications} />
            <div className="flex items-center gap-3 pl-4 border-l border-[var(--border-color)]">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-sm text-black">{profile?.firstName || 'Buyer'}</p>
                <p className="text-xs text-[var(--text-muted)]">Verified Member</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-[var(--accent-gray)]">
                <span className="text-[var(--accent-gray)] font-bold">{profile?.firstName?.[0] || 'B'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full">
          <aside className="lg:w-64 flex-shrink-0 hidden lg:block space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-main)]'}`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </aside>
          
          {/* Mobile Sidebar */}
          {isSidebarOpen && (
            <div className="fixed top-16 inset-x-0 bottom-0 z-50 lg:hidden flex">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
              <div className="w-72 bg-[var(--bg-primary)] text-[var(--text-main)] h-full relative z-10 flex flex-col border-r border-[var(--border-color)] animate-in slide-in-from-left duration-300">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                  <h2 className="font-extrabold text-xl">Menu</h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-main)] transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-main)]'}`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </main>
      </div>

      <TopUpModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} />
      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} balance={wallet?.balances?.GONG?.available || 0} />
      <CreateDisputeModal isOpen={isDisputeModalOpen} onClose={() => setIsDisputeModalOpen(false)} orders={orders} initialOrderId={orderToDispute?.id} />
      <LeaveReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} order={selectedReviewOrder} />
      <AddPaymentMethodModal isOpen={isAddCardModalOpen} onClose={() => setIsAddCardModalOpen(false)} />
      <AddBankDetailsModal isOpen={isAddBankDetailsModalOpen} onClose={() => setIsAddBankDetailsModalOpen(false)} />
      <AddAddressModal isOpen={isAddAddressModalOpen} onClose={() => setIsAddAddressModalOpen(false)} />
      <ContactSupportModal isOpen={isContactSupportModalOpen} onClose={() => setIsContactSupportModalOpen(false)} />
      <PrintableReceiptModal isOpen={!!selectedReceiptOrder} onClose={() => setSelectedReceiptOrder(null)} order={selectedReceiptOrder} />
      <TrackingModal isOpen={isTrackingModalOpen} onClose={() => { setIsTrackingModalOpen(false); setTrackingOrderId(null); }} orderId={trackingOrderId} />
      <ProvideAddressModal 
        isOpen={!!provideAddressOrderId} 
        onClose={() => setProvideAddressOrderId(null)} 
        orderId={provideAddressOrderId} 
      />
      {isCreateRequestModalOpen && (
        <CreateSourcingRequestModal onClose={() => setIsCreateRequestModalOpen(false)} />
      )}
    </div>
  );
};

export default BuyerDashboard;
