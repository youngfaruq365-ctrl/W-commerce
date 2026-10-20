const socketService = require('./socketService');
const logger = require('../utils/logger');

/**
 * Emits order update events to the relevant parties over the socket.
 * Safe to call; handles missing socket service gracefully.
 *
 * @param {Object} params
 * @param {string} params.orderId - The ID of the updated order
 * @param {string} [params.buyerId] - The ID of the buyer (optional)
 * @param {string[]} [params.sellerIds] - Array of seller IDs (optional)
 */
exports.emitOrderUpdated = ({ orderId, buyerId, sellerIds = [] }) => {
    try {
        const io = socketService.getIO();
        if (!io) return;

        // Buyer event
        if (buyerId) {
            io.to(buyerId).emit('order:updated', { orderId });
        }

        // Admin event
        io.to('role:ADMIN').emit('admin_dashboard_update');
        io.to('role:ADMIN').emit('order:updated', { orderId });

        // Seller events
        if (Array.isArray(sellerIds)) {
            for (const sellerId of sellerIds) {
                if (sellerId) {
                    io.to(sellerId).emit('seller_dashboard_update');
                    io.to(sellerId).emit('order:updated', { orderId });
                }
            }
        }
    } catch (err) {
        logger.error(`[OrderEventService] Failed to emit order events for ${orderId}: ${err.message}`);
    }
};
