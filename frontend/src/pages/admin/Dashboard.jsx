import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import NotificationBell from '../../components/shared/NotificationBell';
import { 
  Activity, ShieldCheck, Zap, UserCheck, Users, AlertTriangle, 
  Package, Globe, DollarSign, BarChart2, Store, 
  Megaphone, FileText, Menu, X,
  CheckCircle, RefreshCcw, Eye, Trash2, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import SystemStoriesPage from './SystemStories';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', duration: '1_month', maxUses: '' });

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/admin/promos', promoForm);
      setIsCreatingPromo(false);
      setPromoForm({ code: '', duration: '1_month', maxUses: '' });
      fetchTabData(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create promo');
    }
  };

  // Real-time socket events — re-fetch current tab when cross-dashboard events fire
  useSocket({
    'dispute:new':        () => { if (activeTab === 'arbitration') fetchTabData('arbitration'); },
    'order:new':          () => { if (activeTab === 'overview' || activeTab === 'live_tx') fetchTabData(activeTab); },
    'verification:new':   () => { if (activeTab === 'kyb' || activeTab === 'kyc') fetchTabData(activeTab); },
    'payout:requested':   () => { if (activeTab === 'support') fetchTabData('support'); },
    'new_notification':   () => {},
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', label: 'Master Overview', icon: Activity },
    { id: 'escrow', label: 'Escrow Vault', icon: ShieldCheck },
    { id: 'live_tx', label: 'Live Transactions', icon: Zap },
    { id: 'kyb', label: 'KYB Approvals', icon: Store },
    { id: 'kyc', label: 'KYC Approvals', icon: UserCheck },
    { id: 'arbitration', label: 'Dispute Arbitration', icon: AlertTriangle },
    { id: 'hub_logistics', label: 'Hub Logistics', icon: Package },
    { id: 'revenue', label: 'Fee Revenue', icon: DollarSign },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'merchants', label: 'Merchant Management', icon: Store },
    { id: 'support', label: 'Payouts', icon: DollarSign },
    { id: 'reviews', label: 'Review Moderation', icon: Eye },
    { id: 'promo', label: 'Access Promos', icon: Megaphone },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'system_stories', label: 'System Stories', icon: BookOpen },
  ];

  const fetchTabData = useCallback(async (tab) => {
    setIsLoading(true);
    try {
      let result = {};
      if (tab === 'overview') {
        const [generalStats, walletStats] = await Promise.all([
          axios.get('/api/v1/admin/stats'),
          axios.get('/api/v1/admin/wallet-stats')
        ]);
        result = {
          stats: generalStats.data.success ? generalStats.data.stats : {},
          walletStats: walletStats.data.success ? walletStats.data.stats : {}
        };
      } else if (tab === 'escrow' || tab === 'live_tx' || tab === 'revenue') {
        const [walletStats, ledger] = await Promise.all([
          axios.get('/api/v1/admin/wallet-stats'),
          axios.get('/api/v1/admin/ledger')
        ]);
        result = {
          walletStats: walletStats.data.success ? walletStats.data.stats : {},
          ledger: ledger.data.success ? (ledger.data.ledger || ledger.data.data || []) : []
        };
      } else if (tab === 'kyb' || tab === 'kyc') {
        let verReqs = [];
        let couriers = [];
        try {
          const verRes = await axios.get('/api/v1/admin/verifications');
          verReqs = verRes.data.success ? (verRes.data.requests || verRes.data.verifications || verRes.data.data || []) : [];
        } catch (e) {}
        try {
          const courRes = await axios.get('/api/v1/admin/couriers/pending-kyc');
          couriers = courRes.data.success ? (courRes.data.data || []) : [];
        } catch (e) {}
        
        result = { 
          verifications: verReqs,
          couriers: couriers
        };
      } else if (tab === 'arbitration') {
        const dispRes = await axios.get('/api/v1/admin/disputes');
        result = { disputes: dispRes.data.success ? (dispRes.data.disputes || dispRes.data.data || []) : [] };
      } else if (tab === 'hub_logistics') {
        const hubRes = await axios.get('/api/v1/admin/hub-queue');
        result = { hubQueue: hubRes.data.success ? (hubRes.data.queue || hubRes.data.data || []) : [] };
      } else if (tab === 'support') {
        const payRes = await axios.get('/api/v1/admin/payouts');
        result = { payouts: payRes.data.success ? (payRes.data.payouts || payRes.data.data || []) : [] };
      } else if (tab === 'reviews') {
        const revRes = await axios.get('/api/v1/admin/reviews');
        result = { reviews: revRes.data.success ? (revRes.data.reviews || revRes.data.data || []) : [] };
      } else if (tab === 'promo') {
        const promoRes = await axios.get('/api/v1/admin/promos');
        result = { promos: promoRes.data.success ? (promoRes.data.promos || promoRes.data.data || []) : [] };
      } else if (tab === 'analytics') {
        const statsRes = await axios.get('/api/v1/admin/stats');
        result = { stats: statsRes.data.success ? statsRes.data.stats : {} };
      } else if (tab === 'users') {
        const res = await axios.get('/api/v1/admin/users');
        result = { users: res.data.success ? res.data.users : [] };
      } else if (tab === 'merchants') {
        const res = await axios.get('/api/v1/admin/merchants');
        result = { merchants: res.data.success ? res.data.stores : [] };
      } else if (tab === 'audit') {
        const res = await axios.get('/api/v1/admin/audit-logs');
        result = { logs: res.data.success ? res.data.logs : [] };
      }
      setData(result);
    } catch (err) {
      // console.error(`Admin fetch error [${tab}]:`, err);
      setData({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const StatCard = ({ title, value, color = 'text-black', sub }) => (
    <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-colors">
      <h3 className="text-[var(--text-muted)] text-xs mb-2 uppercase tracking-wider">{title}</h3>
      <p className={`text-3xl font-extrabold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  );

  const LoadingState = () => (
    <div className="flex items-center justify-center h-64">
      <RefreshCcw size={32} className="text-[var(--accent-gray)] animate-spin" />
    </div>
  );

  const EmptyState = ({ label }) => (
    <div className="premium-glass h-64 rounded-xl border border-[var(--border-color)] flex items-center justify-center flex-col">
      <CheckCircle size={36} className="text-[var(--text-muted)] mb-3" />
      <p className="text-[var(--text-muted)]">No {label} found.</p>
    </div>
  );

  const renderContent = () => {
    if (isLoading) return <LoadingState />;

    switch (activeTab) {
      case 'overview': {
        const s = data.stats || {};
        const w = data.walletStats || {};
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShieldCheck className="text-[var(--accent-gray)]" /> GX Super Admin</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Escrow TVL" value={w.escrowFunds != null ? `₦${Number(w.escrowFunds).toLocaleString(undefined, {minimumFractionDigits:2})}` : '$0.00'} color="text-[var(--accent-gray)]" />
              <StatCard title="Total Users" value={s.totalUsers ?? '—'} />
              <StatCard title="Total Orders" value={s.totalOrders ?? '—'} />
              <StatCard title="Orders Processing" value={s.ordersProcessing ?? '—'} color="text-yellow-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              <StatCard title="Total Revenue" value={w.totalVolume != null ? `₦${Number(w.totalVolume).toFixed(2)}` : '—'} color="text-gray-400" />
              <StatCard title="Pending Payouts" value={w.pendingPayouts != null ? `₦${Number(w.pendingPayouts).toFixed(2)}` : '—'} color="text-orange-400" />
              <StatCard title="Platform Fee Pool" value={w.platformRevenue != null ? `₦${Number(w.platformRevenue).toFixed(2)}` : '—'} color="text-purple-400" />
            </div>
            <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)]">
              <h3 className="text-xl font-bold mb-4 border-b border-[var(--border-color)] pb-4">Global Network Status</h3>
              <div className="w-full h-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-center relative overflow-hidden">
                <div className="text-center relative z-10">
                  <Globe size={48} className="text-[var(--accent-gray)] mx-auto mb-4 animate-[pulse-gray_3s_ease-in-out_infinite]" />
                  <p className="font-bold tracking-widest text-lg">System Active</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">All services operational</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'escrow':
      case 'live_tx':
      case 'revenue': {
        const w = data.walletStats || {};
        const ledger = data.ledger || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">{activeTab === 'escrow' ? 'Escrow Vault' : activeTab === 'live_tx' ? 'Live Transactions' : 'Fee Revenue'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Escrow Funds Held" value={`₦${Number(w.escrowFunds || 0).toLocaleString(undefined, {minimumFractionDigits:2})}`} color="text-[var(--accent-gray)]" />
              <StatCard title="Total Revenue" value={`₦${Number(w.totalVolume || 0).toFixed(2)}`} color="text-gray-400" />
              <StatCard title="Pending Payouts" value={`₦${Number(w.pendingPayouts || 0).toFixed(2)}`} color="text-orange-400" />
            </div>
            <div className="premium-glass rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="font-bold">Financial Ledger</h3>
                <span className="text-xs text-[var(--text-muted)]">{ledger.length} entries</span>
              </div>
              {ledger.length > 0 ? (
                <div className="divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto">
                  {ledger.slice(0, 50).map((entry, i) => (
                    <div key={i} className="p-4 flex justify-between items-center hover:bg-[var(--bg-tertiary)] transition-colors">
                      <div>
                        <p className="text-sm font-medium">{entry.type || entry.description || 'Transaction'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{new Date(entry.createdAt || entry.date).toLocaleString()}</p>
                      </div>
                      <span className={`font-bold ${entry.amount > 0 ? 'text-gray-400' : 'text-gray-400'}`}> ₦{Math.abs(Number(entry.amount || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState label="ledger entries" />}
            </div>
          </div>
        );
      }

      case 'kyb':
      case 'kyc': {
        const baseVerifications = data.verifications || [];
        const baseCouriers = data.couriers || [];
        
        const mappedCouriers = baseCouriers.map(c => ({
          isCourier: true,
          id: c.id,
          user: { fullName: `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(), email: c.user?.email },
          status: c.kycStatus || 'PENDING',
          type: 'COURIER_KYC',
          createdAt: c.createdAt || new Date()
        }));

        let filtered = [...baseVerifications, ...mappedCouriers];
        
        if (activeTab === 'kyb') {
          filtered = filtered.filter(v => v.status === 'APPROVED');
        } else {
          filtered = filtered.filter(v => v.status !== 'APPROVED');
        }

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{activeTab === 'kyb' ? 'Approved Verifications' : 'Pending Verifications'}</h2>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-bold rounded-full">{filtered.length} {activeTab === 'kyb' ? 'Approved' : 'Pending'}</span>
            </div>
            {filtered.length > 0 ? (
              <div className="space-y-4">
                {filtered.map((v, i) => (
                  <div key={v.id || i} className="premium-glass p-5 rounded-xl border border-[var(--border-color)] flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-black">{v.user?.fullName || v.store?.storeName || 'Unknown'}</p>
                        {v.isCourier && <span className="bg-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Courier</span>}
                        {v.type === 'KYB' && <span className="bg-purple-500/20 text-purple-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Merchant</span>}
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">{v.user?.email || v.email} · Submitted {new Date(v.createdAt).toLocaleDateString()}</p>
                      <p className={`text-xs mt-1 uppercase tracking-wider font-bold ${v.status === 'APPROVED' ? 'text-green-500' : v.status === 'REJECTED' ? 'text-red-500' : 'text-yellow-400'}`}>{v.status || 'PENDING'}</p>
                    </div>
                    <div className="flex gap-2">
                      {v.status === 'PENDING' && (
                        <>
                          <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; 
                            try {
                              if (v.isCourier) {
                                await axios.post(`/api/v1/admin/couriers/${v.id}/kyc-approve`);
                              } else {
                                await axios.post('/api/v1/admin/verifications/process', { requestId: v.id, status: 'APPROVED' }); 
                              }
                              showNotification('Verification Approved Successfully!');
                              fetchTabData(activeTab); 
                            } catch (e) {
                              showNotification(e.response?.data?.message || 'Approval failed', 'error');
                            } finally { e.currentTarget.disabled = false; }
                          }} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-sm font-bold hover:bg-gray-500 hover:text-black transition-all disabled:opacity-50">Approve</button>
                          
                          <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; 
                            try {
                              if (v.isCourier) {
                                await axios.post(`/api/v1/admin/couriers/${v.id}/kyc-reject`);
                              } else {
                                await axios.post('/api/v1/admin/verifications/process', { requestId: v.id, status: 'REJECTED' }); 
                              }
                              showNotification('Verification Rejected', 'error');
                              fetchTabData(activeTab); 
                            } catch (e) {
                              showNotification(e.response?.data?.message || 'Rejection failed', 'error');
                            } finally { e.currentTarget.disabled = false; }
                          }} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-sm font-bold hover:bg-gray-500 hover:text-black transition-all disabled:opacity-50">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <CheckCircle size={40} className="text-gray-500 mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">All Clear</h3>
                <p className="text-[var(--text-muted)]">No pending {activeTab.toUpperCase()} verifications.</p>
              </div>
            )}
          </div>
        );
      }

      case 'arbitration': {
        const disputes = data.disputes || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Dispute Arbitration</h2>
              <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm font-bold rounded-full">{disputes.length} Disputes</span>
            </div>
            {disputes.length > 0 ? (
              <div className="space-y-4">
                {disputes.map((d, i) => (
                  <div key={d.id || i} className="premium-glass p-5 rounded-xl border border-[var(--border-color)]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-black">Dispute #{d.id?.slice(-8) || i + 1}</p>
                        <p className="text-sm text-[var(--text-muted)]">{d.reason} · {new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${d.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-400' : d.status?.includes('RESOLVED') ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/20 text-gray-700'}`}>{d.status}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{d.description}</p>
                    {d.status === 'OPEN' && (
                      <div className="flex gap-2">
                        <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post('/api/v1/admin/disputes/resolve', { disputeId: d.id, status: 'RESOLVED', resolution: 'RESOLVED_REFUNDED', notes: 'Admin resolved in buyer favor' }); fetchTabData(activeTab); } finally { e.currentTarget.disabled = false; } }} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-sm font-bold hover:bg-gray-500 hover:text-black transition-all disabled:opacity-50">Refund Buyer</button>
                        <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post('/api/v1/admin/disputes/resolve', { disputeId: d.id, status: 'RESOLVED', resolution: 'RESOLVED_SELLER_FAVOR', notes: 'Admin resolved in seller favor' }); fetchTabData(activeTab); } finally { e.currentTarget.disabled = false; } }} className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-black transition-all disabled:opacity-50">Favor Seller</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState label="disputes" />}
          </div>
        );
      }

      case 'hub_logistics': {
        const queue = data.hubQueue || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Hub Logistics Queue</h2>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-full">{queue.length} Items</span>
            </div>
            {queue.length > 0 ? (
              <div className="space-y-3">
                {queue.map((item, i) => (
                  <div key={item.id || i} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black">Order #{item.id?.slice(-8) || i + 1}</p>
                      <p className="text-sm text-[var(--text-muted)]">{item.buyer?.fullName || 'Buyer'} · Hub: {item.hubLocation || 'TBD'}</p>
                    </div>
                    <button onClick={async () => { try { await axios.post('/api/v1/admin/hub-queue/consolidate', { orderId: item.id }); fetchTabData(activeTab); } catch (e) { toast.error('Failed to consolidate'); } }} className="px-4 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg text-sm hover:brightness-110 transition-all">Consolidate</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="hub queue items" />}
          </div>
        );
      }

      case 'support': {
        const payouts = data.payouts || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Payout Requests</h2>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm font-bold rounded-full">{payouts.length} Pending</span>
            </div>
            {payouts.length > 0 ? (
              <div className="space-y-3">
                {payouts.map((p, i) => (
                  <div key={p.id || i} className="premium-glass p-5 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black"> ₦{Number(p.amount || 0).toFixed(2)}</p>
                      <p className="text-sm text-[var(--text-muted)]">{p.seller?.fullName || p.user?.fullName} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post('/api/v1/admin/payouts/process', { payoutId: p.id, action: 'APPROVE' }); fetchTabData(activeTab); } catch(err) { toast.error('Failed to approve'); } finally { e.currentTarget.disabled = false; } }} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-sm font-bold hover:bg-gray-500 hover:text-black transition-all disabled:opacity-50">Approve</button>
                      <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post('/api/v1/admin/payouts/process', { payoutId: p.id, action: 'REJECT' }); fetchTabData(activeTab); } catch(err) { toast.error('Failed to reject'); } finally { e.currentTarget.disabled = false; } }} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-sm font-bold hover:bg-gray-500 hover:text-black transition-all disabled:opacity-50">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="payout requests" />}
          </div>
        );
      }

      case 'reviews': {
        const reviews = data.reviews || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Review Moderation</h2>
              <span className="text-sm text-[var(--text-muted)]">{reviews.length} reviews</span>
            </div>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r, i) => (
                  <div key={r.id || i} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400 font-bold">{'★'.repeat(r.rating || 0)}</span>
                        <span className="text-xs text-[var(--text-muted)]">by {r.buyer?.fullName || 'User'}</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] line-clamp-2">{r.comment}</p>
                    </div>
                    <button onClick={async () => { try { await axios.delete(`/api/v1/admin/reviews/${r.id}`); fetchTabData(activeTab); } catch (e) { toast.error('Failed to delete review'); } }} className="ml-4 p-2 text-gray-500 hover:bg-gray-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="reviews" />}
          </div>
        );
      }

      case 'promo': {
        const promos = data.promos || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Access Promo Codes</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-muted)]">{promos.length} codes</span>
                <button onClick={() => setIsCreatingPromo(!isCreatingPromo)} className="px-4 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg text-sm hover:brightness-110 transition-all">
                  {isCreatingPromo ? 'Cancel' : 'Create Promo'}
                </button>
              </div>
            </div>
            
            {isCreatingPromo && (
              <form onSubmit={handleCreatePromo} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] mb-6 flex flex-wrap gap-4 items-end animate-fade-in">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Custom Code (Optional)</label>
                  <input type="text" value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black rounded-lg px-4 py-2 focus:outline-none focus:border-[var(--accent-gray)] transition-colors" placeholder="e.g. VIP2024" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Duration</label>
                  <select value={promoForm.duration} onChange={e => setPromoForm({...promoForm, duration: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black rounded-lg px-4 py-2 focus:outline-none focus:border-[var(--accent-gray)] transition-colors appearance-none">
                    <option value="1_month">1 Month</option>
                    <option value="1_year">1 Year</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Max Uses (Optional)</label>
                  <input type="number" min="1" value={promoForm.maxUses} onChange={e => setPromoForm({...promoForm, maxUses: e.target.value})} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black rounded-lg px-4 py-2 focus:outline-none focus:border-[var(--accent-gray)] transition-colors" placeholder="e.g. 100" />
                </div>
                <button type="submit" className="px-6 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all h-[42px]">Generate</button>
              </form>
            )}

            {promos.length > 0 ? (
              <div className="space-y-3">
                {promos.map((p, i) => (
                  <div key={p.id || i} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black font-mono tracking-widest">{p.code}</p>
                      <p className="text-sm text-[var(--text-muted)]">{p.usedCount || 0} / {p.maxUses || '∞'} uses · {p.isActive ? 'Active' : 'Disabled'}</p>
                    </div>
                    <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.put(`/api/v1/admin/promos/${p.id}/toggle`); fetchTabData(activeTab); } catch(err) { toast.error('Failed to toggle promo'); } finally { e.currentTarget.disabled = false; } }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${p.isActive ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white'}`}>{p.isActive ? 'Disable' : 'Enable'}</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="promo codes" />}
          </div>
        );
      }

      case 'analytics': {
        const s = data.stats || {};
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">Platform Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Users" value={s.totalUsers} />
              <StatCard title="Total Sellers" value={s.totalSellers} color="text-[var(--accent-gray)]" />
              <StatCard title="Total Orders" value={s.totalOrders} />
              <StatCard title="Total Revenue" value={s.totalRevenue != null ? `₦${Number(s.totalRevenue).toFixed(2)}` : '—'} color="text-gray-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Orders Completed" value={s.ordersCompleted} color="text-gray-400" />
              <StatCard title="Orders Processing" value={s.ordersProcessing} color="text-yellow-400" />
              <StatCard title="Orders Disputed" value={s.ordersDisputed} color="text-gray-400" />
            </div>
          </div>
        );
      }

      case 'users': {
        const users = data.users || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">User Management</h2>
              <span className="text-sm text-[var(--text-muted)]">{users.length} total users</span>
            </div>
            {users.length > 0 ? (
              <div className="space-y-3">
                {users.map((u, i) => (
                  <div key={u.id || i} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black">{u.fullName || 'Unknown User'}</p>
                      <p className="text-sm text-[var(--text-muted)]">{u.email} · Role: {u.role}</p>
                      {u.isFlagged && <p className="text-xs text-gray-500 font-bold mt-1">FLAGGED / BANNED</p>}
                    </div>
                    <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post(`/api/v1/admin/users/${u.id}/toggle`); fetchTabData(activeTab); } catch(err) { toast.error('Failed to toggle user status'); } finally { e.currentTarget.disabled = false; } }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${u.isFlagged ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white'}`}>{u.isFlagged ? 'Unban User' : 'Ban User'}</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="users" />}
          </div>
        );
      }

      case 'merchants': {
        const merchants = data.merchants || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Merchant Management</h2>
              <span className="text-sm text-[var(--text-muted)]">{merchants.length} total merchants</span>
            </div>
            {merchants.length > 0 ? (
              <div className="space-y-3">
                {merchants.map((m, i) => (
                  <div key={m.id || i} className="premium-glass p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-black">{m.storeName || 'Unknown Store'}</p>
                      <p className="text-sm text-[var(--text-muted)]">Owner: {m.user?.fullName} ({m.user?.email})</p>
                      <p className={`text-xs font-bold mt-1 ${m.approvalStatus === 'APPROVED' ? 'text-gray-500' : m.approvalStatus === 'SUSPENDED' ? 'text-gray-500' : 'text-yellow-500'}`}>{m.approvalStatus}</p>
                    </div>
                    <button disabled={isLoading} onClick={async (e) => { e.currentTarget.disabled = true; try { await axios.post(`/api/v1/admin/merchants/${m.id}/toggle`); fetchTabData(activeTab); } catch(err) { toast.error('Failed to toggle merchant status'); } finally { e.currentTarget.disabled = false; } }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${m.approvalStatus === 'SUSPENDED' ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white'}`}>{m.approvalStatus === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}</button>
                  </div>
                ))}
              </div>
            ) : <EmptyState label="merchants" />}
          </div>
        );
      }

      case 'audit': {
        const logs = data.logs || [];
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">Audit Logs</h2>
            <div className="premium-glass rounded-xl border border-[var(--border-color)] overflow-hidden">
              {logs.length > 0 ? (
                <div className="divide-y divide-[var(--border-color)] max-h-[600px] overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="p-3 flex gap-4 text-sm hover:bg-[var(--bg-tertiary)] transition-colors">
                      <span className="text-[var(--text-muted)] w-40 flex-shrink-0">{new Date(log.createdAt || log.timestamp).toLocaleString()}</span>
                      <span className={`w-24 flex-shrink-0 font-bold ${log.level === 'ERROR' ? 'text-gray-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-gray-400'}`}>{log.level || 'INFO'}</span>
                      <span className="text-black">{log.message || log.action}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p>No audit logs found.</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'system_stories':
        return <SystemStoriesPage />;

      default:
        return (
          <div className="premium-glass h-64 rounded-xl border border-[var(--border-color)] flex items-center justify-center flex-col animate-fade-in">
            <Activity size={36} className="text-[var(--accent-gray)] mb-3" />
            <p className="text-[var(--text-muted)]">Module loading...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-main)] pt-24 pb-12 px-4 md:px-6 relative">
      {/* Premium Notification Modal */}
      {notification.show && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'error' ? 'bg-gray-950/80 border-gray-900 text-gray-200' : 'bg-gray-950/80 border-gray-900 text-gray-200'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-gray-900/50' : 'bg-gray-900/50'}`}>
            {notification.type === 'error' ? <X size={16} className="text-gray-400" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gray-400 400 rounded-full"></div></div>}
          </div>
          <p className="font-medium tracking-wide">{notification.message}</p>
        </div>
      )}

      <div className="max-w-[1500px] mx-auto relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-4 premium-glass p-4 rounded-xl border border-[var(--border-color)] shadow-lg relative z-50">
          <h2 className="font-bold text-lg">Admin Menu</h2>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-colors">
              <Menu size={20} className="text-[var(--accent-gray)]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <div className={`fixed top-0 h-[100dvh] left-0 z-50 w-72 md:w-64 lg:w-72 transform transition-transform duration-300 ease-out md:relative md:h-auto md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex-shrink-0`}>
            <div className="premium-glass bg-[#111]/95 md:bg-transparent md:p-6 p-4 md:rounded-xl border-r md:border border-gray-500/20 h-full md:h-auto md:sticky top-0 md:top-24 shadow-[30px_0_50px_rgba(0,0,0,0.8)] md:shadow-[0_0_30px_rgba(255,0,0,0.1)] overflow-hidden md:overflow-visible flex flex-col">
              <div className="flex items-center justify-between mb-8 mt-4 md:mt-0">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gray-900 border-2 border-gray-500 flex items-center justify-center text-xl font-bold ${user?.role === 'ADMIN' ? 'shadow-[0_0_15px_rgba(255,0,0,0.5)]' : (user?.isVerified ? 'shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'shadow-[0_0_15px_rgba(255,255,255,0.2)')}`}>
                    {user?.fullName?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-500">{user?.fullName || 'Root Admin'}</h3>
                    <p className="text-xs text-[var(--text-muted)]">Clearance Level 9</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gray)] hover:text-black transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>


              <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto overscroll-contain scrollbar-hide pr-1 pb-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--accent-gray)] text-black shadow-[0_0_15px_var(--accent-gray-dim)] font-bold'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-black border border-transparent hover:border-[var(--border-color)]'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-black' : 'text-[var(--text-muted)]'} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="mt-4 pt-4 border-t border-gray-500/20">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-500/10 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
