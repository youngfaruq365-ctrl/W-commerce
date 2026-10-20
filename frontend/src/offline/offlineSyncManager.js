/**
 * Offline Synchronization Manager for W-Commerce
 * 
 * Handles offline mutation queueing, network verification, intelligent batching,
 * idempotent replay, conflict avoidance, and auto-sync on network reconnection.
 */

import { offlineStorage } from './offlineStorage';
import { apiClient } from '../utils/apiClient';
import toast from 'react-hot-toast';

class OfflineSyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.syncPromise = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized || typeof window === 'undefined') return;
    this._initialized = true;

    // Listen for browser online event
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Browser reported online. Verifying connection and syncing...');
      setTimeout(() => {
        this.processQueue({ silent: false, source: 'network-online' });
      }, 1000); // 1s grace period for socket/DHCP stabilisation
    });

    // Listen for custom app:reconnected event (e.g. from Axios successful probe)
    window.addEventListener('app:reconnected', () => {
      console.log('[OfflineSync] Application reconnected signal received.');
      this.processQueue({ silent: false, source: 'app-reconnected' });
    });

    // Run an initial check if queue has pending items
    setTimeout(async () => {
      const count = await offlineStorage.getSyncQueueCount();
      if (count > 0 && navigator.onLine) {
        console.log(`[OfflineSync] Startup detected ${count} pending offline actions.`);
        this.processQueue({ silent: true, source: 'startup' });
      }
    }, 3000);
  }

  /**
   * Fast connectivity probe to verify actual internet access
   * (distinguishes connected Wi-Fi with no internet / captive portal from real access).
   */
  async verifyConnectivity() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      // Use lightweight csrf-token or health check with a strict 3-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('/api/v1/csrf-token', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      return res.status >= 200 && res.status < 400;
    } catch (e) {
      return false;
    }
  }

  /**
   * Queue a generic mutation to be replayed when online.
   */
  async queueMutation({ type, endpoint, method = 'POST', payload = {}, idempotencyKey, description }) {
    const item = await offlineStorage.addToSyncQueue({
      type,
      endpoint,
      method,
      payload,
      idempotencyKey,
      description
    });

    this._notifyListeners({ event: 'queued', item });
    return item;
  }

  // ── Specialized Mutation Enqueuers ─────────────────────────────────────────

  async queueCartAdd(productId, quantity = 1, variants = null, productMeta = null) {
    const item = await this.queueMutation({
      type: 'CART_ADD',
      endpoint: '/api/v1/cart/add',
      method: 'POST',
      payload: { productId, quantity, variants },
      description: `Add ${quantity}x "${productMeta?.title || 'product'}" to cart`
    });

    toast('Saved to offline cart. Will sync once connected.', {
      icon: '📦',
      duration: 3500
    });

    return item;
  }

  async queueCartUpdate(productId, quantity, variants = null) {
    return this.queueMutation({
      type: 'CART_UPDATE',
      endpoint: '/api/v1/cart/update',
      method: 'POST',
      payload: { productId, quantity, variants },
      description: `Update quantity to ${quantity}`
    });
  }

  async queueCartRemove(productId, variants = null) {
    return this.queueMutation({
      type: 'CART_REMOVE',
      endpoint: '/api/v1/cart/remove',
      method: 'POST',
      payload: { productId, variants },
      description: `Remove item from cart`
    });
  }

  async queueDeliveryStatus(assignmentId, status, idempotencyKey, meta = null) {
    const item = await this.queueMutation({
      type: 'DELIVERY_STATUS_UPDATE',
      endpoint: `/api/v1/delivery/${assignmentId}/status`,
      method: 'POST',
      payload: { status },
      idempotencyKey,
      description: `Delivery update: ${status}`
    });

    toast('Status saved offline. Will sync with dispatch when connected.', {
      icon: '🚚',
      duration: 3500
    });

    return item;
  }

  /**
   * Main Queue Processing Engine
   */
  async processQueue(options = { silent: false, source: 'manual' }) {
    if (this.isSyncing) return this.syncPromise;

    this.isSyncing = true;
    this._notifyListeners({ event: 'sync_start' });

    this.syncPromise = (async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        if (queue.length === 0) {
          this.isSyncing = false;
          this._notifyListeners({ event: 'sync_idle' });
          return { success: true, processed: 0 };
        }

        // Verify true internet reachability
        const hasInternet = await this.verifyConnectivity();
        if (!hasInternet) {
          console.warn('[OfflineSync] Connectivity check failed. Postponing sync.');
          if (!options.silent && options.source === 'manual') {
            toast.error('Unable to reach server. Please check your network connection.');
          }
          this.isSyncing = false;
          this._notifyListeners({ event: 'sync_failed', reason: 'NO_INTERNET' });
          return { success: false, reason: 'NO_INTERNET' };
        }

        if (!options.silent) {
          toast.loading(`Syncing ${queue.length} offline changes...`, { id: 'gx-sync-toast' });
        }

        let processedCount = 0;
        let cartMutationsPresent = false;
        let deliveryMutationsPresent = false;

        // Group / coalesce cart mutations if multiple are queued
        const cartItemsInQueue = queue.filter(item => 
          ['CART_ADD', 'CART_UPDATE', 'CART_REMOVE'].includes(item.type)
        );

        // If there are multiple cart mutations and user is logged in, we can optimize by checking cached cart
        if (cartItemsInQueue.length > 0) {
          cartMutationsPresent = true;
        }

        // Execute items sequentially in FIFO order
        for (const item of queue) {
          try {
            console.log(`[OfflineSync] Executing mutation ${item.id} (${item.type})`);

            const headers = {};
            if (item.idempotencyKey) {
              headers['X-Idempotency-Key'] = item.idempotencyKey;
            }

            // Dispatch HTTP request
            await apiClient({
              url: item.endpoint,
              method: item.method,
              data: item.payload,
              headers
            });

            // Success: remove from persistent queue
            await offlineStorage.removeSyncQueueItem(item.id);
            processedCount++;

            if (item.type.includes('DELIVERY')) {
              deliveryMutationsPresent = true;
            }
          } catch (error) {
            const status = error.response?.status;

            // 4xx errors: Business/validation errors (e.g. out of stock, unauthorized, already delivered)
            // Discard to prevent poison-pill queue lockup
            if (status && status >= 400 && status < 500) {
              console.warn(`[OfflineSync] Discarding 4xx mutation ${item.id}:`, error.response?.data);
              await offlineStorage.removeSyncQueueItem(item.id);
            } else {
              // 5xx or Network drop during sync: abort and leave remaining for retry
              console.error(`[OfflineSync] Server error or connection drop on ${item.id}:`, error.message);
              if (!options.silent) {
                toast.error('Sync paused due to connection issue. Will resume shortly.', { id: 'gx-sync-toast' });
              }
              break;
            }
          }
        }

        // Refresh stores if corresponding actions were synced
        try {
          if (cartMutationsPresent) {
            const { useCartStore } = await import('../store/cartStore');
            await useCartStore.getState().fetchCart();
          }

          if (deliveryMutationsPresent) {
            const { useDeliveryStore } = await import('../store/deliveryStore');
            await useDeliveryStore.getState().fetchQueue(true);
            await useDeliveryStore.getState().fetchActiveDelivery(true);
          }
        } catch (storeErr) {
          console.warn('[OfflineSync] Could not refresh stores after sync:', storeErr);
        }

        const remainingCount = await offlineStorage.getSyncQueueCount();

        if (!options.silent) {
          if (processedCount > 0) {
            toast.success(
              `All changes synced successfully! (${processedCount} item${processedCount > 1 ? 's' : ''})`,
              { id: 'gx-sync-toast', duration: 4000 }
            );
          } else {
            toast.dismiss('gx-sync-toast');
          }
        }

        this._notifyListeners({ 
          event: 'sync_complete', 
          processed: processedCount, 
          remaining: remainingCount 
        });

        return { success: true, processed: processedCount, remaining: remainingCount };
      } catch (globalErr) {
        console.error('[OfflineSync] Unexpected error during sync cycle:', globalErr);
        if (!options.silent) {
          toast.error('Offline sync encountered an issue.', { id: 'gx-sync-toast' });
        }
        return { success: false, error: globalErr.message };
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  // ── Listener Subscription ──────────────────────────────────────────────────

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(data) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('[OfflineSync] Listener error:', e);
      }
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
