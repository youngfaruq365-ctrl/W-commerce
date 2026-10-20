const messagingService = require('./messagingService');
const logger = require('../utils/logger');
const redisManager = require('../utils/redisManager');

// Memory stores
const onlineUsers = new Map(); // user -> Set(socketIds)
const activeRooms = new Map(); // socketId -> currentRoom
const undeliveredQueue = new Map(); // Fallback: userId -> Array of messages

let ioInstance = null;
let redisClient = null;

// Phase 17: GPS Tracking Service needs the io instance to broadcast to delivery rooms
const gpsTracking = require('./delivery/gpsTrackingService');

async function initReliabilityStore() {
    try {
        await redisManager.ready();
        if (redisManager.useInMemoryFallback || !redisManager.getStatus().connected) {
            logger.warn('Socket Reliability: Redis backend unavailable, using in-memory fallback');
            return;
        }

        redisClient = redisManager.client;
        if (redisClient) {
            logger.info('✅ Socket Reliability: Reusing shared Redis client');
            redisClient.on('error', (err) => {
                logger.error('Socket Reliability Redis Error:', { error: err.message });
                redisClient = null;
            });
        }
    } catch (err) {
        logger.warn('Socket Reliability: Redis client unavailable, using memory fallback', { error: err.message });
        redisClient = null;
    }
}
initReliabilityStore();

// saveMessage is defined at the bottom

