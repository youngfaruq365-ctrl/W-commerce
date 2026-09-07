import axios from 'axios';

// Ensure cookies/JWT are sent
axios.defaults.withCredentials = true;

const api = axios.create({
    baseURL: '/api/v1/courier',
    withCredentials: true
});

export const courierApi = {
    getProfile: async () => {
        const response = await api.get('/profile');
        return response.data;
    },
    
    updateAvailability: async (status) => {
        const response = await api.patch('/availability', { status });
        return response.data;
    },

    getEarnings: async () => {
        // Now hitting the delivery service endpoint
        const response = await axios.get('/api/v1/delivery/earnings/summary', { withCredentials: true });
        return response.data.summary;
    },
    
    getEarningHistory: async () => {
        const response = await axios.get('/api/v1/delivery/earnings/history', { withCredentials: true });
        return response.data.history;
    }
};
