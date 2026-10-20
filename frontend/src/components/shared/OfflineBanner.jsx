import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useOffline } from '../../offline/useOffline';

export const OfflineBanner = () => {
  const {
    isOnline,
    wasOffline,
    isSyncing,
    pendingCount,
    isCheckingConnection,
    syncNow,
    checkConnection
  } = useOffline();

  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state whenever network status changes
  useEffect(() => {
    setIsDismissed(false);
  }, [isOnline]);

  const showOfflineModal = !isOnline && !isDismissed;
  const showBackOnlineAlert = isOnline && wasOffline;
  const showPendingSyncAlert = isOnline && !wasOffline && pendingCount > 0 && !isDismissed;

  return (
    <AnimatePresence>
      {/* ── Offline Mode Slide-Up Overlay Modal ────────────────────── */}
      {showOfflineModal && (
        <motion.div
          key="offline-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsDismissed(true)}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
        >
          <motion.div
            key="offline-modal-card"
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md neu-panel rounded-3xl p-5 sm:p-6 border border-amber-500/30 dark:border-amber-500/20 shadow-2xl bg-[var(--bg-primary)] text-[var(--text-main)] relative overflow-hidden"
          >
            {/* Ambient amber glow accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <WifiOff className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg tracking-tight text-[var(--text-main)]">
                      Offline Mode
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Live Protection
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                    No active internet connection
                  </p>
                </div>
              </div>

              {/* Close / Cancel Button */}
              <button
                onClick={() => setIsDismissed(true)}
                className="p-2 rounded-full neu-button text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
                title="Cancel / Dismiss"
                aria-label="Cancel offline modal"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              Changes are saved safely to your device and will sync automatically once your connection is restored.
            </p>

            {pendingCount > 0 && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-semibold mb-5">
                <AlertCircle size={16} className="shrink-0 text-amber-500" />
                <span>{pendingCount} action{pendingCount > 1 ? 's' : ''} queued locally and ready to sync.</span>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsDismissed(true)}
                className="flex-1 py-2.5 px-4 rounded-xl neu-button text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                onClick={() => checkConnection()}
                disabled={isCheckingConnection}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                <span>{isCheckingConnection ? 'Checking...' : 'Check Connection'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Just Reconnected Slide-Up Toast (Bottom Right) ───────────── */}
      {showBackOnlineAlert && (
        <motion.div
          key="reconnected-toast"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-6 z-50 neu-panel bg-emerald-600 text-white font-medium px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm select-none border border-emerald-400/30"
        >
          <span className="p-1.5 bg-white/20 rounded-xl">
            <Wifi className="w-4 h-4 text-white" />
          </span>
          <div className="flex flex-col">
            <span className="font-bold">Back Online!</span>
            <span className="text-white/90 text-xs">Connection restored. Data is synchronizing.</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-white/90 shrink-0 ml-2" />
        </motion.div>
      )}

      {/* ── Pending Sync Floating Alert (Bottom Left) ────────────────── */}
      {showPendingSyncAlert && (
        <motion.div
          key="pending-sync-toast"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 left-6 z-50 neu-panel bg-[var(--bg-primary)] border border-blue-500/30 text-[var(--text-main)] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm select-none"
        >
          <span className="p-1.5 bg-blue-500/20 text-blue-500 rounded-xl">
            <AlertCircle className="w-4 h-4" />
          </span>
          <span className="font-medium">
            <strong>{pendingCount}</strong> queued change{pendingCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#006cff] text-white hover:bg-blue-600 active:scale-95 transition-all text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
