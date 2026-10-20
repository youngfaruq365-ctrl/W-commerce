import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { resetAllStores } from './resetStores';

// apiClient already has withCredentials=true and CSRF token interceptor

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false, 
  isCheckingAuth: true, // Start true while we check auth on mount

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
        return { success: true, _devCode: response.data._devCode };
      }
      set({ isLoading: false });
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (error) {
      set({ isLoading: false });
      let message = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        message += ': ' + error.response.data.errors.map(e => e.message).join(', ');
      }
      return { success: false, message };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      if (response.data.success || response.data.status === 'success') {
        resetAllStores();
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
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
      return { success: response.data.success, message: response.data.message, _devCode: response.data._devCode };
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
    localStorage.removeItem('token');
    resetAllStores();
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
    return new Promise(() => {}); // hang to prevent subsequent client-side navigation
  },

  checkAuth: async () => {
    try {
      const response = await axios.get('/api/v1/auth/me');
      if (response.data.success || response.data.status === 'success') {
        set({ user: response.data.data?.user || response.data.user || response.data.data, isAuthenticated: true, isCheckingAuth: false });
      } else {
        resetAllStores();
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
      }
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        resetAllStores();
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
      } else {
        // Keep authenticated state if it's a network error or 5xx, or assume failed check for now
        set({ isCheckingAuth: false });
      }
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
      return { success: false, message: error.response?.data?.message || error.message || 'Setup failed' };
    }
  },

  loginWithFingerprint: async (email) => {
    try {
      set({ isLoading: true });
      // 1. Get options from server
      const { data: options } = await axios.get(`/api/v1/webauthn/generate-authentication-options?email=${encodeURIComponent(email)}`);
      
      // 2. Invoke native browser/device biometric prompt
      const asseResp = await startAuthentication({ optionsJSON: options });
      
      // 3. Send response to server for verification
      const verifyRes = await axios.post('/api/v1/webauthn/verify-authentication', { email, response: asseResp });
      
      if (verifyRes.data.verified) {
        // Fetch full user object (verify-authentication sets the cookie)
        const meRes = await axios.get('/api/v1/auth/me');
        if (meRes.data.success) {
          if (verifyRes.data.token || meRes.data.token) {
            localStorage.setItem('token', verifyRes.data.token || meRes.data.token);
          }
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
      // Read the actual backend message, NOT the generic Axios "Request failed with status code 400"
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Passkey login failed';
      return { success: false, message: msg };
    }
  }
}));
