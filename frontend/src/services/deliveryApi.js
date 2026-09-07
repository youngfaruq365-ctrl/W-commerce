import axios from 'axios';

// Ensure cookies/JWT are sent
axios.defaults.withCredentials = true;

const api = axios.create({
    baseURL: '/api/v1/delivery',
    withCredentials: true
});

export const deliveryApi = {
    updateStatus: async (assignmentId, status, idempotencyKey = null) => {
        const headers = {};
        if (idempotencyKey) {
            headers['X-Idempotency-Key'] = idempotencyKey;
        }
        
        const response = await api.post(`/${assignmentId}/status`, { status }, { headers });
        return response.data;
    },
    
    getQueue: async () => {
        const response = await api.get('/queue');
        return response.data.data || response.data;
    },

    getActive: async () => {
        const response = await api.get('/active');
        return response.data.data || response.data;
    }
};
