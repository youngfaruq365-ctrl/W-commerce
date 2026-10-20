import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';

export const useWalletStore = create((set) => ({
  balance: 0,
  currency: 'NGN',
  rewards: [],
  transactions: [],
  isLoading: false,
  error: null,
  
  fetchWallet: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axios.get('/api/v1/wallet/summary');
      if (res.data.success) {
        const summary = res.data.summary;
        set({ 
          balance: summary?.balances?.GONG?.available ?? summary?.balances?.NGN?.available ?? 0,
          currency: 'NGN',
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch wallet', isLoading: false });
    }
  },

  fetchRewards: async () => {
    try {
      set({ isLoading: true, error: null });
      // Example endpoint, fall back to empty rewards if not available
      const res = await axios.get('/api/v1/rewards/me').catch(() => ({ data: { success: false } }));
      if (res.data && res.data.success) {
        set({ rewards: res.data.rewards || [], isLoading: false });
      } else {
        set({ rewards: [], isLoading: false });
      }
    } catch (err) {
      set({ rewards: [], isLoading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axios.get('/api/v1/wallet/transactions');
      if (res.data.success) {
        const txs = res.data.transactions.map(t => ({
          id: t.id,
          type: t.direction || 'CREDIT',
          amount: parseFloat(t.amount) || 0,
          desc: t.description || 'Wallet Transaction',
          date: t.createdAt ? t.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          status: t.status || 'COMPLETED',
          icon: t.direction === 'CREDIT' ? 'topup' : 'purchase'
        }));
        set({ transactions: txs, isLoading: false });
      } else {
        set({ transactions: [], isLoading: false });
      }
    } catch (err) {
      set({ transactions: [], isLoading: false });
    }
  }
}));
