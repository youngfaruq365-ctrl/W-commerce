import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '../../offline/useOffline';

export const OfflineIndicator = ({ isOffline: externalIsOffline }) => {
    const { isOnline, pendingCount, isSyncing, syncNow, checkConnection } = useOffline();
    const isOffline = externalIsOffline !== undefined ? externalIsOffline : !isOnline;

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-0 left-0 w-full z-50 bg-red-600 dark:bg-red-700 shadow-lg text-white"
                >
                    <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <WifiOff size={14} className="animate-pulse" />
                            <span>No Connection &bull; Working Offline</span>
                            {pendingCount > 0 && (
                                <span className="bg-red-900/80 px-2 py-0.5 rounded text-[10px] font-bold lowercase">
                                    {pendingCount} update{pendingCount > 1 ? 's' : ''} queued
                                </span>
                            )}
                        </div>

                        <button
                            onClick={async () => {
                                const ok = await checkConnection();
                                if (ok) await syncNow();
                            }}
                            disabled={isSyncing}
                            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded text-[11px] capitalize active:scale-95 transition-all"
                        >
                            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                            <span>{isSyncing ? 'Syncing...' : 'Retry'}</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
