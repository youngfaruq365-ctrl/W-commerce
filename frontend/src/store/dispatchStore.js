import { create } from 'zustand';
import { dispatchApi } from '../services/dispatchApi';

const CACHE_TTL = 30000;

export const useDispatchStore = create((set, get) => ({
    fleet: [],
    fleetLoading: false,
    fleetError: null,
    fleetLastFetchedAt: null,

    unassignedOrders: [],
    unassignedLoading: false,
    unassignedError: null,
    unassignedLastFetchedAt: null,

    activeDeliveries: [],
    selectedCourierId: null,
    
    matches: [],
    matchesLoading: false,
    
    setFleet: (fleet) => set({ fleet }),
    setUnassignedOrders: (orders) => set({ unassignedOrders: orders }),
    setActiveDeliveries: (deliveries) => set({ activeDeliveries: deliveries }),
    setSelectedCourierId: (id) => set({ selectedCourierId: id }),
    
    fetchFleet: async (force = false) => {
        const state = get();
        if (!force && state.fleetLastFetchedAt && (Date.now() - state.fleetLastFetchedAt < CACHE_TTL)) return;
        
        set({ fleetLoading: true, fleetError: null });
        try {
            const data = await dispatchApi.getFleet();
            set({ fleet: data, fleetLastFetchedAt: Date.now(), fleetLoading: false });
        } catch (error) {
            set({ fleetError: error.message, fleetLoading: false });
        }
    },

    fetchUnassignedOrders: async (force = false) => {
        const state = get();
        if (!force && state.unassignedLastFetchedAt && (Date.now() - state.unassignedLastFetchedAt < CACHE_TTL)) return;
        
        set({ unassignedLoading: true, unassignedError: null });
        try {
            const data = await dispatchApi.getUnassignedOrders();
            set({ unassignedOrders: data.orders || data, unassignedLastFetchedAt: Date.now(), unassignedLoading: false });
        } catch (error) {
            set({ unassignedError: error.message, unassignedLoading: false });
        }
    },

    fetchMatches: async (orderId) => {
        set({ matchesLoading: true });
        try {
            const data = await dispatchApi.getMatches(orderId);
            set({ matches: data.matches || [], matchesLoading: false });
        } catch (error) {
            console.error("Error fetching matches", error);
            set({ matchesLoading: false, matches: [] });
        }
    },

    updateCourierStatus: (courierId, status) => set((state) => ({
        fleet: state.fleet.map(c => 
            c.id === courierId ? { ...c, status } : c
        )
    })),

    assignOrderToCourier: async (orderId, courierId) => {
        const state = get();
        const order = state.unassignedOrders.find(o => o.id === orderId);
        if (!order) return;

        // Rollback snapshot
        const previousUnassigned = state.unassignedOrders;
        const previousActive = state.activeDeliveries;

        // Optimistic UI update
        const newActive = { ...order, courierId, status: 'ASSIGNED' };
        set({
            unassignedOrders: state.unassignedOrders.filter(o => o.id !== orderId),
            activeDeliveries: [...state.activeDeliveries, newActive]
        });

        try {
            await dispatchApi.assignCourier(orderId, courierId);
        } catch (error) {
            console.error("Failed to assign courier, rolling back", error);
            // Revert state
            set({
                unassignedOrders: previousUnassigned,
                activeDeliveries: previousActive
            });
            throw error; // Let the UI handle showing the error toast
        }
    }
}));
