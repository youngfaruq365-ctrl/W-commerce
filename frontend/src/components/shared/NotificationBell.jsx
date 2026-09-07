/**
 * NotificationBell.jsx
 * Shared real-time notification bell for all dashboards (Buyer, Seller, Admin).
 * Fetches from GET /api/v1/notifications and listens via Socket.io.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, ShoppingBag, AlertTriangle, Star, Package, DollarSign, Info, MessageSquare, Send } from 'lucide-react';
import axios from 'axios';
import { getSocket } from '../../lib/socketClient';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const iconMap = {
  ORDER: ShoppingBag,
  DISPUTE: AlertTriangle,
  REVIEW: Star,
  PAYOUT: DollarSign,
  SHIPPING: Package,
  SUCCESS: CheckCheck,
  INFO: Info,
  CART_ADD: ShoppingBag,
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [isSending, setIsSending] = useState({});

  const handleQuickReplyChange = (notifId, text) => {
    setReplyTexts(prev => ({ ...prev, [notifId]: text }));
  };

  const sendQuickReply = async (notif, e) => {
    e?.stopPropagation();
    if (!replyTexts[notif.id]?.trim()) return;
    
    const urlParams = new URLSearchParams(notif.linkUrl?.split('?')[1] || '');
    const buyerId = urlParams.get('userId');
    const productId = urlParams.get('productId');
    if (!buyerId) return;

    try {
      setIsSending(prev => ({ ...prev, [notif.id]: true }));
      await axios.post('/api/v1/messages/send', {
        receiverId: buyerId,
        content: replyTexts[notif.id],
        productId: productId
      });
      setReplyTexts(prev => ({ ...prev, [notif.id]: '' }));
      window.__gxAlert?.('Success! Quick reply sent to buyer.') ?? console.warn('Success! Quick reply sent to buyer.');
    } catch (err) {
      alert('Failed to send quick reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSending(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  const generatePromo = async (notif, e) => {
    e.stopPropagation();
    const percentStr = document.getElementById(`discount-${notif.id}`)?.value;
    const percent = parseInt(percentStr);
    if (!percent || percent <= 0 || percent >= 100) return window.__gxAlert?.('Enter a valid percentage between 1 and 99') ?? console.warn('Enter a valid percentage between 1 and 99');
    
    const urlParams = new URLSearchParams(notif.linkUrl?.split('?')[1] || '');
    const productId = urlParams.get('productId');
    
    try {
      setIsSending(prev => ({ ...prev, [notif.id]: true }));
      const codeStr = 'BUYNOW' + Date.now().toString(36).toUpperCase().slice(-6);
      
      const res = await axios.post('/api/v1/promo', {
        code: codeStr,
        discountType: 'PERCENTAGE',
        discountValue: percent,
        productId: productId || null,
        maxUses: 1,
        maxUsesPerUser: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
      
      if (res.data.success) {
        const msg = `Buy now to get ${percent}% off! Use code: ${res.data.promoCode.code} at checkout. Valid for 24 hours.`;
        setReplyTexts(prev => ({ ...prev, [notif.id]: msg }));
      }
    } catch (err) {
      alert('Failed to generate promo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSending(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/v1/notifications');
      if (res.data.success) {
        const notifs = res.data.notifications || res.data.data || [];
        setNotifications(notifs);
        setUnread(notifs.filter(n => !n.isRead).length);
      }
    } catch (err) {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    const socket = getSocket();
    const handleNewNotification = (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnread(prev => prev + 1);
    };
    socket.on('notification', handleNewNotification);
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('new_notification', handleNewNotification);
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await axios.post('/api/v1/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) { /* silent */ }
  };

  const markRead = async (id) => {
    try {
      await axios.post(`/api/v1/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) { /* silent */ }
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/v1/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnread(prev => {
        const wasUnread = notifications.find(n => n.id === id && !n.isRead);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) { /* silent */ }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!isOpen) fetchNotifications(); }}
        className="relative icon-3d-glass-box w-10 h-10 shrink-0 flex items-center justify-center"
      >
        <Bell size={18} className={unread > 0 ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-gray)] text-black text-xs font-extrabold rounded-full flex items-center justify-center shadow-[0_0_8px_var(--accent-gray-dim)] animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute right-0 top-12 w-96 max-h-[480px] z-50 bg-[var(--bg-secondary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
          >
            {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[var(--accent-gray)]" />
              <h3 className="font-bold text-black">Notifications</h3>
              {unread > 0 && <span className="px-2 py-0.5 bg-[var(--accent-gray)] text-black text-xs font-extrabold rounded-full">{unread}</span>}
            </div>
            <button onClick={markAllRead} className="text-xs text-[var(--text-muted)] hover:text-black transition-colors flex items-center gap-1">
              <CheckCheck size={12} /> Mark all read
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-[var(--accent-gray)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)]">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {notifications.slice(0, 30).map(notif => {
                  const Icon = iconMap[notif.type] || Info;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markRead(notif.id);
                        if (notif.linkUrl) {
                          setIsOpen(false);
                          navigate(notif.linkUrl);
                        }
                      }}
                      className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors ${!notif.isRead ? 'bg-[var(--accent-gray)]/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${!notif.isRead ? 'bg-[var(--accent-gray)]/20' : 'bg-[var(--bg-tertiary)]'}`}>
                        <Icon size={14} className={!notif.isRead ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${!notif.isRead ? 'text-black' : 'text-[var(--text-muted)]'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{notif.body || notif.message}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">{new Date(notif.createdAt).toLocaleString()}</p>
                        
                        {notif.type === 'CART_ADD' && (
                          <div className="mt-3 bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] cursor-default" onClick={e => e.stopPropagation()}>
                            <p className="text-xs font-bold text-[var(--text-muted)] mb-2 flex items-center gap-1"><MessageSquare size={12}/> Quick Reply to Buyer</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                               <button 
                                  onClick={() => handleQuickReplyChange(notif.id, 'Do you need more details about the product?')}
                                  className="text-[10px] px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded hover:bg-[var(--accent-gray)]/20 transition-colors text-black"
                               >
                                  Need details?
                               </button>
                               <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded px-1">
                                  <input 
                                     type="number" 
                                     placeholder="%"
                                     id={`discount-${notif.id}`}
                                     className="w-10 bg-transparent text-[10px] text-black text-center focus:outline-none" 
                                  />
                                  <button 
                                     onClick={(e) => generatePromo(notif, e)}
                                     className="text-[10px] px-2 py-1 text-[var(--accent-gray)] font-bold hover:bg-[var(--accent-gray)]/20 transition-colors rounded"
                                  >
                                     Generate
                                  </button>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <input 
                                  type="text" 
                                  value={replyTexts[notif.id] || ''} 
                                  onChange={e => handleQuickReplyChange(notif.id, e.target.value)}
                                  placeholder="Type a message..."
                                  className="flex-1 bg-[var(--bg-tertiary)] text-xs text-black px-3 py-1.5 rounded-lg border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                               />
                               <button 
                                  onClick={(e) => sendQuickReply(notif, e)}
                                  disabled={!replyTexts[notif.id]?.trim() || isSending[notif.id]}
                                  className="bg-[var(--accent-gray)] text-black px-3 rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
                               >
                                  {isSending[notif.id] ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                               </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => deleteNotif(notif.id, e)} className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-gray-700 400 transition-colors opacity-0 group-hover:opacity-100 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
