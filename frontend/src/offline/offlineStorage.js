/**
 * IndexedDB Offline Storage for W-Commerce
 * 
 * Provides fast, asynchronous, structured storage for:
 * - Product catalogs & cached search results
 * - Cart items and local modifications
 * - Courier deliveries & queues
 * - Offline mutation queues awaiting network sync
 * - General metadata with TTL support
 * 
 * Transparently falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'w_commerce_offline_v1';
const DB_VERSION = 1;

const STORES = {
  PRODUCTS: 'products',
  CART: 'cart',
  DELIVERIES: 'deliveries',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata'
};

class OfflineStorage {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    if (!this.isIndexedDBAvailable) {
      console.warn('[OfflineStorage] IndexedDB unavailable, falling back to localStorage');
      return Promise.resolve(null);
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Products store (keyed by product id)
          if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
            const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
            productStore.createIndex('category', 'category', { unique: false });
            productStore.createIndex('updatedAt', 'cachedAt', { unique: false });
          }

          // Cart store (singleton or item keyed)
          if (!db.objectStoreNames.contains(STORES.CART)) {
            db.createObjectStore(STORES.CART, { keyPath: 'id' });
          }

          // Deliveries store (keyed by assignmentId or type)
          if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
            db.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
          }

          // Sync Queue store (auto-increment id or UUID keyPath)
          if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
            queueStore.createIndex('type', 'type', { unique: false });
          }

          // Metadata key-value store
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('[OfflineStorage] Failed to open IndexedDB:', event.target.error);
          this.db = null;
          resolve(null);
        };
      } catch (err) {
        console.error('[OfflineStorage] Initialization error:', err);
        this.db = null;
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // ── Generic IndexedDB Helpers ──────────────────────────────────────────────

  async _performTx(storeName, mode, callback) {
    const db = await this.init();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = callback(store);

        tx.oncomplete = () => resolve(request?.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Products Cache ─────────────────────────────────────────────────────────

  async saveProducts(products = []) {
    if (!Array.isArray(products) || products.length === 0) return;
    try {
      const db = await this.init();
      if (!db) {
        // LocalStorage fallback (limit to top 30 to save quota)
        const trimmed = products.slice(0, 30);
        localStorage.setItem('gx_offline_products', JSON.stringify(trimmed));
        return;
      }

      const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORES.PRODUCTS);
      const now = Date.now();

      for (const product of products) {
        if (!product || !product.id) continue;
        store.put({
          ...product,
          cachedAt: now
        });
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('[OfflineStorage] Error saving products:', e);
    }
  }

  async getProducts() {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_products');
        return raw ? JSON.parse(raw) : [];
      }

      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PRODUCTS, 'readonly');
        const store = tx.objectStore(STORES.PRODUCTS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('[OfflineStorage] Error getting products:', e);
      return [];
    }
  }

  async getProductById(id) {
    if (!id) return null;
    try {
      const db = await this.init();
      if (!db) {
        const products = await this.getProducts();
        return products.find(p => p.id === id) || null;
      }

      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PRODUCTS, 'readonly');
        const store = tx.objectStore(STORES.PRODUCTS);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('[OfflineStorage] Error getting product by id:', e);
      return null;
    }
  }

  // ── Cart Cache ─────────────────────────────────────────────────────────────

  async saveCart(cartItems = []) {
    try {
      const payload = {
        id: 'user_cart',
        items: cartItems,
        updatedAt: Date.now()
      };

      const db = await this.init();
      if (!db) {
        localStorage.setItem('gx_offline_cart', JSON.stringify(payload));
        return;
      }

      const tx = db.transaction(STORES.CART, 'readwrite');
      const store = tx.objectStore(STORES.CART);
      store.put(payload);

      // Also mirror to localStorage for instantaneous sync
      localStorage.setItem('gx_offline_cart', JSON.stringify(payload));
    } catch (e) {
      console.warn('[OfflineStorage] Error saving cart:', e);
    }
  }

  async getCart() {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_cart');
        return raw ? JSON.parse(raw).items || [] : [];
      }

      return new Promise((resolve) => {
        const tx = db.transaction(STORES.CART, 'readonly');
        const store = tx.objectStore(STORES.CART);
        const request = store.get('user_cart');

        request.onsuccess = () => {
          if (request.result && Array.isArray(request.result.items)) {
            resolve(request.result.items);
          } else {
            const raw = localStorage.getItem('gx_offline_cart');
            resolve(raw ? JSON.parse(raw).items || [] : []);
          }
        };
        request.onerror = () => {
          const raw = localStorage.getItem('gx_offline_cart');
          resolve(raw ? JSON.parse(raw).items || [] : []);
        };
      });
    } catch (e) {
      console.warn('[OfflineStorage] Error getting cart:', e);
      return [];
    }
  }

  // ── Deliveries Cache (Courier & Buyer tracking) ─────────────────────────────

  async saveDeliveryData(key, data) {
    try {
      const record = { id: key, data, updatedAt: Date.now() };
      const db = await this.init();
      if (!db) {
        localStorage.setItem(`gx_delivery_${key}`, JSON.stringify(record));
        return;
      }
      const tx = db.transaction(STORES.DELIVERIES, 'readwrite');
      tx.objectStore(STORES.DELIVERIES).put(record);
    } catch (e) {
      console.warn('[OfflineStorage] Error saving delivery data:', e);
    }
  }

  async getDeliveryData(key) {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem(`gx_delivery_${key}`);
        return raw ? JSON.parse(raw).data : null;
      }
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.DELIVERIES, 'readonly');
        const req = tx.objectStore(STORES.DELIVERIES).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  // ── Offline Sync Mutation Queue ─────────────────────────────────────────────

  async addToSyncQueue(mutation) {
    const item = {
      id: mutation.id || `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: mutation.type,
      endpoint: mutation.endpoint,
      method: (mutation.method || 'POST').toUpperCase(),
      payload: mutation.payload || {},
      idempotencyKey: mutation.idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      description: mutation.description || mutation.type
    };

    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_sync_queue');
        const queue = raw ? JSON.parse(raw) : [];
        queue.push(item);
        localStorage.setItem('gx_offline_sync_queue', JSON.stringify(queue));
        window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count: queue.length } }));
        return item;
      }

      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.put(item);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });

      const count = await this.getSyncQueueCount();
      window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count } }));
      return item;
    } catch (e) {
      console.error('[OfflineStorage] Error adding to sync queue:', e);
      return null;
    }
  }

  async getSyncQueue() {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_sync_queue');
        return raw ? JSON.parse(raw) : [];
      }

      return new Promise((resolve) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.getAll();
        req.onsuccess = () => {
          // Sort chronologically (oldest first for FIFO execution)
          const items = req.result || [];
          items.sort((a, b) => a.timestamp - b.timestamp);
          resolve(items);
        };
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('[OfflineStorage] Error getting sync queue:', e);
      return [];
    }
  }

  async removeSyncQueueItem(id) {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_sync_queue');
        if (raw) {
          const queue = JSON.parse(raw).filter(item => item.id !== id);
          localStorage.setItem('gx_offline_sync_queue', JSON.stringify(queue));
          window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count: queue.length } }));
        }
        return;
      }

      await new Promise((resolve) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });

      const count = await this.getSyncQueueCount();
      window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count } }));
    } catch (e) {
      console.warn('[OfflineStorage] Error removing item from sync queue:', e);
    }
  }

  async clearSyncQueue() {
    try {
      const db = await this.init();
      if (!db) {
        localStorage.removeItem('gx_offline_sync_queue');
        window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count: 0 } }));
        return;
      }

      await new Promise((resolve) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        tx.objectStore(STORES.SYNC_QUEUE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });

      window.dispatchEvent(new CustomEvent('gx:sync-queue-updated', { detail: { count: 0 } }));
    } catch (e) {
      console.warn('[OfflineStorage] Error clearing sync queue:', e);
    }
  }

  async getSyncQueueCount() {
    try {
      const db = await this.init();
      if (!db) {
        const raw = localStorage.getItem('gx_offline_sync_queue');
        return raw ? (JSON.parse(raw) || []).length : 0;
      }

      return new Promise((resolve) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const req = tx.objectStore(STORES.SYNC_QUEUE).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      });
    } catch (e) {
      return 0;
    }
  }

  // ── Key-Value Metadata with TTL ────────────────────────────────────────────

  async setMeta(key, value, ttlSeconds = null) {
    try {
      const record = {
        key,
        value,
        expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
      };

      const db = await this.init();
      if (!db) {
        localStorage.setItem(`gx_meta_${key}`, JSON.stringify(record));
        return;
      }

      const tx = db.transaction(STORES.METADATA, 'readwrite');
      tx.objectStore(STORES.METADATA).put(record);
    } catch (e) {
      console.warn(`[OfflineStorage] Error setting meta ${key}:`, e);
    }
  }

  async getMeta(key) {
    try {
      const db = await this.init();
      let record = null;

      if (!db) {
        const raw = localStorage.getItem(`gx_meta_${key}`);
        record = raw ? JSON.parse(raw) : null;
      } else {
        record = await new Promise((resolve) => {
          const tx = db.transaction(STORES.METADATA, 'readonly');
          const req = tx.objectStore(STORES.METADATA).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      if (!record) return null;

      // Check TTL expiration
      if (record.expiresAt && Date.now() > record.expiresAt) {
        if (!db) {
          localStorage.removeItem(`gx_meta_${key}`);
        } else {
          const tx = db.transaction(STORES.METADATA, 'readwrite');
          tx.objectStore(STORES.METADATA).delete(key);
        }
        return null;
      }

      return record.value;
    } catch (e) {
      return null;
    }
  }
}

export const offlineStorage = new OfflineStorage();
