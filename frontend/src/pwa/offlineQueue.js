export const offlineQueue = {
    queue: [],

    add(action) {
        this.queue.push(action);
        this.save();
    },

    save() {
        localStorage.setItem('wDeliveryOfflineQueue', JSON.stringify(this.queue));
    },

    load() {
        const stored = localStorage.getItem('wDeliveryOfflineQueue');
        if (stored) {
            this.queue = JSON.parse(stored);
        }
    },

    clear() {
        this.queue = [];
        localStorage.removeItem('wDeliveryOfflineQueue');
    },

    async processQueue(apiClient) {
        if (this.queue.length === 0) return;
        if (!navigator.onLine) return;

        console.log(`Processing ${this.queue.length} offline actions...`);
        const actionsToProcess = [...this.queue];
        this.clear();

        for (const action of actionsToProcess) {
            try {
                if (action.type === 'UPDATE_STATUS') {
                    // Re-dispatch using the provided API client. 
                    // Assume action.payload = { id, status, idempotencyKey }
                    await apiClient.updateStatus(action.payload.id, action.payload.status, action.payload.idempotencyKey);
                }
            } catch (error) {
                // If it's a 4xx error (business error/unauthorized), DO NOT REQUEUE.
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    console.error('Business logic error processing action. Discarding.', error.response.data);
                } else {
                    // Network or 5xx error, requeue
                    console.error('Failed to process action due to network/server, requeueing:', error);
                    this.add(action); 
                }
            }
        }
    }
};

// Initialize load
offlineQueue.load();

// Listen for online event to process queue
window.addEventListener('online', () => {
    console.log('Network returned. Processing offline queue...');
    offlineQueue.processQueue();
});
