import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';
import { offlineStorage } from '../offline/offlineStorage';

export const useProductStore = create((set) => ({
  products: [],
  flashDeals: [],
  trending: [],
  newArrivals: [],
  categories: [],
  isLoading: false,
  error: null,
  isOfflineCache: false,

  fetchProducts: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });
      // Fetching all products or with query params
      const response = await axios.get('/api/v1/products', { params });
      if (response.data.success) {
        const products = response.data.products || [];
        set({ products, isOfflineCache: false });
        // Asynchronously persist to IndexedDB offline storage
        offlineStorage.saveProducts(products);
      }
    } catch (err) {
      // Offline fallback: retrieve cached catalog from IndexedDB
      try {
        const cachedProducts = await offlineStorage.getProducts();
        if (cachedProducts && cachedProducts.length > 0) {
          console.log('[ProductStore] Loaded cached products for offline browsing:', cachedProducts.length);
          set({ products: cachedProducts, isOfflineCache: true, error: null });
          return;
        }
      } catch (cacheErr) {
        console.warn('[ProductStore] Cache retrieval error:', cacheErr);
      }
      set({ error: err.response?.data?.message || 'Error fetching products' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFlashDeals: async () => {
    try {
      set({ isLoading: true });
      // Assuming a specific endpoint or query param for flash deals
      const response = await axios.get('/api/v1/products', { params: { format: 'flash' } });
      if (response.data.success) {
        set({ flashDeals: response.data.products || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTrending: async () => {
    try {
      set({ isLoading: true });
      const response = await axios.get('/api/v1/products', { params: { sort: '-views' } });
      if (response.data.success) {
        set({ trending: response.data.products || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchNewArrivals: async () => {
    try {
      set({ isLoading: true });
      const response = await axios.get('/api/v1/products', { params: { sort: '-createdAt' } });
      if (response.data.success) {
        set({ newArrivals: response.data.products || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchCategories: async () => {
    try {
      set({ isLoading: true });
      const response = await axios.get('/api/v1/products/categories');
      if (response.data.success) {
        set({ categories: response.data.categories || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  }
}));
