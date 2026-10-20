import { useEffect } from 'react';
import { useOfflineStore } from './offlineStore';

export function useOffline() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const wasOffline = useOfflineStore((state) => state.wasOffline);
  const isSyncing = useOfflineStore((state) => state.isSyncing);
  const pendingCount = useOfflineStore((state) => state.pendingCount);
  const lastSyncTime = useOfflineStore((state) => state.lastSyncTime);
  const isCheckingConnection = useOfflineStore((state) => state.isCheckingConnection);
  const triggerSync = useOfflineStore((state) => state.triggerSync);
  const checkConnection = useOfflineStore((state) => state.checkConnection);
  const refreshPendingCount = useOfflineStore((state) => state.refreshPendingCount);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    isCheckingConnection,
    syncNow: triggerSync,
    checkConnection
  };
}

export default useOffline;
