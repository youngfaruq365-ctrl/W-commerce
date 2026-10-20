const { Server } = require('socket.io');
const socketService = require('../services/socketService');
const poolEvents = require('../services/poolEvents');

function initializeSockets(server, globalStartup) {
    if (globalStartup.socketStarted && globalStartup.io) {
        return { io: globalStartup.io };
    }

    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_URL || true) : true,
            credentials: true
        },
        connectionStateRecovery: {},
        pingInterval: 10000, // Ping every 10s
        pingTimeout: 5000    // Timeout after 5s of no response
    });

    socketService(io);
    poolEvents.initializePoolSocket(io);
    
    globalStartup.io = io;
    globalStartup.socketStarted = true;

    return { io };
}

module.exports = { initializeSockets };
