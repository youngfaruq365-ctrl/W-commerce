import axios from 'axios';

// Ensure cookies/JWT are sent
axios.defaults.withCredentials = true;

const api = axios.create({
    baseURL: '/api/v1/dispatch',
    withCredentials: true
});

export const dispatchApi = {
    getFleet: async () => {
        const response = await api.get('/fleet');
        return response.data;
    },
    
    assignCourier: async (assignmentId, courierId) => {
        const response = await api.post('/assign', { assignmentId, courierId });
        return response.data;
    },

    getUnassignedOrders: async () => {
        const response = await api.get('/orders/unassigned');
        return response.data;
    },

    getMatches: async (orderId) => {
        const response = await api.get(`/match/${orderId}`);
        return response.data;
    }
};
