import { create } from 'zustand';
import { deliveryApi } from '../services/deliveryApi';
import { offlineStorage } from '../offline/offlineStorage';
import { offlineSyncManager } from '../offline/offlineSyncManager';
import { v4 as uuidv4 } from 'uuid'; // Fallback if crypto.randomUUID isn't available

const CACHE_TTL = 30000;

export const useDeliveryStore = create((set, get) => ({
    queue: [],
    limitReached: false,
    queueLoading: false,
    queueError: null,
    queueLastFetchedAt: null,

    activeDelivery: null,      // Current / primary active delivery (FREE & PRO)
    activeList: [],            // All active deliveries for PRO couriers
    isPro: false,              // Whether the courier is PRO tier
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
            const res = await deliveryApi.getQueue();
            const queueData = res.data || [];
            set({ queue: queueData, limitReached: !!res.limitReached, queueLastFetchedAt: Date.now(), queueLoading: false });
            offlineStorage.saveDeliveryData('queue', queueData);
        } catch (error) {
            // Offline fallback: load cached queue
            try {
                const cached = await offlineStorage.getDeliveryData('queue');
                if (cached && Array.isArray(cached)) {
                    console.log('[DeliveryStore] Loaded cached queue for offline use:', cached.length);
                    set({ queue: cached, queueLoading: false, queueError: null });
                    return;
                }
            } catch (cErr) {
                console.warn('[DeliveryStore] Cache read error:', cErr);
            }
            set({ queueError: error.message, queueLoading: false });
        }
    },

    fetchActiveDelivery: async (force = false) => {
        const state = get();
        if (!force && state.activeLastFetchedAt && (Date.now() - state.activeLastFetchedAt < CACHE_TTL)) return;
        
        set({ activeLoading: true, activeError: null });
        try {
            const res = await deliveryApi.getActive();
            // API returns { data: array|object, isPro, count }
            const raw = res?.data ?? res;
            const isPro = res?.isPro ?? false;
            let activeList = [];
            let activeDelivery = null;

            if (Array.isArray(raw)) {
                activeList = raw;
                activeDelivery = raw[0] || null;
            } else if (raw && raw.id) {
                activeDelivery = raw;
                activeList = [raw];
            }

            set({ activeDelivery, activeList, isPro, activeLastFetchedAt: Date.now(), activeLoading: false });
            offlineStorage.saveDeliveryData('active', { activeDelivery, activeList, isPro });
        } catch (error) {
            // Offline fallback: load cached active delivery
            try {
                const cached = await offlineStorage.getDeliveryData('active');
                if (cached) {
                    console.log('[DeliveryStore] Loaded cached active delivery for offline use');
                    set({ 
                        activeDelivery: cached.activeDelivery || null, 
                        activeList: cached.activeList || [], 
                        isPro: cached.isPro || false,
                        activeLoading: false, 
                        activeError: null 
                    });
                    return;
                }
            } catch (cErr) {
                console.warn('[DeliveryStore] Cache read error:', cErr);
            }
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
                console.warn("Network error, queuing offline update with offlineSyncManager", error);
                offlineSyncManager.queueDeliveryStatus(assignmentId, status, idempotencyKey);
            }
        }
        return true;
    }
}));
