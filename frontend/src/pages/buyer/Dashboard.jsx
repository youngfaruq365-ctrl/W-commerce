import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, ShoppingBag, History, Heart, Store, MessageSquare, 
  Wallet, RefreshCcw, ShieldAlert, Star, Truck, PackageCheck, 
  CreditCard, MapPin, Bell, Lock, Settings, HelpCircle, Menu, X, ShieldCheck, Plus, Key
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBuyerStore } from '../../store/buyerStore';
import { useSocket } from '../../hooks/useSocket';
import NotificationBell from '../../components/shared/NotificationBell';
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
import { subscribeToPushNotifications } from '../../utils/pushService';
import { registerPasskey } from '../../utils/webauthnService';
import { showNotification } from '../../utils/notifications';
import BuyerDisputesTab from '../../components/buyer/Dashboard/BuyerDisputesTab';
import SavedAddresses from '../../modules/buyer/SavedAddresses';

const BuyerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = React.useRef(null);
  const { 
    orders, wishlist, wallet, walletTransactions, savedShops, messages, disputes, reviews, notifications, profile,
    fetchOrders, fetchWishlist, fetchWallet, fetchWalletTransactions, fetchSavedShops, fetchMessages, fetchDisputes, fetchReviews, fetchNotifications, fetchProfile, confirmReceipt, interactWithNotification, removeFromWishlist, addToCartFromWishlist, uploadPaymentProof
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
      const verifyEndpoint = fundingProvider === 'paystack' 
        ? `/api/v1/wallet/fund/paystack/verify/${reference}`
        : `/api/v1/wallet/fund/flutterwave/verify/${reference}`;
        
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
          window.__gxAlert?.('Failed to verify wallet funding.') ?? toast.error('Failed to verify wallet funding.');
        })
        .finally(() => {
          // Remove the query parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
    
    const action = searchParams.get('action');
    const actionOrderId = searchParams.get('orderId');
    if (action === 'provide_address' && actionOrderId) {
      setProvideAddressOrderId(actionOrderId);
    }
  }, [location.search]);

  const [activeTab, setActiveTab] = useState('overview');
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
  const [orderToDispute, setOrderToDispute] = useState(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [provideAddressOrderId, setProvideAddressOrderId] = useState(null);

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
          fetchDisputes(), fetchReviews(), fetchNotifications()
        ]);
      } catch (e) {} finally {
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
        if (['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status)) {
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
            <h2 className="text-2xl font-bold mb-6">Buyer Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Active Escrows', value: stats.activeEscrows.toString(), color: 'text-[var(--accent-gray)]' },
                { title: 'Total Spent', value: `NGN ${stats.totalSpent.toFixed(2)}`, color: 'text-black' },
                { title: 'Saved Items', value: stats.savedItems.toString(), color: 'text-yellow-500' },
                { title: 'Hub Items', value: stats.hubItems.toString(), color: 'text-purple-500' }
              ].map((stat, i) => (
                <div key={i} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover-3d hover:border-[var(--accent-gray)] transition-colors">
                  <h3 className="text-[var(--text-muted)] text-sm mb-2">{stat.title}</h3>
                  <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 premium-glass p-6 rounded-xl border border-[var(--border-color)]">
               <h3 className="text-xl font-bold mb-4 border-b border-[var(--border-color)] pb-4">Recent Hub Activity</h3>
               <div className="space-y-4">
                  {orders.filter(o => o.isConsolidated).slice(0,3).map(order => (
                     <div key={order.id} className="flex justify-between items-center p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-lg border border-[var(--accent-gray)] flex items-center justify-center shadow-[0_0_10px_var(--accent-gray-dim)]">
                              <PackageCheck className="text-[var(--accent-gray)]" />
                           </div>
                           <div>
                              <p className="font-bold">{order.items?.[0]?.product?.title || 'Consolidated Item'}</p>
                              <p className="text-sm text-[var(--text-muted)]">Order #{order.id.slice(0,8).toUpperCase()}</p>
                           </div>
                        </div>
                        <span className="text-[var(--text-muted)] text-sm">{order.status}</span>
                     </div>
                  ))}
                  {orders.filter(o => o.isConsolidated).length === 0 && (
                     <p className="text-[var(--text-muted)] text-sm">No recent hub activity.</p>
                  )}
               </div>
            </div>
          </div>
        );
      case 'active_orders':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Active Orders</h2>
            {orders && orders.filter(o => ['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length > 0 ? (
              <div className="space-y-4">
                {orders.filter(o => ['PENDING', 'AWAITING_DIRECT_PAYMENT', 'AWAITING_TRANSFER', 'PENDING_VERIFICATION', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).map(order => (
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
                               <img src={item.product?.images?.[0]?.url || item.product?.images?.[0] || 'https://placehold.co/100x100/111/333?text=No+Image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="product" />
                            </div>
                            <div>
                               <p className="font-bold text-lg line-clamp-1">{item.product?.title}</p>
                               <p className="text-[var(--text-muted)] mt-1">Qty: {item.quantity} Ã— NGN {item.priceAtTime || item.price}</p>
                               {item.variantOptions && <p className="text-sm text-gray-700 mt-1">{item.variantOptions}</p>}
                               {(item.product?.store?.location || item.product?.store?.country) && (
                                 <p className="text-sm text-[var(--accent-gray)] mt-2 flex items-center gap-1 font-bold">
                                    <MapPin size={14} /> 
                                    Seller Location: {item.product.store.location || item.product.store.country} 
                                    <span className="mx-2 text-gray-600">|</span> 
                                    Pickup Port: {item.product.store.shipPort || 'GlobalX Hub'}
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
                           <p className="text-xl font-extrabold text-black"> NGN {parseFloat(order.totalAmount || 0).toFixed(2)}</p>
                         </div>
                         {(order.paymentStatus === 'PAID' || ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) && (
                            <button 
                              onClick={() => setSelectedReceiptOrder(order)}
                              className="px-6 py-3 min-h-[44px] bg-[var(--text-main)] text-black text-sm font-bold rounded shadow hover:opacity-90 flex items-center gap-2 ml-4"
                            >
                              View Receipt
                            </button>
                         )}
                       </div>
                       <div className="flex items-center gap-4">
                         {order.status !== 'PENDING' && (
                            <button 
                              onClick={() => {
                                 setTrackingOrderId(order.id); setIsTrackingModalOpen(true);
                              }}
                              className="px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:border-[var(--accent-gray)] transition-colors text-sm"
                            >
                              Track Order
                            </button>
                         )}
                         {order.status === 'SHIPPED' && (
                           <button 
                             onClick={() => confirmReceipt(order.id)}
                             className="px-6 py-3 min-h-[44px] bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-colors text-sm"
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
                        <img src={item.product?.images?.[0] || 'https://placehold.co/400x300/111/333?text=No+Image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="product" />
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
                     <h3 className="text-5xl font-extrabold text-black tracking-tight"> NGN {parseFloat(wallet?.balance || 0).toFixed(2)}</h3>
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
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'CREDIT' ? 'bg-gray-500/20 text-gray-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        {tx.type === 'CREDIT' ? <RefreshCcw size={20} /> : <Wallet size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-black capitalize">{(tx.referenceType || '').toLowerCase()} - {tx.type}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-extrabold text-lg ${tx.type === 'CREDIT' ? 'text-gray-500' : 'text-black'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}NGN {parseFloat(tx.amount).toFixed(2)}
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
                          <img src={order.items?.[0]?.product?.images?.[0] || 'https://placehold.co/100x100/111/333?text=No+Image'} className="w-full h-full object-cover grayscale" alt="product" />
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
      case 'tracking':
        return (
          
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Delivery Tracking</h2>
            {orders && orders.filter(o => o.status === 'SHIPPED').length > 0 ? (
              <div className="space-y-6">
                {orders.filter(o => o.status === 'SHIPPED').map(order => (
                  <div key={order.id} className="premium-glass p-6 rounded-xl border border-[var(--accent-gray)]/30">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border-color)]">
                       <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center border border-[var(--accent-gray)]">
                          <Truck size={24} className="text-[var(--accent-gray)]" />
                       </div>
                       <div>
                          <p className="text-[var(--text-muted)] text-sm">Tracking Number</p>
                          <p className="font-bold text-lg text-black font-mono tracking-wider">{order.trackingNumber || 'PENDING-UPDATE'}</p>
                       </div>
                    </div>
                    
                    <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-[var(--border-color)]">
                       {order.trackingEvents && order.trackingEvents.length > 0 ? (
                         order.trackingEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((event, index) => (
                           <div key={event.id || index} className={`relative ${index !== 0 ? 'opacity-50' : ''}`}>
                              <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full ${index === 0 ? 'bg-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]'}`}></div>
                              <p className="font-bold text-black">{event.status} {event.location ? `- ${event.location}` : ''}</p>
                              <p className="text-sm text-[var(--text-muted)]">{event.description || 'Status updated'}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                           </div>
                         ))
                       ) : (
                         <div className="relative">
                            <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)]"></div>
                            <p className="font-bold text-black">Pending Update</p>
                            <p className="text-sm text-[var(--text-muted)]">Awaiting tracking details from carrier.</p>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <Truck size={40} className="text-[var(--text-muted)] mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Tracking Updates</h3>
                <p className="text-[var(--text-muted)]">Orders currently in transit will appear here with live tracking.</p>
              </div>
            )}
          </div>
        );
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
                        <img src={order.items?.[0]?.product?.images?.[0] || 'https://placehold.co/100x100/111/333?text=Item'} className="w-full h-full object-cover" alt="product" />
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
                       <img src={shop.avatar || 'https://placehold.co/100x100/111/333?text=Store'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="store" />
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
                        <img src={msg.otherUser?.avatarUrl || 'https://placehold.co/50x50/111/333?text=User'} className="w-full h-full object-cover" alt="user" />
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
                {notifications.map(notif => (
                   <div key={notif.id} className="premium-glass p-5 rounded-xl border border-[var(--border-color)]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-black">{notif.title}</span>
                        <span className="text-xs text-[var(--text-muted)]">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700">{notif.message}</p>
                      
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
                ))}
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
                  <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-gray)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2"><Key size={18} /> Passkey Setup</h3>
                  <p className="text-[var(--text-muted)] text-sm">Use biometrics to login faster.</p>
                </div>
                <button onClick={() => setPasskeySetup(true)} className="px-6 py-3 min-h-[44px] border border-[var(--border-color)] rounded-lg text-sm font-bold hover:bg-[var(--bg-tertiary)]">Setup Passkey</button>
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
                  <input type="checkbox" className="sr-only peer" checked={emailNotifEnabled} onChange={() => setEmailNotifEnabled(!emailNotifEnabled)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-gray)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Promotional Emails</h3>
                  <p className="text-[var(--text-muted)] text-sm">Receive exclusive deals and offers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={promoEnabled} onChange={() => setPromoEnabled(!promoEnabled)} />
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-gray)] opacity-5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-gray-500 opacity-5 blur-[100px]"></div>
      </div>
      <div className="fixed top-0 left-0 h-full w-20 bg-white/50 backdrop-blur-xl border-r border-[var(--border-color)] flex flex-col items-center py-8 z-50 hidden md:flex">
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
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between px-6 sticky top-0 z-40">
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
      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} />
      <CreateDisputeModal isOpen={isDisputeModalOpen} onClose={() => setIsDisputeModalOpen(false)} order={orderToDispute} />
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
    </div>
  );
};

export default BuyerDashboard;
