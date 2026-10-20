/**
 * NotificationBell.jsx
 * Shared real-time notification bell for all dashboards (Buyer, Seller, Admin).
 * Fetches from GET /api/v1/notifications and listens via Socket.io.
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, ShoppingBag, AlertTriangle, Star, Package, DollarSign, Info, MessageSquare, Send } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { getSocket } from '../../lib/socketClient';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const iconMap = {
  ORDER: ShoppingBag,
  DISPUTE: AlertTriangle,
  REVIEW: Star,
  PAYOUT: DollarSign,
  SHIPPING: Package,
  SUCCESS: CheckCheck,
  INFO: Info,
  CART_ADD: ShoppingBag,
  OFFER_ACCEPTED: CheckCheck,
  OFFER_REJECTED: X,
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPushPermission, setHasPushPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false
  );
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [initiallyGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false
  );

  const panelRef = useRef(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [isSending, setIsSending] = useState({});

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const res = await axios.get('/api/v1/notifications');
      if (res.data?.success || res.data?.notifications || res.data?.data) {
        const notifs = res.data.notifications || res.data.data || [];
        setNotifications(notifs);
        setUnread(notifs.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.patch(`/api/v1/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch('/api/v1/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read', err);
    }
  };

  const deleteNotif = async (id, e) => {
    e?.stopPropagation?.();
    const notif = notifications.find(n => n.id === id);
    try {
      await axios.delete(`/api/v1/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.isRead) {
        setUnread(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Failed to delete notification', err);
    }
  };

  const requestPushPermission = async () => {
    if (isRequestingPush) return;
    setIsRequestingPush(true);
    try {
      await notificationService.requestPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setHasPushPermission(Notification.permission === 'granted');
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleQuickReplyChange = (notifId, text) => {
    setReplyTexts(prev => ({ ...prev, [notifId]: text }));
  };

  const sendQuickReply = async (notif, e) => {
    e?.stopPropagation?.();
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
      toast.error('Failed to send quick reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSending(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  const generatePromo = async (notif, e) => {
    e?.stopPropagation?.();
    const percentStr = document.getElementById(`discount-${notif.id}`)?.value;
    const percent = parseInt(percentStr);
    if (!percent || percent <= 0 || percent >= 100) {
      return window.__gxAlert?.('Enter a valid percentage between 1 and 99') ?? console.warn('Enter a valid percentage between 1 and 99');
    }
    
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
      if (res.data?.success) {
        const msg = `Buy now to get ${percent}% off! Use code: ${res.data.promoCode.code} at checkout. Valid for 24 hours.`;
        setReplyTexts(prev => ({ ...prev, [notif.id]: msg }));
      }
    } catch (err) {
      toast.error('Failed to generate promo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSending(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);

      try {
        const audio = new Audio('/notification.wav');
        audio.play().catch(e => console.warn('Audio play failed', e));
      } catch (e) {
        console.warn('Audio not supported', e);
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const title = notif.title || 'W-Commerce';
          const body = notif.message || notif.body || 'You have a new update.';
          const desktopNotif = new Notification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: notif.id || `notif-${Date.now()}`
          });
          desktopNotif.onclick = () => {
            window.focus();
            desktopNotif.close();
          };
        } catch (e) {
          console.debug('Desktop notification error ignored:', e);
        }
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user?.id]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!isOpen) fetchNotifications(); }}
        className="relative icon-3d-glass-box w-10 h-10 shrink-0 flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell size={18} className={unread > 0 ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-gray)] text-black text-xs font-extrabold rounded-full flex items-center justify-center shadow-[0_0_8px_var(--accent-gray-dim)] animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Sidebar Panel Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div key="notif-panel">
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]"
              />
              
              <motion.div 
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed right-0 top-0 w-80 md:w-96 h-screen z-[1000] bg-[var(--bg-secondary)] border-l border-[var(--accent-gray)] shadow-[-10px_0_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex flex-col border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] flex-shrink-0">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-[var(--accent-gray)]" />
                      <h3 className="font-black text-xl text-black">Notifications</h3>
                      {unread > 0 && <span className="px-2 py-0.5 bg-[var(--accent-gray)] text-black text-xs font-extrabold rounded-full">{unread}</span>}
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-black">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="px-5 pb-4 flex gap-2">
                    <button onClick={markAllRead} className="flex-1 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gray)]/20 border border-[var(--accent-gray)] rounded-xl text-sm font-bold text-black transition-colors flex items-center justify-center gap-2">
                      <CheckCheck size={16} /> Mark all read
                    </button>
                    {!initiallyGranted && typeof window !== 'undefined' && 'Notification' in window && (
                      hasPushPermission ? (
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 py-2 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-600 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                          <CheckCheck size={16} /> Push Enabled!
                        </motion.div>
                      ) : (
                        <button 
                          onClick={requestPushPermission} 
                          disabled={isRequestingPush}
                          className="flex-1 py-2 bg-green-100 hover:bg-green-200 disabled:opacity-60 border border-green-300 rounded-xl text-sm font-bold text-green-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isRequestingPush ? (
                            <>
                              <div className="w-4 h-4 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
                              <span>Enabling...</span>
                            </>
                          ) : (
                            <>
                              <Bell size={16} />
                              <span>Enable Push</span>
                            </>
                          )}
                        </button>
                      )
                    )}
                  </div>
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
                    <div className="divide-y divide-[var(--accent-gray)]/30">
                      {notifications.map(notif => {
                        const Icon = iconMap[notif.type] || Info;
                        return (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (!notif.isRead) markRead(notif.id);
                              if (notif.linkUrl) { setIsOpen(false); navigate(notif.linkUrl); }
                            }}
                            className={`flex gap-3 p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer group ${!notif.isRead ? 'bg-[var(--accent-gray)]/10' : ''}`}
                          >
                            <div className={`p-2 rounded-xl flex-shrink-0 self-start ${!notif.isRead ? 'bg-[var(--accent-gray)] shadow-[0_0_15px_var(--accent-gray-dim)] text-black' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold truncate ${!notif.isRead ? 'text-black' : 'text-gray-700'}`}>{notif.title}</h4>
                              {(() => {
                                const bodyText = notif.body || notif.message || '';
                                const audioMatch = bodyText.match(/\[Audio:\s*(https?:\/\/[^\]]+)\]/);
                                const audioUrl = audioMatch ? audioMatch[1] : null;
                                const imageMatch = bodyText.match(/\[Image:\s*(https?:\/\/[^\]]+)\]/);
                                const imageUrl = imageMatch ? imageMatch[1] : null;
                                const cleanBodyText = bodyText.replace(/\[Audio:\s*https?:\/\/[^\]]+\]/, '').replace(/\[Image:\s*https?:\/\/[^\]]+\]/, '').trim();
                                
                                return (
                                  <>
                                    {cleanBodyText && (
                                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{cleanBodyText}</p>
                                    )}
                                    {audioUrl && (
                                      <div className="mt-2 w-full" onClick={e => e.stopPropagation()}>
                                        <audio controls src={audioUrl} className="w-full h-8 [&::-webkit-media-controls-panel]:bg-[var(--bg-tertiary)] [&::-webkit-media-controls-panel]:rounded-lg" />
                                      </div>
                                    )}
                                    {imageUrl && (
                                      <div className="mt-2 w-full" onClick={e => e.stopPropagation()}>
                                        <img src={imageUrl} alt="Notification Image" className="rounded-xl max-h-32 object-cover" />
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              <span className="text-[10px] text-gray-400 font-bold mt-2 block uppercase tracking-wider">
                                {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              
                              {/* Quick Actions (e.g. for Seller) */}
                              {user?.role === 'SELLER' && notif.type === 'MESSAGE' && (
                                <div className="mt-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 mt-2">
                                     <input 
                                        type="text" 
                                        placeholder="Quick reply..." 
                                        value={replyTexts[notif.id] || ''}
                                        onChange={(e) => handleQuickReplyChange(notif.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') sendQuickReply(notif, e);
                                        }}
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
                            <button onClick={(e) => deleteNotif(notif.id, e)} className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100 rounded">
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
