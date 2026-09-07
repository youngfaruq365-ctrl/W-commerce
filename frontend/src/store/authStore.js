import { create } from 'zustand';
import axios from 'axios';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Configure Axios to always send cookies for cross-origin or proxied requests
axios.defaults.withCredentials = true;

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start true while we check auth on mount

  setUser: (user) => set({ user }),

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/v1/auth/signup', { 
        fullName: data.fullName, 
        email: data.email, 
        phone: data.phone,
        password: data.password, 
        role: data.role, 
        termsAccepted: true 
      });
      if (response.data.success) {
        set({ isLoading: false });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || error.response?.data?.error || 'Registration failed' };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      if (response.data.success || response.data.status === 'success') {
        set({
          user: response.data.data?.user || response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true, user: response.data.data?.user || response.data.user };
      }
      set({ isLoading: false });
      return { success: false, message: response.data.message || 'Invalid credentials' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || error.response?.data?.error || 'Login failed' };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await axios.post('/api/v1/auth/forgot-password', { email });
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to send reset code' };
    }
  },

  resetPassword: async (email, code, newPassword) => {
    try {
      const response = await axios.post('/api/v1/auth/reset-password', { email, code, newPassword });
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to reset password' };
    }
  },

  verifyOTP: async (email, code) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/v1/auth/verify-otp', { email, code });
      if (response.data.success || response.data.status === 'success') {
        set({
          isLoading: false,
        });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, message: response.data.message || 'Verification failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || error.response?.data?.error || 'Verification failed' };
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put('/api/v1/auth/update-password', { currentPassword, newPassword });
      set({ isLoading: false });
      return response.data.success;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error updating password', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await axios.post('/api/v1/auth/logout');
    } catch (err) {
      console.warn('Logout request failed, but clearing local state anyway', err);
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      // The browser will automatically attach the HTTP-only cookie if it exists
      const response = await axios.get('/api/v1/auth/me');
      if (response.data.success || response.data.status === 'success') {
        set({ user: response.data.data?.user || response.data.user || response.data.data, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setupFingerprint: async () => {
    try {
      set({ isLoading: true });
      // 1. Get options from server
      const { data: options } = await axios.get('/api/v1/webauthn/generate-registration-options');
      
      // 2. Invoke native scanner
      const attResp = await startRegistration({ optionsJSON: options });
      
      // 3. Send response to server
      const verifyRes = await axios.post('/api/v1/webauthn/verify-registration', attResp);
      
      set({ isLoading: false });
      if (verifyRes.data.verified) {
        return { success: true };
      }
      return { success: false, message: 'Fingerprint verification failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.message || 'Setup failed' };
    }
  },

  loginWithFingerprint: async (email) => {
    try {
      set({ isLoading: true });
      // 1. Get options from server
      const { data: options } = await axios.get(`/api/v1/webauthn/generate-authentication-options?email=${encodeURIComponent(email)}`);
      
      // 2. Invoke native scanner
      const asseResp = await startAuthentication({ optionsJSON: options });
      
      // 3. Send response to server
      const verifyRes = await axios.post('/api/v1/webauthn/verify-authentication', { email, response: asseResp });
      
      if (verifyRes.data.verified) {
        // Need to check auth again to get user details because verify-authentication sets a cookie
        const meRes = await axios.get('/api/v1/auth/me');
        if (meRes.data.success) {
          set({
            user: meRes.data.data?.user || meRes.data.user || meRes.data.data,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, role: verifyRes.data.role, user: meRes.data.data?.user || meRes.data.user || meRes.data.data };
        }
      }
      set({ isLoading: false });
      return { success: false, message: 'Fingerprint verification failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.message || 'Login failed' };
    }
  }
}));
