/**
 * WebSocket Pool Events Service
 * Handles real-time updates for group buy pools
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');


// Store connected clients per pool
const poolRooms = new Map();

/**
 * Initialize Socket.io namespace for pools
 * @param {Object} io - Socket.io instance
 */
function initializePoolSocket(io) {
    const poolNamespace = io.of('/pool');

    poolNamespace.on('connection', (socket) => {
        logger.info(`[PoolSocket] Client connected: ${socket.id}`);

        // Join a pool room
        socket.on('join-pool', async (poolId) => {
            try {
                const roomName = `pool-${poolId}`;
                socket.join(roomName);

                // Track connected users
                if (!poolRooms.has(poolId)) {
                    poolRooms.set(poolId, new Set());
                }
                poolRooms.get(poolId).add(socket.id);

                // Get pool data
                const pool = await prisma.pool.findUnique({
                    where: { id: poolId },
                    include: {
                        product: true,
                        participants: true
                    }
                });

                if (pool) {
                    // Notify user of current pool state
                    socket.emit('pool:state', {
                        poolId,
                        currentSize: pool.currentSize,
                        targetSize: pool.targetSize,
                        participantCount: pool.participants.length,
                        watcherCount: poolRooms.get(poolId).size,
                        status: pool.status,
                        expiresAt: pool.expiresAt
                    });

                    // Broadcast updated watcher count to room
                    poolNamespace.to(roomName).emit('pool:watchers', {
                        poolId,
                        count: poolRooms.get(poolId).size
                    });
                }

                logger.info(`[PoolSocket] Client ${socket.id} joined pool ${poolId}`);
            } catch (err) {
                logger.error('[PoolSocket] Error joining pool:', err);
                socket.emit('pool:error', { message: 'Failed to join pool' });
            }
        });

        // Leave a pool room
        socket.on('leave-pool', (poolId) => {
            const roomName = `pool-${poolId}`;
            socket.leave(roomName);

            if (poolRooms.has(poolId)) {
                poolRooms.get(poolId).delete(socket.id);

                // Broadcast updated watcher count
                poolNamespace.to(roomName).emit('pool:watchers', {
                    poolId,
                    count: poolRooms.get(poolId).size
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            logger.info(`[PoolSocket] Client disconnected: ${socket.id}`);

            // Remove from all pool rooms
            poolRooms.forEach((clients, poolId) => {
                if (clients.has(socket.id)) {
                    clients.delete(socket.id);
                    poolNamespace.to(`pool-${poolId}`).emit('pool:watchers', {
                        poolId,
                        count: clients.size
                    });
                }
            });
        });
    });

    return poolNamespace;
}

/**
 * Broadcast pool update to all watchers
 * @param {Object} io - Socket.io instance
 * @param {string} poolId - Pool ID
 * @param {Object} data - Update data
 */
async function broadcastPoolUpdate(io, poolId, data) {
    const poolNamespace = io.of('/pool');
    const roomName = `pool-${poolId}`;

    poolNamespace.to(roomName).emit('pool:update', {
        poolId,
        ...data
    });
}

/**
 * Broadcast when a user joins a pool
 * @param {Object} io - Socket.io instance
 * @param {string} poolId - Pool ID
 * @param {Object} participation - Participation data
 */
async function broadcastPoolJoin(io, poolId, participation) {
    const poolNamespace = io.of('/pool');
    const roomName = `pool-${poolId}`;

    try {
        // Get updated pool data
        const pool = await prisma.pool.findUnique({
            where: { id: poolId },
            include: {
                participants: true
            }
        });

        if (pool) {
            const watcherCount = poolRooms.get(poolId)?.size || 0;

            poolNamespace.to(roomName).emit('pool:joined', {
                poolId,
                newParticipantId: participation.userId,
                currentSize: pool.currentSize,
                targetSize: pool.targetSize,
                participantCount: pool.participants.length,
                watcherCount,
                progress: Math.min(100, (pool.currentSize / pool.targetSize) * 100)
            });

            // Check if pool is now filled
            if (pool.currentSize >= pool.targetSize && pool.status === 'ACTIVE') {
                await prisma.pool.update({
                    where: { id: poolId },
                    data: { status: 'FILLED' }
                });

                poolNamespace.to(roomName).emit('pool:filled', {
                    poolId,
                    message: '🎉 Pool has been filled! Processing orders...'
                });
            }
        }
    } catch (err) {
        logger.error('[PoolSocket] Broadcast error:', err);
    }
}

/**
 * Broadcast pool countdown updates (called by cron job)
 * @param {Object} io - Socket.io instance
 * @param {string} poolId - Pool ID
 * @param {Date} endDate - Pool end date
 */
async function broadcastCountdown(io, poolId, endDate) {
    const poolNamespace = io.of('/pool');

    poolNamespace.to(`pool-${poolId}`).emit('pool:countdown', {
        poolId,
        endDate,
        timeRemaining: new Date(endDate) - new Date()
    });
}

module.exports = {
    initializePoolSocket,
    broadcastPoolUpdate,
    broadcastPoolJoin,
    broadcastCountdown
};
