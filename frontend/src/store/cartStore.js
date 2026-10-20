import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';
import { offlineStorage } from '../offline/offlineStorage';
import { offlineSyncManager } from '../offline/offlineSyncManager';

axios.defaults.withCredentials = true;

const mapCartItem = (i) => {
  const dealDiscount = (i.product.flashDeals && i.product.flashDeals.length > 0)
    ? Number(i.product.flashDeals[0].discount || 0)
    : (Number(i.product.discountPercentage) || 0);
  const basePrice = Number(i.product.price || 0);
  const price = dealDiscount > 0
    ? Number((basePrice * (1 - dealDiscount / 100)).toFixed(2))
    : basePrice;

  return {
    id: i.id,
    productId: i.productId,
    title: i.product.title,
    price,
    originalPrice: basePrice,
    discount: dealDiscount,
    quantity: i.quantity,
    stock: i.product.stock,
    variants: i.variants,
    image: i.product.images?.[0]?.url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Ctext x='50' y='54' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='11' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E`,
    seller: i.product.store?.storeName || 'Verified Seller',
    sellerId: i.product.store?.sellerId || null,
    directShippingRate: parseFloat(i.product.shippingFee) || 0
  };
};

export const useCartStore = create((set, get) => ({
  cartItems: [],
  lastCheckoutItems: [],   // items from the last direct-bank checkout, cleared on success
  isLoading: false,
  error: null,

  // Phase 11: two-step checkout session state
  checkoutSession: null,        // full session object from /initiate
  sessionToken: null,           // token for /confirm call
  sessionExpiresAt: null,       // ISO string

  fetchCart: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axios.get('/api/v1/cart?_t=' + Date.now());
      if (res.data.success && res.data.cart) {
        const items = res.data.cart.items.map(mapCartItem);
        set({ cartItems: items, isLoading: false });
        // Cache to IndexedDB
        offlineStorage.saveCart(items);
      } else {
        set({ cartItems: [], isLoading: false });
        offlineStorage.saveCart([]);
      }
    } catch (err) {
      console.warn('fetchCart network error, checking offline cache:', err.message);
      // Fallback: load cart from IndexedDB offline storage
      try {
        const cachedCart = await offlineStorage.getCart();
        if (cachedCart && cachedCart.length > 0) {
          console.log('[CartStore] Loaded offline cached cart:', cachedCart.length, 'items');
          set({ cartItems: cachedCart, isLoading: false, error: null });
          return;
        }
      } catch (cacheErr) {
        console.warn('[CartStore] Offline cart read error:', cacheErr);
      }
      set({ error: err.response?.data?.message || err.message || 'Failed to fetch cart', isLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1, variants = null) => {
    // If browser is offline, handle immediately via offline manager
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return get()._addOffline(productId, quantity, variants);
    }

    try {
      set({ isLoading: true, error: null });
      const res = await axios.post('/api/v1/cart/add', { productId, quantity, variants });
      if (res.data.success && res.data.cart) {
        const items = res.data.cart.items.map(mapCartItem);
        set({ cartItems: items, isLoading: false });
        offlineStorage.saveCart(items);
      } else {
        await get().fetchCart();
      }
    } catch (err) {
      // If network failure (server unreachable or sudden connection drop), save offline!
      if (!err.response) {
        console.warn('[CartStore] Network drop during addToCart, switching to offline queue');
        return get()._addOffline(productId, quantity, variants);
      }
      set({ error: err.response?.data?.message || 'Failed to add to cart', isLoading: false });
      throw err;
    }
  },

  _addOffline: async (productId, quantity = 1, variants = null) => {
    try {
      const product = await offlineStorage.getProductById(productId);
      const currentItems = [...get().cartItems];
      const existingIdx = currentItems.findIndex(i => i.productId === productId);

      let updatedItems;
      if (existingIdx >= 0) {
        updatedItems = currentItems.map((item, idx) => 
          idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        const newItem = {
          id: `offline_item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          productId,
          title: product?.title || 'Selected Product',
          price: product?.price || 0,
          originalPrice: product?.price || 0,
          discount: product?.discountPercentage || 0,
          quantity,
          stock: product?.stock || 99,
          variants,
          image: product?.images?.[0]?.url || product?.imageUrl || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Ctext x='50' y='54' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='11' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E`,
          seller: product?.store?.storeName || 'Verified Seller',
          sellerId: product?.store?.sellerId || null,
          directShippingRate: parseFloat(product?.shippingFee) || 0
        };
        updatedItems = [...currentItems, newItem];
      }

      set({ cartItems: updatedItems, isLoading: false, error: null });
      await offlineStorage.saveCart(updatedItems);
      await offlineSyncManager.queueCartAdd(productId, quantity, variants, product);
    } catch (e) {
      console.error('[CartStore] _addOffline error:', e);
      set({ isLoading: false });
    }
  },

  updateQuantity: async (productId, quantity, variants = null) => {
    if (quantity < 1) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const updated = get().cartItems.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
      set({ cartItems: updated });
      await offlineStorage.saveCart(updated);
      await offlineSyncManager.queueCartUpdate(productId, quantity, variants);
      return;
    }

    try {
      set({ isLoading: true, error: null });
      await axios.post('/api/v1/cart/update', { productId, quantity, variants });
      await get().fetchCart();
    } catch (error) {
      if (!error.response) {
        // Network drop: persist locally and queue
        const updated = get().cartItems.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        );
        set({ cartItems: updated, isLoading: false });
        await offlineStorage.saveCart(updated);
        await offlineSyncManager.queueCartUpdate(productId, quantity, variants);
        return;
      }
      console.error('Update quantity error:', error.response?.data || error);
      set({ error: error.response?.data?.message || 'Failed to update quantity', isLoading: false });
    }
  },

  clearCheckoutItems: () => {
    const targetItems = get().lastCheckoutItems;
    if (targetItems && targetItems.length > 0) {
      const remainingItems = get().cartItems.filter(i => !targetItems.includes(i));
      set({ cartItems: remainingItems, lastCheckoutItems: [] });
    }
  },

  clearCart: () => {
    set({ cartItems: [] });
    offlineStorage.saveCart([]);
  },

  verifyCartPrices: async () => {
    try {
      set({ isLoading: true, error: null });
      const items = get().cartItems;
      if (items.length === 0) {
        set({ isLoading: false });
        return { success: true, hasChanges: false, changes: [] };
      }

      const res = await axios.post('/api/v1/cart/verify', { items });
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to verify cart prices', isLoading: false });
      return { success: false, hasChanges: false, changes: [] };
    }
  },

  removeFromCart: async (productId, variants = null) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const remaining = get().cartItems.filter(item => item.productId !== productId);
      set({ cartItems: remaining });
      await offlineStorage.saveCart(remaining);
      await offlineSyncManager.queueCartRemove(productId, variants);
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const res = await axios.post('/api/v1/cart/remove', { productId, variants });
      if (res.data.success) {
        await get().fetchCart();
      }
    } catch (err) {
      if (!err.response) {
        // Network drop: remove locally and queue
        const remaining = get().cartItems.filter(item => item.productId !== productId);
        set({ cartItems: remaining, isLoading: false });
        await offlineStorage.saveCart(remaining);
        await offlineSyncManager.queueCartRemove(productId, variants);
        return;
      }
      set({ error: err.response?.data?.message || 'Failed to remove from cart', isLoading: false });
    }
  },

  // ── Phase 11: Two-step checkout ──────────────────────────────────────────────

  /**
   * Step 1 — Initiate checkout.
   * Sends cart to backend, gets back a grouped session (items grouped by seller,
   * per-seller subtotals, shipping, promo discount, grand total).
   * No database writes happen here.
   *
   * @param {Object} options - { promoCode, paymentMethod, addressId, addressData, notes }
   * @returns {Object} - { sessionToken, expiresAt, session }
   */
  initiateCheckout: async (options = {}) => {
    try {
      set({ isLoading: true, error: null, checkoutSession: null, sessionToken: null });

      const res = await axios.post('/api/v1/checkout/initiate', {
        promoCode:     options.promoCode     || null,
        paymentMethod: options.paymentMethod || 'PAYSTACK',
        addressId:     options.addressId     || null,
        addressData:   options.addressData   || null,
        notes:         options.notes         || null,
      });

      if (res.data.success) {
        set({
          checkoutSession:  res.data.session,
          sessionToken:     res.data.sessionToken,
          sessionExpiresAt: res.data.expiresAt,
          isLoading: false,
        });
        return res.data;
      }
      throw new Error('Failed to initiate checkout');

    } catch (err) {
      set({ error: err.response?.data?.message || 'Checkout initiation failed', isLoading: false });
      throw err;
    }
  },

  /**
   * Step 2 — Confirm checkout.
   * Sends the sessionToken from initiateCheckout back to the backend.
   * Backend commits the MarketplaceOrder + FulfillmentOrders atomically.
   * Clears cart on success.
   *
   * @param {string} [idempotencyKey] - optional client idempotency key
   * @returns {Object} - { marketplaceOrder, fulfillmentOrders, summary }
   */
  confirmCheckout: async (idempotencyKey) => {
    try {
      set({ isLoading: true, error: null });

      const token = get().sessionToken;
      if (!token) throw new Error('No checkout session. Please call initiateCheckout first.');

      // Idempotency key: use provided or generate from session token
      const iKey = idempotencyKey || `ck-confirm-${token}-${Date.now()}`;

      const res = await axios.post('/api/v1/checkout/confirm', {
        sessionToken:   token,
        idempotencyKey: iKey,
      });

      if (res.data.success) {
        // Clear cart and session state
        set({
          cartItems:        [],
          checkoutSession:  null,
          sessionToken:     null,
          sessionExpiresAt: null,
          isLoading: false,
        });
        return res.data;
      }
      throw new Error('Failed to confirm checkout');

    } catch (err) {
      set({ error: err.response?.data?.message || 'Checkout confirmation failed', isLoading: false });
      throw err;
    }
  },

  /** Clear any active checkout session (e.g. user navigates away from checkout). */
  clearCheckoutSession: () => {
    set({ checkoutSession: null, sessionToken: null, sessionExpiresAt: null });
  },

  // ── Legacy single-step checkout (kept for backward compat) ───────────────────
  checkout: async (shippingOptions) => {
    try {
      set({ isLoading: true, error: null });
      
      const allCartItems = get().cartItems;
      if (allCartItems.length === 0) throw new Error("Cart is empty");

      const targetItems = shippingOptions.sellerOnly ? allCartItems.filter(i => i.seller === shippingOptions.sellerOnly) : allCartItems;
      if (targetItems.length === 0) throw new Error("No items selected for checkout");

      const orderPayload = {
        items: targetItems.map(item => ({
          id: item.productId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          seller: item.seller,
          sellerId: item.sellerId
        })),
        shippingAddress: shippingOptions.shippingAddress || null,
        paymentMethod: shippingOptions.paymentMethod === 'direct_bank' ? 'BANK_TRANSFER' : (shippingOptions.paymentMethod || 'escrow'),
        isConsolidated: shippingOptions.isConsolidated || false,
        gamificationReward: shippingOptions.gamificationReward || null,
        promoCode: shippingOptions.promoCode || null,
        sellerName: shippingOptions.sellerOnly || undefined
      };

      let endpoint = '/api/v1/payment/create-intent';
      const pm = shippingOptions.paymentMethod;
      if (pm === 'direct_bank') endpoint = shippingOptions.sellerOnly ? '/api/v1/orders/direct' : '/api/v1/payment/bank-transfer';
      else if (pm === 'wallet') endpoint = '/api/v1/payment/pay-wallet';
      else if (pm === 'monnify') endpoint = '/api/v1/payment/monnify-intent';
      else if (pm === 'cod') endpoint = '/api/v1/payment/cod-order';
      else if (pm === 'flutterwave') endpoint = '/api/v1/payment/flutterwave-intent';
      else if (pm === 'paystack') orderPayload.gateway = 'PAYSTACK';

      let idempotencyKey = sessionStorage.getItem('checkout_idempotency');
      if (!idempotencyKey) {
        idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem('checkout_idempotency', idempotencyKey);
      }

      const res = await axios.post(endpoint, orderPayload, { headers: { 'Idempotency-Key': idempotencyKey } });
      if (res.data.success) {
        sessionStorage.removeItem('checkout_idempotency');
        if (pm !== 'direct_bank') {
          const remainingItems = allCartItems.filter(i => !targetItems.includes(i));
          set({ cartItems: remainingItems, isLoading: false });
        } else {
          // For direct_bank, save the target items so we can clear them later
          set({ lastCheckoutItems: targetItems, isLoading: false });
        }
        return res.data; // Return full response for redirect handling
      }
      throw new Error("Failed to create order");
    } catch (err) {
      set({ error: err.response?.data?.message || 'Checkout failed', isLoading: false });
      throw err;
    }
  }
}));
