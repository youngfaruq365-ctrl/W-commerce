import { create } from 'zustand';
import { courierApi } from '../services/courierApi';

// Cache validity in ms (e.g., 1 minute)
const CACHE_TTL = 60000;

export const useCourierStore = create((set, get) => ({
    profile: null,
    profileLoading: false,
    profileError: null,
    profileLastFetchedAt: null,

    availability: 'OFFLINE',
    activeVehicle: null,

    earnings: { today: 0, thisWeek: 0, pending: 0, cleared: 0, balance: 0 },
    earningHistory: [],
    earningsLoading: false,
    earningsError: null,
    earningsLastFetchedAt: null,

    dashboard: null,
    dashboardLoading: false,
    dashboardError: null,
    
    setProfile: (profile) => set({ profile }),
    setAvailability: async (status) => {
        // Optimistic UI
        set({ availability: status });
        try {
            await courierApi.updateAvailability(status);
        } catch (error) {
            // Revert on failure
            set({ availability: status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' });
            console.error('Failed to update availability', error);
            throw error;
        }
    },
    setActiveVehicle: (vehicle) => set({ activeVehicle: vehicle }),
    
    fetchProfile: async (force = false) => {
        const state = get();
        if (!force && state.profileLastFetchedAt && (Date.now() - state.profileLastFetchedAt < CACHE_TTL)) {
            return; // Data is fresh
        }
        
        set({ profileLoading: true, profileError: null });
        try {
            const data = await courierApi.getProfile();
            set({ 
                profile: data, 
                availability: data.status || 'OFFLINE',
                activeVehicle: data.activeVehicle || null,
                profileLastFetchedAt: Date.now(), 
                profileLoading: false 
            });
        } catch (error) {
            set({ profileError: error.message || 'Failed to fetch profile', profileLoading: false });
        }
    },

    fetchEarnings: async (force = false) => {
        const state = get();
        if (!force && state.earningsLastFetchedAt && (Date.now() - state.earningsLastFetchedAt < CACHE_TTL)) {
            return;
        }

        set({ earningsLoading: true, earningsError: null });
        try {
            const [summaryData, historyData] = await Promise.all([
                courierApi.getEarnings(),
                courierApi.getEarningHistory()
            ]);
            set({ 
                earnings: summaryData, 
                earningHistory: historyData,
                earningsLastFetchedAt: Date.now(), 
                earningsLoading: false 
            });
        } catch (error) {
            set({ earningsError: error.message || 'Failed to fetch earnings', earningsLoading: false });
        }
    },

    fetchDashboard: async () => {
        set({ dashboardLoading: true, dashboardError: null });
        try {
            const data = await courierApi.getDashboard();
            set({ dashboard: data.data, dashboardLoading: false });
        } catch (error) {
            set({ dashboardError: error.message || 'Failed to fetch dashboard', dashboardLoading: false });
        }
    }
}));
