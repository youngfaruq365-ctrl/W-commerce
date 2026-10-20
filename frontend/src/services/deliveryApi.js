import { apiClient } from '@/utils/apiClient';

export const deliveryApi = {
    updateStatus: async (assignmentId, status, idempotencyKey = null) => {
        const headers = {};
        if (idempotencyKey) {
            headers['X-Idempotency-Key'] = idempotencyKey;
        }
        
        const response = await apiClient.post(`/api/v1/delivery/${assignmentId}/status`, { status }, { headers });
        return response.data;
    },
    
    getQueue: async () => {
        const response = await apiClient.get('/api/v1/delivery/queue');
        return response.data;
    },

    getActive: async () => {
        const response = await apiClient.get('/api/v1/delivery/active');
        return response.data;
    }
};
