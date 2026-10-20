import { apiClient } from '@/utils/apiClient';

export const dispatchApi = {
    getFleet: async () => {
        const response = await apiClient.get('/api/v1/dispatch/fleet');
        return response.data;
    },
    
    assignCourier: async (assignmentId, courierId) => {
        const response = await apiClient.post('/api/v1/dispatch/assign', { assignmentId, courierId });
        return response.data;
    },

    getUnassignedOrders: async () => {
        const response = await apiClient.get('/api/v1/dispatch/orders/unassigned');
        return response.data;
    },

    getMatches: async (orderId) => {
        const response = await apiClient.get(`/api/v1/dispatch/match/${orderId}`);
        return response.data;
    }
};
