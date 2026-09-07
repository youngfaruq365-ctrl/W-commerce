import { create } from 'zustand';
import { realtimeClient } from '../services/realtime/socketClient';

export const useTrackingStore = create((set, get) => ({
    courierLocations: {}, // Map of courierId -> { lat, lng, timestamp }
    connectionStatus: 'disconnected', 
    gpsStatus: 'OFFLINE', // OFFLINE, CONNECTING, ACTIVE, POOR_SIGNAL, LOST_SIGNAL, ERROR, DENIED, UNSUPPORTED
    lastUpdated: null,
    isSocketInitialized: false,

    initRealtime: (token) => {
        if (get().isSocketInitialized) return;
        
        realtimeClient.connect(token);
        
        realtimeClient.on('connection_status', (status) => {
            set({ connectionStatus: status });
        });

        realtimeClient.on('courier:location', (data) => {
            get().updateCourierLocation(data);
        });
        
        set({ isSocketInitialized: true });
    },

    setGpsStatus: (status) => set({ gpsStatus: status }),

    updateCourierLocation: (payload) => set((state) => {
        // Handle both local (own location) and remote (socket broadcast) payloads
        const cId = payload.courierId || 'self';
        return {
            courierLocations: {
                ...state.courierLocations,
                [cId]: { 
                    lat: payload.lat, 
                    lng: payload.lng, 
                    accuracy: payload.accuracy,
                    speed: payload.speed,
                    heading: payload.heading,
                    timestamp: payload.timestamp || Date.now() 
                }
            },
            lastUpdated: Date.now()
        };
    }),

    setConnectionStatus: (status) => set({ connectionStatus: status })
}));
