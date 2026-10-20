import { create } from 'zustand';
import { offlineStorage } from './offlineStorage';
import { offlineSyncManager } from './offlineSyncManager';

export const useOfflineStore = create((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  wasOffline: false,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  isCheckingConnection: false,

  setOnline: (isOnline) => {
    const prev = get().isOnline;
    if (prev === false && isOnline === true) {
      // Transition from offline to online: show back online badge briefly
      set({ isOnline: true, wasOffline: true });
      setTimeout(() => {
        set({ wasOffline: false });
      }, 4000);
    } else {
      set({ isOnline });
    }
  },

  setIsSyncing: (isSyncing) => set({ isSyncing }),

  refreshPendingCount: async () => {
    try {
      const count = await offlineStorage.getSyncQueueCount();
      set({ pendingCount: count });
      return count;
    } catch (e) {
      return 0;
    }
  },

  checkConnection: async () => {
    set({ isCheckingConnection: true });
    try {
      const isActuallyOnline = await offlineSyncManager.verifyConnectivity();
      get().setOnline(isActuallyOnline);
      await get().refreshPendingCount();
      return isActuallyOnline;
    } finally {
      set({ isCheckingConnection: false });
    }
  },

  triggerSync: async (options = { silent: false, source: 'manual' }) => {
    const state = get();
    if (state.isSyncing) return;

    set({ isSyncing: true });
    try {
      const result = await offlineSyncManager.processQueue(options);
      await get().refreshPendingCount();
      set({ 
        isSyncing: false, 
        lastSyncTime: Date.now() 
      });
      return result;
    } catch (e) {
      set({ isSyncing: false });
      throw e;
    }
  }
}));

// Initialize store listeners
if (typeof window !== 'undefined') {
  offlineSyncManager.init();

  // Listen to queue updates dispatched from storage
  window.addEventListener('gx:sync-queue-updated', (e) => {
    if (e.detail && typeof e.detail.count === 'number') {
      useOfflineStore.setState({ pendingCount: e.detail.count });
    }
  });

  // Listen to sync manager lifecycle
  offlineSyncManager.subscribe((data) => {
    if (data.event === 'sync_start') {
      useOfflineStore.setState({ isSyncing: true });
    } else if (data.event === 'sync_complete' || data.event === 'sync_idle' || data.event === 'sync_failed') {
      useOfflineStore.setState({ 
        isSyncing: false, 
        pendingCount: data.remaining ?? 0,
        lastSyncTime: Date.now()
      });
    }
  });

  // Window network events
  window.addEventListener('online', () => {
    useOfflineStore.getState().checkConnection();
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });

  window.addEventListener('app:offline', () => {
    useOfflineStore.getState().setOnline(false);
  });

  // Initial count load
  useOfflineStore.getState().refreshPendingCount();
}
