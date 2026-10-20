import { apiClient } from '@/utils/apiClient';

export const courierApi = {
    getProfile: async () => {
        const response = await apiClient.get('/api/v1/courier/profile');
        return response.data;
    },
    
    getDashboard: async () => {
        const response = await apiClient.get('/api/v1/delivery/dashboard');
        return response.data;
    },
    
    updateAvailability: async (status) => {
        const response = await apiClient.patch('/api/v1/courier/availability', { status });
        return response.data;
    },

    getEarnings: async () => {
        const response = await apiClient.get('/api/v1/delivery/earnings/summary');
        return response.data.summary;
    },
    
    getEarningHistory: async () => {
        const response = await apiClient.get('/api/v1/delivery/earnings/history');
        return response.data.history;
    }
};