function broadcastActivity(message) {
    if (ioInstance) {
        ioInstance.emit('live_activity', {
            message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = (io) => {
    if (io) {
        ioInstance = io;
        gpsTracking.setIo(io); // Phase 17: give GPS service access to io

        // Rate limiting structure
        const rateLimits = new Map();

        // 1. Socket Authentication Middleware
        io.use(async (socket, next) => {
            try {
                // Parse cookies or auth header
                const cookieHeader = socket.handshake.headers.cookie;
                let token = null;

                if (cookieHeader) {
                    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
                    token = cookies.token;
                }
                
                if (!token && socket.handshake.auth?.token) {
                    token = socket.handshake.auth.token;
                }

                if (!token) {
                    console.log(`[SOCKET_MIDDLEWARE] Rejecting socket ${socket.id} due to missing token. Cookies:`, socket.handshake.headers.cookie);
                    return next(new Error("Authentication error: No token provided"));
                }

                const jwt = require('jsonwebtoken');
                const { getJwtSecret } = require('../utils/jwtSecret');
                const decoded = jwt.verify(token, getJwtSecret());
                
                // Attach the validated user identity to the socket
                socket.user = { id: decoded.id, role: decoded.role };
                next();
            } catch (err) {
                logger.warn('Socket Auth Failed', { error: err.message });
                next(new Error("Authentication error"));
            }
        });

        io.on('connection', (socket) => {
            console.log(`[SOCKET] connection attempt: socket.id=${socket.id}, user=${socket.user?.id}`);
            if (!socket.user || !socket.user.id) {
                console.log(`[SOCKET] Disconnecting socket ${socket.id} due to missing user auth`);
                socket.disconnect();
                return;
            }
            const currentUserId = String(socket.user.id);
            console.log(`[SOCKET] Connected currentUserId: ${currentUserId}`);
            socket.join(currentUserId);
            if (socket.user.role) socket.join(`role:${String(socket.user.role).toUpperCase()}`);

            // Handle identify (optional now that we have socket.user, but kept for status)
            socket.on('identify', (data) => {
                const { status = 'online' } = data;
                console.log(`[SOCKET] identify called by ${currentUserId} with status ${status}`);

                if (!onlineUsers.has(currentUserId)) {
                    onlineUsers.set(currentUserId, { socketIds: new Set(), status: status });
                }
                onlineUsers.get(currentUserId).socketIds.add(socket.id);
                onlineUsers.get(currentUserId).status = status;

                // Notify others
                socket.broadcast.emit('user_status_change', { user: currentUserId, status: status });

                logger.info('Socket user identified', { user: currentUserId, status, socketId: socket.id });
            });

            // 2. Handle courier location with throttling
            socket.on('courier:location', async (data) => {
                // Security check: Only couriers can send GPS
                if (socket.user.role !== 'COURIER') return;

                const now = Date.now();
                const lastUpdate = rateLimits.get(currentUserId) || 0;
                
                // Throttle: maximum 1 update per 5 seconds
                if (now - lastUpdate < 5000) {
                    return; // Too frequent, ignore
                }
                rateLimits.set(currentUserId, now);

                // Update CourierProfile current location
                try {
                    const prisma = require('../utils/prismaClient');
                    const courier = await prisma.courierProfile.update({
                        where: { userId: currentUserId },
                        data: {
                            currentLat: data.lat,
                            currentLng: data.lng,
                            lastLocationAt: new Date(data.timestamp || now)
                        },
                        include: {
                            assignments: {
                                where: {
                                    status: { in: ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT'] }
                                }
                            }
                        }
                    });

                // Layer 2: Push to Redis Stream for active assignments
                    if (courier.assignments && courier.assignments.length > 0) {
                        const trackingBufferService = require('./delivery/trackingBufferService');
                        for (const assignment of courier.assignments) {
                            await trackingBufferService.appendPoint(assignment.id, data);
                        }
                    }

                } catch (dbErr) {
                    logger.warn('Failed to save courier location to DB', { error: dbErr.message, user: currentUserId });
                }

                // Phase 17: targeted broadcast to delivery rooms (not all clients)
                // Also keep global event for dispatch admin fleet map
                io.to('dispatch:admins').emit('courier:location', {
                    courierId: currentUserId,
                    lat: data.lat, lng: data.lng,
                    accuracy: data.accuracy, speed: data.speed,
                    heading: data.heading, timestamp: data.timestamp || now
                });
                // Broadcast to buyer/seller rooms for active FO assignments
                gpsTracking.broadcastGpsToRoom(currentUserId, data).catch(() => {});
            });

            // Phase 17: Buyer/seller join a delivery tracking room
            socket.on('tracking:join', async ({ assignmentId } = {}) => {
                if (!assignmentId) return;
                await gpsTracking.handleTrackingJoin(socket, assignmentId);
            });

            socket.on('join_delivery_chat', async ({ assignmentId }) => {
                if (!assignmentId) return;
                const room = `delivery_chat_${assignmentId}`;
                socket.join(room);
                activeRooms.set(socket.id, room);
                logger.info(`[SOCKET] User ${currentUserId} joined delivery chat: ${room}`);
            });

            // Listen to internal dispatch events and route to socket clients
            const { dispatchEvents } = require('./delivery/dispatchService');
            if (dispatchEvents.listenerCount('delivery:offer') === 0) {
                dispatchEvents.on('delivery:offer', ({ userId, offer }) => {
                    io.to(userId).emit('delivery:offer', offer);
                });
            }

            socket.on('setStatus', (data) => {
                const { status } = data; // 'online', 'away', 'busy'
                if (currentUserId && onlineUsers.has(currentUserId)) {
                    onlineUsers.get(currentUserId).status = status;
                    socket.broadcast.emit('user_status_change', { user: currentUserId, status: status });
                    logger.info('Socket status updated', { user: currentUserId, status });
                }
            });

            socket.on('heartbeat', (data) => {
                // Alive check
            });

            socket.on('check_user_status', (targetUser, callback) => {
                const userData = onlineUsers.get(String(targetUser));
                console.log(`[SOCKET] check_user_status called for targetUser: ${targetUser}. Current online keys:`, Array.from(onlineUsers.keys()));
                if (callback) {
                    callback({
                        status: userData ? userData.status : 'offline'
                    });
                }
            });

            socket.on('join_chat', (data) => {
                const { room } = data;
                socket.join(room);
                activeRooms.set(socket.id, room);
            });

            // Unified Send Message Handler
            socket.on('sendMessage', async (data, callback) => {
                try {
                    const senderId = String(data.senderId || currentUserId || data.sender?.id || '');
                    const receiverId = data.receiverId ? String(data.receiverId) : null;
                    const recipientOnline = receiverId ? isUserOnline(receiverId) : false;

                    const result = await messagingService.sendMessage({
                        senderId,
                        receiverId,
                        recipient: data.recipient || null,
                        receiverName: data.receiverName || null,
                        content: data.content || data.text,
                        productId: data.productId || null,
                        orderId: data.orderId || null,
                        quotedMsg: data.quotedMsg || null,
                        productContext: data.productContext || null
                    }, { recipientOnline });

                    const savedMsg = result.message;

                    if (savedMsg.senderId) {
                        io.to(savedMsg.senderId).emit('receiveMessage', savedMsg);
                    }
                    if (savedMsg.receiverId) {
                        io.to(savedMsg.receiverId).emit('receiveMessage', savedMsg);
                    }

                    if (result.autoReply) {
                        io.to(result.autoReply.senderId).emit('receiveMessage', result.autoReply);
                        io.to(result.autoReply.receiverId).emit('receiveMessage', result.autoReply);
                    }

                    if (callback) {
                        callback({ success: true, message: savedMsg });
                    }
                } catch (error) {
                    logger.error('[SOCKET] sendMessage error:', error.message);
                    if (callback) {
                        callback({ success: false, message: error.message || 'Failed to send message' });
                    }
                }
            });

            socket.on('callUser', (data) => {
                const targetId = String(data.receiverId || data.targetId);
                console.log(`[SOCKET] callUser from ${currentUserId} to ${targetId}`);
                io.to(targetId).emit('incomingCall', {
                    callerId: currentUserId,
                    callerName: data.callerName || socket.user?.fullName || 'User',
                    callerAvatar: data.callerAvatar,
                    type: data.type || 'voice'
                });
            });

            socket.on('acceptCall', (data) => {
                const callerId = String(data.callerId);
                io.to(callerId).emit('callAccepted', { accepterId: currentUserId });
            });

            socket.on('rejectCall', (data) => {
                const callerId = String(data.callerId);
                io.to(callerId).emit('callRejected', { rejecterId: currentUserId });
            });

            socket.on('endCall', (data) => {
                const targetId = String(data.targetId);
                io.to(targetId).emit('callEnded', { enderId: currentUserId });
            });

            socket.on('webrtc_offer', (data) => {
                const targetId = String(data.targetId);
                io.to(targetId).emit('webrtc_offer', { callerId: currentUserId, sdp: data.sdp });
            });

            socket.on('webrtc_answer', (data) => {
                const targetId = String(data.targetId);
                io.to(targetId).emit('webrtc_answer', { responderId: currentUserId, sdp: data.sdp });
            });

            socket.on('webrtc_ice_candidate', (data) => {
                const targetId = String(data.targetId);
                io.to(targetId).emit('webrtc_ice_candidate', { senderId: currentUserId, candidate: data.candidate });
            });

            // Legacy handler (optional support)
            socket.on('private_message', (data, callback) => {
                // ... similar logic or redirect to sendMessage
            });

            socket.on('typing', (data) => {
                // data.receiverId
                io.to(data.receiverId).emit('userTyping', { userId: currentUserId });
            });

            socket.on('stopTyping', (data) => {
                io.to(data.receiverId).emit('userStopTyping', { userId: currentUserId });
            });

            socket.on('postStatus', (statusData) => {
                // Determine who should see this status
                // For this platform, we'll broadcast to everyone (public statuses)
                // In a real app, filtering by friends/followers would happen here

                const enrichedStatus = {
                    ...statusData,
                    id: 'status_' + Date.now(),
                    timestamp: new Date().toISOString()
                };

                // Broadcast to everyone EXCEPT sender (sender already sees it optimistically)
                socket.broadcast.emit('receiveStatus', enrichedStatus);
                logger.info(`[SOCKET] Status posted by ${currentUserId}`);
            });

            socket.on('disconnect', () => {
                activeRooms.delete(socket.id);
                if (currentUserId && onlineUsers.has(currentUserId)) {
                    const userData = onlineUsers.get(currentUserId);
                    userData.socketIds.delete(socket.id);
                    if (userData.socketIds.size === 0) {
                        onlineUsers.delete(currentUserId);
                        io.emit('user_status_change', { user: currentUserId, status: 'offline' });
                    }
                }
                logger.info(`[SOCKET] Disconnected: ${socket.id} (User: ${currentUserId})`);
            });
        });
    }

    return { broadcastActivity, getOnlineCount };
};

function getOnlineCount() {
    return onlineUsers.size;
}

function getUserStatus(userId) {
    const userData = onlineUsers.get(String(userId));
    return userData ? userData.status : 'offline';
}

function isUserOnline(userId) {
    return getUserStatus(userId) !== 'offline';
}

module.exports.broadcastActivity = broadcastActivity;
module.exports.getOnlineCount = getOnlineCount;
module.exports.getUserStatus = getUserStatus;
module.exports.isUserOnline = isUserOnline;
module.exports.getIO = () => ioInstance;
