import { create } from 'zustand';
import axios from 'axios';

axios.defaults.withCredentials = true;

export const useCartStore = create((set, get) => ({
  cartItems: [],
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
        const items = res.data.cart.items.map(i => ({
          id: i.id,
          productId: i.productId,
          title: i.product.title,
          price: (i.product.flashDeals && i.product.flashDeals.length > 0)
            ? Number((i.product.price * (1 - (i.product.flashDeals[0].discount || 0) / 100)).toFixed(2))
            : i.product.price,
          originalPrice: i.product.price,
          discount: (i.product.flashDeals && i.product.flashDeals.length > 0) ? i.product.flashDeals[0].discount : 0,
          quantity: i.quantity,
          variants: i.variants,
          image: i.product.images?.[0]?.url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Ctext x='50' y='54' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='11' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E`,
          seller: i.product.store?.storeName || 'Verified Seller',
          sellerId: i.product.store?.sellerId || null,
          directShippingRate: (() => {
            try {
              if (!i.product.store?.portfolioConfig) return 75.00;
              const config = JSON.parse(i.product.store.portfolioConfig);
              return parseFloat(config.directShippingRate) || 75.00;
            } catch(e) { return 75.00; }
          })()
        }));
        set({ cartItems: items, isLoading: false });
      } else {
        set({ cartItems: [], isLoading: false });
      }
    } catch (err) {
      console.error('fetchCart Error:', err);
      set({ error: err.response?.data?.message || err.message || 'Failed to fetch cart', isLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axios.post('/api/v1/cart/add', { productId, quantity });
      if (res.data.success && res.data.cart) {
        const items = res.data.cart.items.map(i => ({
          id: i.id,
          productId: i.productId,
          title: i.product.title,
          price: (i.product.flashDeals && i.product.flashDeals.length > 0)
            ? Number((i.product.price * (1 - (i.product.flashDeals[0].discount || 0) / 100)).toFixed(2))
            : i.product.price,
          originalPrice: i.product.price,
          discount: (i.product.flashDeals && i.product.flashDeals.length > 0) ? i.product.flashDeals[0].discount : 0,
          quantity: i.quantity,
          variants: i.variants,
          image: i.product.images?.[0]?.url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Ctext x='50' y='54' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='11' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E`,
          seller: i.product.store?.storeName || 'Verified Seller',
          sellerId: i.product.store?.sellerId || null,
          directShippingRate: (() => {
            try {
              if (!i.product.store?.portfolioConfig) return 75.00;
              const config = JSON.parse(i.product.store.portfolioConfig);
              return parseFloat(config.directShippingRate) || 75.00;
            } catch(e) { return 75.00; }
          })()
        }));
        set({ cartItems: items, isLoading: false });
      } else {
        await get().fetchCart();
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to add to cart', isLoading: false });
      throw err;
    }
  },

  updateQuantity: async (productId, quantity, variants = null) => {
    try {
      set({ isLoading: true, error: null });
      if (quantity < 1) {
        set({ isLoading: false });
        return;
      }
      await axios.post('/api/v1/cart/update', { productId, quantity, variants });
      await get().fetchCart();
    } catch (error) {
      console.error('Update quantity error:', error.response?.data || error);
      set({ error: error.response?.data?.message || 'Failed to update quantity' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearCheckoutItems: () => {
    const targetItems = get().lastCheckoutItems;
    if (targetItems && targetItems.length > 0) {
      const remainingItems = get().cartItems.filter(i => !targetItems.includes(i));
      set({ cartItems: remainingItems, lastCheckoutItems: [] });
    }
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
    try {
      set({ isLoading: true, error: null });
      const res = await axios.post('/api/v1/cart/remove', { productId, variants });
      if (res.data.success) {
        await get().fetchCart();
      }
    } catch (err) {
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
      else if (pm === 'cod') endpoint = '/api/v1/payment/cod-order';
      else if (pm === 'flutterwave') endpoint = '/api/v1/payment/flutterwave-intent';
      else if (['klarna', 'afterpay', 'affirm'].includes(pm)) {
        endpoint = '/api/v1/payment/v2/bnpl/initialize';
        orderPayload.provider = pm;
      }

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
