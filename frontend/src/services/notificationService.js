import OneSignal from 'react-onesignal';
import toast from 'react-hot-toast';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

class NotificationService {
  isInitialized = false;
  initPromise = null;

  init() {
    if (!ONESIGNAL_APP_ID) {
      if (import.meta.env.DEV) console.warn('OneSignal App ID not found in environment');
      return Promise.resolve();
    }

    if (this.isInitialized) return Promise.resolve();
    // Dedupe concurrent calls (React StrictMode / multiple mounts)
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true, // For local dev
          notifyButton: {
            enable: false, // We use our own UI for subscribing
          },
        });
        this.isInitialized = true;
        if (import.meta.env.DEV) console.log('OneSignal initialized successfully');
      } catch (error) {
        // OneSignal can fail gracefully (e.g. unconfigured origin in dev) without breaking the app
        this.isInitialized = false;
        if (import.meta.env.DEV) {
          console.info('OneSignal init skipped or not supported on this origin:', error?.message || error);
        }
      }
    })();
    return this.initPromise;
  }

  async loginUser(userId) {
    if (!this.isInitialized) return;
    try {
      await OneSignal.login(userId);
      if (import.meta.env.DEV) console.log(`OneSignal logged in user: ${userId}`);
    } catch (error) {
      console.debug('OneSignal login ignored:', error?.message);
    }
  }

  async logoutUser() {
    if (!this.isInitialized) return;
    try {
      await OneSignal.logout();
      if (import.meta.env.DEV) console.log('OneSignal logged out');
    } catch (error) {
      console.debug('OneSignal logout ignored:', error?.message);
    }
  }

  async requestPermission() {
    const hasNativeSupport = typeof window !== 'undefined' && 'Notification' in window;
    if (!hasNativeSupport) {
      toast.error('Push notifications are not supported by this browser.', { duration: 4000 });
      return false;
    }

    // If permission is already granted
    if (Notification.permission === 'granted') {
      toast.success('Push notifications are already enabled!');
      return true;
    }

    // If permission was previously blocked by the user
    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked in your browser settings. Please allow notifications for this site.', { duration: 6000 });
      return false;
    }

    // Attempt OneSignal prompt if initialized
    if (this.isInitialized) {
      try {
        if (OneSignal?.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          await OneSignal.Notifications.requestPermission();
        } else if (OneSignal?.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
          await OneSignal.Slidedown.promptPush();
        }
      } catch (error) {
        console.debug('OneSignal prompt skipped or failed, falling back to browser prompt:', error?.message);
      }
    }

    // Request native browser notification permission (works on localhost, HTTPS, and PWA)
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notification permission was blocked in browser settings.', { duration: 5000 });
        return false;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      toast.error('Failed to request notification permission.');
      return false;
    }
  }
}

export const notificationService = new NotificationService();

