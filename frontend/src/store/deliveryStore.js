import { create } from 'zustand';
import { deliveryApi } from '../services/deliveryApi';
import { offlineQueue } from '../pwa/offlineQueue';
import { v4 as uuidv4 } from 'uuid'; // Fallback if crypto.randomUUID isn't available

const CACHE_TTL = 30000;

export const useDeliveryStore = create((set, get) => ({
    queue: [],
    queueLoading: false,
    queueError: null,
    queueLastFetchedAt: null,

    activeDelivery: null,
    activeLoading: false,
    activeError: null,
    activeLastFetchedAt: null,

    deliveryHistory: [],
    
    setQueue: (queue) => set({ queue }),
    setActiveDelivery: (delivery) => set({ activeDelivery: delivery }),
    
    fetchQueue: async (force = false) => {
        const state = get();
        if (!force && state.queueLastFetchedAt && (Date.now() - state.queueLastFetchedAt < CACHE_TTL)) return;
        
        set({ queueLoading: true, queueError: null });
        try {
            const data = await deliveryApi.getQueue();
            set({ queue: data, queueLastFetchedAt: Date.now(), queueLoading: false });
        } catch (error) {
            set({ queueError: error.message, queueLoading: false });
        }
    },

    fetchActiveDelivery: async (force = false) => {
        const state = get();
        if (!force && state.activeLastFetchedAt && (Date.now() - state.activeLastFetchedAt < CACHE_TTL)) return;
        
        set({ activeLoading: true, activeError: null });
        try {
            const data = await deliveryApi.getActive();
            set({ activeDelivery: data, activeLastFetchedAt: Date.now(), activeLoading: false });
        } catch (error) {
            set({ activeError: error.message, activeLoading: false });
        }
    },

    updateDeliveryStatus: async (assignmentId, status) => {
        // Optimistic UI update
        const previousActive = get().activeDelivery;
        const previousQueue = get().queue;

        set((state) => {
            if (state.activeDelivery?.id === assignmentId) {
                return { activeDelivery: { ...state.activeDelivery, status } };
            }
            const updatedQueue = state.queue.map(d => d.id === assignmentId ? { ...d, status } : d);
            return { queue: updatedQueue };
        });

        // Use crypto.randomUUID() natively or fallback to timestamp
        const idempotencyKey = `${assignmentId}-${status}-${Date.now()}`;

        try {
            await deliveryApi.updateStatus(assignmentId, status, idempotencyKey);
        } catch (error) {
            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                // Business error - revert optimistic update
                console.error("Business error, reverting state", error);
                set({ activeDelivery: previousActive, queue: previousQueue });
                // Return false so the UI knows it failed (for the snap-back)
                return false;
            } else {
                // Network or 5xx error - queue it
                console.warn("Network error, queuing offline update", error);
                offlineQueue.add({
                    type: 'UPDATE_STATUS',
                    payload: { id: assignmentId, status, idempotencyKey }
                });
            }
        }
        return true;
    }
}));
