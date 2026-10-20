import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';

export const useBuyerStore = create((set, get) => ({
  orders: [],
  wishlist: [],
  wallet: null,
  walletTransactions: [],
  savedShops: [],
  messages: [],
  disputes: [],
  reviews: [],
  notifications: [],
  buyerRequests: [],
  profile: null,
  isLoading: false,
  error: null,

  resetBuyerStore: () => set({
    orders: [],
    wishlist: [],
    wallet: null,
    walletTransactions: [],
    savedShops: [],
    messages: [],
    disputes: [],
    reviews: [],
    notifications: [],
    buyerRequests: [],
    profile: null,
    isLoading: false,
    error: null,
  }),



  fetchOrderById: async (orderId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`/api/v1/orders/${orderId}`);
      if (response.data.success) {
        set({ isLoading: false });
        return response.data.order;
      }
      return null;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching order details', isLoading: false });
      return null;
    }
  },

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/user/profile');
      if (response.data.success) {
        set({ profile: response.data.user || null, isLoading: false });
      } else {
        set({ error: 'Failed to fetch profile', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching profile', isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put('/api/v1/user/profile', data);
      if (response.data.success) {
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error updating profile', isLoading: false });
      return false;
    }
  },

  addAddress: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/user/address', data);
      if (response.data.success) {
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error adding address', isLoading: false });
      return false;
    }
  },

  deleteAccount: async (confirmation, reason) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/user/delete-account', { confirmation, reason });
      if (response.data.success) {
        set({
          orders: [], wishlist: [], wallet: null, walletTransactions: [],
          savedShops: [], messages: [], disputes: [], reviews: [],
          notifications: [], profile: null,
          isLoading: false, error: null
        });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error deleting account', isLoading: false });
      return false;
    }
  },

  fetchOrders: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/orders/buyer');
      if (response.data.success) {
        set({ orders: response.data.data || response.data.orders || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch orders', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching orders', isLoading: false });
    }
  },

  confirmReceipt: async (orderId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/orders/confirm-receipt', { orderId });
      if (response.data.success) {
        // Optimistically update orders
        set((state) => ({
          orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'COMPLETED' } : o),
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error confirming receipt', isLoading: false });
      return false;
    }
  },

  raiseDispute: async (orderId, reason, description, evidenceUrls = [], extraData = {}) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/disputes', { orderId, reason, description, evidenceUrls, ...extraData });
      if (response.data.success) {
        set((state) => ({
          orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'DISPUTED' } : o),
          isLoading: false
        }));
        // Refresh disputes list
        await get().fetchDisputes();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error raising dispute', isLoading: false });
      return false;
    }
  },

  fetchWishlist: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/wishlist');
      set({ wishlist: response.data.items || response.data.data || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching wishlist', isLoading: false });
    }
  },

  removeFromWishlist: async (productId) => {
    try {
      await axios.delete('/api/v1/wishlist', { data: { productId } });
      set((state) => ({
        wishlist: state.wishlist.filter(item => item.productId !== productId && item.product?.id !== productId)
      }));
      return true;
    } catch (err) {
      return false;
    }
  },

  addToWishlist: async (productId, priority = 1, targetPrice = null) => {
    try {
      set({ isLoading: true });
      const response = await axios.post('/api/v1/wishlist', { productId, priority, targetPrice });
      if (response.data.success || response.data.item) {
        await get().fetchWishlist();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error adding to wishlist', isLoading: false });
      return false;
    }
  },

  addToCartFromWishlist: async (productId, quantity = 1) => {
    try {
      await axios.post('/api/v1/cart/add', { productId, quantity });
      return true;
    } catch (err) {
      return false;
    }
  },

  fetchWallet: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/wallet/summary');
      if (response.data.success) {
        set({ wallet: response.data.summary || response.data.data || response.data.wallet || null, isLoading: false });
      } else {
        set({ error: 'Failed to fetch wallet', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching wallet', isLoading: false });
    }
  },

  
  setWithdrawPin: async (pin) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/v1/wallet/set-pin', { pin });
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to set PIN', isLoading: false });
      throw err;
    }
  },

  forgotWithdrawPin: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/v1/wallet/forgot-pin');
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to send OTP', isLoading: false });
      throw err;
    }
  },

  resetWithdrawPin: async (otp, newPin) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/v1/wallet/reset-pin', { otp, newPin });
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to reset PIN', isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  fetchWalletTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/wallet/transactions');
      if (response.data.success) {
        set({ walletTransactions: response.data.data || response.data.transactions || [], isLoading: false });
      } else {
        set({ error: 'Failed to fetch wallet transactions', isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching wallet transactions', isLoading: false });
    }
  },

  fetchSavedShops: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/user/following');
      set({ savedShops: response.data.data || response.data.following || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching saved shops', isLoading: false });
    }
  },

  fetchMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/messages/conversations');
      set({ messages: response.data.data || response.data.conversations || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching messages', isLoading: false });
    }
  },

  fetchDisputes: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/disputes');
      set({ disputes: response.data.data || response.data.disputes || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching disputes', isLoading: false });
    }
  },

  fetchReviews: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/reviews/my-reviews');
      set({ reviews: response.data.data || response.data.reviews || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching reviews', isLoading: false });
    }
  },

  fetchBuyerRequests: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/buyer-requests/my');
      set({ buyerRequests: response.data.data || response.data.requests || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching buyer requests', isLoading: false });
    }
  },

  createBuyerRequest: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/buyer-requests', data);
      if (response.data.success) {
        await get().fetchBuyerRequests();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error creating buyer request', isLoading: false });
      return false;
    }
  },

  submitReview: async (productId, orderId, rating, comment) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post('/api/v1/reviews', { productId, orderId, rating, comment });
      if (response.data.success || response.data.review) {
        set({ isLoading: false });
        await get().fetchReviews();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error submitting review', isLoading: false });
      return false;
    }
  },

  uploadPaymentProof: async (orderId, file) => {
    try {
      set({ isLoading: true });
      const formData = new FormData();
      formData.append('proof', file);
      const response = await axios.post(`/api/v1/orders/${orderId}/upload-proof`, formData);
      if (response.data.success) {
        set({ isLoading: false });
        await get().fetchOrders();
        return true;
      }
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error uploading proof', isLoading: false });
      return false;
    }
  },

  fetchNotifications: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get('/api/v1/notifications');
      set({ notifications: response.data.data || response.data.notifications || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error fetching notifications', isLoading: false });
    }
  },

  interactWithNotification: async (notificationId, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.post(`/api/v1/notifications/${notificationId}/interact`, data);
      
      // Update the local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? response.data.notification : n
        ),
        isLoading: false
      }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error interacting with notification', isLoading: false });
      return false;
    }
  }
}));
