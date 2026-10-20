import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, ShoppingBag, ShoppingCart, ArrowLeft, CheckCircle2, Clock, Smartphone } from 'lucide-react';
import { useOffline } from '../../offline/useOffline';
import { offlineStorage } from '../../offline/offlineStorage';

const Offline = () => {
  const navigate = useNavigate();
  const { isOnline, isSyncing, pendingCount, checkConnection, syncNow } = useOffline();
  const [cachedProductCount, setCachedProductCount] = useState(0);
  const [cachedCartCount, setCachedCartCount] = useState(0);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    async function loadOfflineSummary() {
      try {
        const products = await offlineStorage.getProducts();
        setCachedProductCount(products.length);

        const cart = await offlineStorage.getCart();
        setCachedCartCount(cart.length);

        const queue = await offlineStorage.getSyncQueue();
        setSyncQueue(queue);
      } catch (e) {
        console.warn('Error loading offline summary:', e);
      }
    }
    loadOfflineSummary();
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    const connected = await checkConnection();
    setIsChecking(false);
    if (connected) {
      await syncNow();
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl w-full bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border-2 border-[var(--border-color)] overflow-hidden"
      >
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <div className="p-6 sm:p-10 text-center">
          {/* Animated Icon */}
          <div className="mx-auto w-20 h-20 bg-amber-500/10 dark:bg-amber-400/10 rounded-full flex items-center justify-center border-2 border-amber-500/30 mb-6 relative">
            <WifiOff className="w-10 h-10 text-amber-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center">
              !
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] mb-3 tracking-tight">
            You're Currently Offline
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-lg mx-auto mb-8">
            Don't worry — W-Commerce works offline! Any actions like adding to cart or updating delivery records are safely saved locally on your device and will sync automatically once you're reconnected.
          </p>

          {/* Offline Local Cache Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
            <div
              onClick={() => navigate('/')}
              className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/50 hover:border-amber-500/50 hover:bg-[var(--bg-primary)] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">Cached Catalog</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {cachedProductCount > 0 ? `${cachedProductCount} products saved locally` : 'Browse stored items'}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                You can browse products you recently viewed without an internet connection.
              </p>
            </div>

            <div
              onClick={() => navigate('/cart')}
              className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/50 hover:border-amber-500/50 hover:bg-[var(--bg-primary)] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">Your Offline Cart</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {cachedCartCount > 0 ? `${cachedCartCount} items in cart` : 'View saved items'}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Add and manage items offline. We'll secure them in your cloud cart upon reconnection.
              </p>
            </div>
          </div>

          {/* Pending Sync Queue preview if any */}
          {syncQueue.length > 0 && (
            <div className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-[var(--text-main)]">Pending Offline Actions ({syncQueue.length})</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                  Awaiting Sync
                </span>
              </div>
              <ul className="text-xs text-[var(--text-muted)] space-y-1">
                {syncQueue.slice(0, 3).map((item, idx) => (
                  <li key={item.id || idx} className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{item.description || item.type}</span>
                  </li>
                ))}
                {syncQueue.length > 3 && (
                  <li className="text-[11px] text-amber-500 font-semibold pl-3.5">
                    + {syncQueue.length - 3} more actions queued
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Troubleshooting Checklist */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)]/40 border border-[var(--border-color)] mb-8 text-left text-xs text-[var(--text-muted)] flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[var(--text-main)] mb-1">Quick Troubleshooting</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Verify your Wi-Fi or mobile data toggle is turned ON.</li>
                <li>If on public Wi-Fi, ensure you have completed any login portal prompt.</li>
                <li>Try toggling Airplane Mode on and off.</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              disabled={isChecking || isSyncing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking || isSyncing ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Connection...' : isSyncing ? 'Syncing...' : 'Retry Connection'}</span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/80 text-[var(--text-main)] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Offline;
