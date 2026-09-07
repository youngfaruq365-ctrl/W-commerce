import { create } from 'zustand';
import axios from 'axios';

export const useOfferStore = create((set, get) => ({
    currentOffer: null,
    timeRemaining: 0,
    offerTimer: null,

    setOffer: (offer) => {
        // Calculate remaining seconds
        const expiresAt = new Date(offer.expiresAt).getTime();
        const now = Date.now();
        let remaining = Math.floor((expiresAt - now) / 1000);
        if (remaining <= 0) remaining = 0;

        // Clear any existing timer
        if (get().offerTimer) {
            clearInterval(get().offerTimer);
        }

        set({ currentOffer: offer, timeRemaining: remaining });

        // Start countdown
        const timer = setInterval(() => {
            const tr = get().timeRemaining;
            if (tr <= 1) {
                clearInterval(get().offerTimer);
                set({ currentOffer: null, timeRemaining: 0, offerTimer: null });
            } else {
                set({ timeRemaining: tr - 1 });
            }
        }, 1000);

        set({ offerTimer: timer });
    },

    clearOffer: () => {
        if (get().offerTimer) {
            clearInterval(get().offerTimer);
        }
        set({ currentOffer: null, timeRemaining: 0, offerTimer: null });
    },

    acceptOffer: async (offerId) => {
        try {
            const res = await axios.post(`/api/v1/delivery/offers/${offerId}/accept`);
            get().clearOffer();
            return res.data;
        } catch (error) {
            console.error("Failed to accept offer:", error);
            throw error;
        }
    },

    rejectOffer: async (offerId) => {
        try {
            await axios.post(`/api/v1/delivery/offers/${offerId}/reject`);
            get().clearOffer();
            return true;
        } catch (error) {
            console.error("Failed to reject offer:", error);
            throw error;
        }
    }
}));
