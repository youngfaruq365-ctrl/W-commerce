import { create } from 'zustand';
import axios from 'axios';

axios.defaults.withCredentials = true;

export const useSellerStore = create((set, get) => ({
  products: [],
  orders: [],
  flashDeals: [],
  analytics: null,

  alerts: [],
  messages: [],
  toPack: [],
  packed: [],
  disputes: [],
  buyers: [],
  buyerRequests: [],
  reviews: [],
  walletSummary: null,
  activeCarts: [],
  activeEngine: (typeof window !== 'undefined' ? localStorage.getItem('activeEngine') : null) || 'commerce',
  isLoading: false,
  error: null,

  fetchActiveCarts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/seller/active-carts');
      if (response.data.success) {
        set({ activeCarts: response.data.activeCarts || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch active carts', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching active carts', isLoading: false });
    }
  },

  setActiveEngine: (engine) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeEngine', engine);
    }
    set({ activeEngine: engine });
  },

  fetchSellerProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/products/my-products');
      if (response.data.success) {
        set({ products: response.data.data || response.data.products || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch products', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching products', isLoading: false });
    }
  },

  fetchSellerOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/orders/seller');
      if (response.data.success) {
        set({ orders: response.data.data || response.data.orders || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch orders', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching orders', isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      // The analytics route is /api/v1/seller/analytics
      const response = await axios.get('/api/v1/seller/analytics?t=' + Date.now());
      set({ analytics: response.data.analytics || response.data.data, isLoading: false });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (!err.response) {
        set({ error: 'Failed to fetch analytics', isLoading: false });
      } else {
        set({ error: err.response?.data?.message || 'Error fetching analytics', isLoading: false });
      }
    }
  },

  fetchStoreConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/stores/profile');
      set({ storeConfig: response.data.data, isLoading: false });
    } catch (err) {
      console.error('Error fetching store config:', err);
      if (!err.response) {
        set({ error: 'Failed to fetch store config', isLoading: false });
      } else {
        set({ error: err.response?.data?.message || 'Error fetching store config', isLoading: false });
      }
    }
  },

  fetchWalletSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/wallet/summary');
      if (response.data.success) {
        set({ walletSummary: response.data.data || response.data.wallet || response.data.summary || null, isLoading: false });
      } else {
        set({ error: 'Failed to fetch wallet summary', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching wallet summary', isLoading: false });
    }
  },

  withdrawFunds: async (amount, destination) => {
    set({ isLoading: true, error: null });
    try {
      const payload = { 
        amount, 
        destination: destination.type || destination, 
        idempotencyKey: `wd_${Date.now()}` 
      };
      if (destination.type === 'BANK_TRANSFER') {
        payload.bankName = destination.bankName;
        payload.accountNumber = destination.accountNumber;
        payload.accountName = destination.accountName;
        payload.bankCode = '044'; // Mocked bank code for Access Bank
      }
      const response = await axios.post('/api/v1/wallet/withdraw', payload);
      if (response.data.success) {
        await get().fetchWalletSummary();
        set({ isLoading: false });
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error processing withdrawal', isLoading: false });
      return false;
    }
  },
  

  fulfillOrder: async (orderId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/orders/update-status', { orderId, status: 'SHIPPED' });
      if (response.data.success) {
        set((state) => ({
          orders: state.orders.map(order =>
            order.id === orderId ? { ...order, status: 'SHIPPED' } : order
          ),
          isLoading: false
        }));
        return true;
      }
      set({ isLoading: false, error: response.data.message || 'Failed to fulfill order' });
      return false;
    } catch (err) {
      console.error('Error fulfilling order:', err);
      set({ error: err.response?.data?.message || 'Error fulfilling order', isLoading: false });
      return false;
    }
  },

  createProduct: async (productData) => {
    try {
      set({ isLoading: true });
      const response = await axios.post('/api/v1/products', productData);
      if (response.data.success) {
        // Fetch products again to update the list
        await useSellerStore.getState().fetchSellerProducts();
        return true;
      }
      return false;
    } catch (err) {
      const msg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ') 
        : err.response?.data?.message || 'Error creating product';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  deleteProduct: async (productId) => {
    try {
      set({ isLoading: true });
      const response = await axios.delete(`/api/v1/products/${productId}`);
      if (response.data.success) {
        set((state) => ({
          products: state.products.filter(p => p.id !== productId),
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting product:', err);
      set({ error: err.response?.data?.message || 'Error deleting product', isLoading: false });
      return false;
    }
  },

  restoreProduct: async (productId, stock) => {
    try {
      set({ isLoading: true });
      const response = await axios.post(`/api/v1/products/restock/${productId}`, { stock });
      if (response.data.success) {
        await useSellerStore.getState().fetchSellerProducts();
        set({ isLoading: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error restoring product:', err);
      set({ error: err.response?.data?.message || 'Error restoring product', isLoading: false });
      return false;
    }
  },

  createFlashDeal: async (dealData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/flash-deals', dealData);
      if (response.data.success) {
        set((state) => ({ flashDeals: [response.data.deal || response.data.flashDeal, ...(state.flashDeals || [])], isLoading: false }));
        return true;
      }
      set({ error: response.data?.message || 'Error creating flash deal', isLoading: false });
      return false;
    } catch (err) {
      const msg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ') 
        : err.response?.data?.message || 'Error creating flash deal';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  updateFlashDeal: async (id, dealData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put(`/api/v1/flash-deals/${id}`, dealData);
      if (response.data.success) {
        set((state) => ({
          flashDeals: (state.flashDeals || []).map(deal => 
            deal.id === id ? (response.data.deal || response.data.flashDeal) : deal
          ),
          isLoading: false
        }));
        return true;
      }
      set({ error: response.data?.message || 'Error updating flash deal', isLoading: false });
      return false;
    } catch (err) {
      const msg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ') 
        : err.response?.data?.message || 'Error updating flash deal';
      set({ error: msg, isLoading: false });
      return false;
    }
  },



  unlockPremiumStore: async (payload) => {
    try {
      set({ isLoading: true });
      const response = await axios.post('/api/v1/stores/premium-unlock', payload);
      if (response.data.success) {
        set({ isLoading: false });
        return true;
      }
      set({ error: response.data?.message || 'Failed to unlock premium store', isLoading: false });
      return false;
    } catch (err) {
      console.error('Error unlocking premium store:', err);
      set({ error: err.response?.data?.message || 'Error unlocking premium store', isLoading: false });
      return false;
    }
  },

  updateStoreConfig: async (configData) => {
    try {
      set({ isLoading: true });
      const response = await axios.put('/api/v1/stores/profile', configData);
      if (response.data.success) {
        set({ isLoading: false });
        return true;
      }
      set({ error: response.data?.message || 'Failed to update store config', isLoading: false });
      return false;
    } catch (err) {
      console.error('Error updating store config:', err);
      set({ error: err.response?.data?.message || 'Error updating store config', isLoading: false });
      return false;
    }
  },

  updateProduct: async (productId, productData) => {
    try {
      set({ isLoading: true });
      const response = await axios.put(`/api/v1/products/${productId}`, productData);
      if (response.data.success) {
        await useSellerStore.getState().fetchSellerProducts();
        return true;
      }
      return false;
    } catch (err) {
      const msg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ') 
        : err.response?.data?.message || 'Error updating product';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  respondToBuyerRequest: async (requestId, responseData) => {
    try {
      set({ isLoading: true });
      const response = await axios.post(`/api/v1/buyer-requests/${requestId}/respond`, responseData);
      if (response.data.success) {
        await useSellerStore.getState().fetchBuyerRequests();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error responding to buyer request:', err);
      set({ error: err.response?.data?.message || 'Error responding to buyer request', isLoading: false });
      return false;
    }
  },

  approvePaymentProof: async (orderId) => {
    try {
      set({ isLoading: true });
      const response = await axios.post(`/api/v1/orders/${orderId}/approve-proof`);
      if (response.data.success) {
        await useSellerStore.getState().fetchSellerOrders();
        set({ isLoading: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error approving payment proof:', err);
      set({ error: err.response?.data?.message || 'Error approving payment', isLoading: false });
      return false;
    }
  },

  rejectPaymentProof: async (orderId, reason) => {
    try {
      set({ isLoading: true });
      const response = await axios.post(`/api/v1/orders/${orderId}/reject-proof`, { reason });
      if (response.data.success) {
        await useSellerStore.getState().fetchSellerOrders();
        set({ isLoading: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error rejecting payment proof:', err);
      set({ error: err.response?.data?.message || 'Error rejecting payment', isLoading: false });
      return false;
    }
  },

  requestOrderAddress: async (orderId) => {
    try {
      set({ isLoading: true });
      const response = await axios.post(`/api/v1/orders/${orderId}/request-address`);
      if (response.data.success) {
        set({ isLoading: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error requesting order address:', err);
      set({ error: err.response?.data?.message || 'Error requesting order address', isLoading: false });
      return false;
    }
  },


  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/seller/performance-alerts');
      if (response.data.success) {
        set({ alerts: response.data.data || response.data.alerts || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch alerts', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching alerts', isLoading: false });
    }
  },

  fetchMessages: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/messages/recent');
      if (response.data.success) {
        set({ messages: response.data.data || response.data.messages || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch messages', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching messages', isLoading: false });
    }
  },

  fetchPackingOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const [toPackRes, packedRes] = await Promise.all([
        axios.get('/api/v1/packing/to-pack'),
        axios.get('/api/v1/packing/packed')
      ]);
      
      set({ 
        toPack: toPackRes.data.data || toPackRes.data.orders || [],
        packed: packedRes.data.data || packedRes.data.orders || [],
        isLoading: false 
      });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching packing orders', isLoading: false });
    }
  },

  packOrder: async (orderId) => {
    try {
      set({ isLoading: true });
      const response = await axios.post('/api/v1/packing/pack', { orderId });
      if (response.data.success) {
        await useSellerStore.getState().fetchPackingOrders();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error packing order', isLoading: false });
      return false;
    }
  },

  fetchDisputes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/disputes');
      if (response.data.success) {
        set({ disputes: response.data.data || response.data.disputes || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch disputes', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching disputes', isLoading: false });
    }
  },

  respondToDispute: async (disputeId, responseData) => {
    try {
      set({ isLoading: true });
      const response = await axios.put(`/api/v1/disputes/${disputeId}/respond`, responseData);
      if (response.data.success) {
        set({ isLoading: false });
        get().fetchDisputes();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error responding to dispute:', err);
      set({ error: err.response?.data?.message || 'Error responding to dispute', isLoading: false });
      return false;
    }
  },

  fetchBuyers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/buyers/buyers');
      if (response.data.success) {
        set({ buyers: response.data.data || response.data.buyers || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch buyers', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching buyers', isLoading: false });
    }
  },

  fetchBuyerRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/buyer-requests');
      if (response.data.success) {
        set({ buyerRequests: response.data.data || response.data.requests || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch buyer requests', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching buyer requests', isLoading: false });
    }
  },

  fetchReviews: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/v1/reviews/seller');
      if (response.data.success) {
        set({ reviews: response.data.data || response.data.reviews || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch reviews', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching reviews', isLoading: false });
    }
  }
}));
