import { useState, useEffect, useCallback } from 'react';
import { apiClient as axios } from '../utils/apiClient';
import { useAuthStore } from '../store/authStore';
import { notificationService } from '../services/notificationService';
import { getSocket } from '../lib/socketClient';

export const useNotifications = () => {
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize with native browser permission status if supported
  const [hasPushPermission, setHasPushPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission === 'granted' 
      : false
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get('/api/v1/notifications/unread');
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async (page = 1) => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/v1/notifications?page=${page}&limit=20`);
      if (page === 1) {
        setNotifications(response.data.notifications || []);
      } else {
        setNotifications((prev) => [...prev, ...(response.data.notifications || [])]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/v1/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const deleteNotification = async (id) => {
    const notif = notifications.find(n => n.id === id);
    try {
      await axios.delete(`/api/v1/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      
      const socket = getSocket();
      
      const handleNotification = (notif) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        try {
          const audio = new Audio('/notification.wav');
          audio.play().catch(e => console.warn('Audio play failed', e));
        } catch (e) {
          console.warn('Audio not supported', e);
        }

        // Show native desktop system notification when enabled
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
    }
  }, [isAuthenticated, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRequestingPush,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPushPermission,
    hasPushPermission,
  };
};

export default useNotifications;
