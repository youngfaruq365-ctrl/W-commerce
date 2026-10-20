import { offlineSyncManager } from '../offline/offlineSyncManager';
import { offlineStorage } from '../offline/offlineStorage';

export const offlineQueue = {
    async add(action) {
        if (action.type === 'UPDATE_STATUS') {
            await offlineSyncManager.queueDeliveryStatus(
                action.payload.id,
                action.payload.status,
                action.payload.idempotencyKey
            );
        } else {
            await offlineSyncManager.queueMutation({
                type: action.type,
                endpoint: action.endpoint || `/api/v1/${action.type.toLowerCase()}`,
                method: action.method || 'POST',
                payload: action.payload,
                idempotencyKey: action.idempotencyKey,
                description: action.description || action.type
            });
        }
    },

    async processQueue() {
        return offlineSyncManager.processQueue();
    },

    async clear() {
        return offlineStorage.clearSyncQueue();
    }
};

export default offlineQueue;
