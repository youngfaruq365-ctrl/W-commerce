import { create } from 'zustand';
import axios from 'axios';

export const useProductStore = create((set) => ({
  products: [],
  flashDeals: [],
  trending: [],
  newArrivals: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });
      // Fetching all products or with query params
      const response = await axios.get('/api/v1/products', { params });
      if (response.data.success) {
        set({ products: response.data.products || [] });
      }
    } catch (err) {
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
