const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, `../${envFile}`) });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

require('./instrument.cjs');
const express = require('express');

// Increase EventEmitter default max listeners to prevent 'MaxListenersExceededWarning'
// for ServerResponse objects with many concurrent listeners (compression, morgan, socket.io, etc.)
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 30;

const { BASE_PATH, JWT_SECRET } = require('./src/config/env.cjs');

const logger = require('./src/utils/logger');
const { redisManager, redisReadyPromise } = require('./src/config/redis.cjs');

const http = require('http');

const fs = require('fs');
const { initializeSockets } = require('./src/sockets/index.js');
const jwt = require('jsonwebtoken');
const prisma = require('./src/utils/prismaClient');

const globalStartup = global.__GLOBALX_STARTUP || (global.__GLOBALX_STARTUP = {
    app: null,
    server: null,
    io: null,
    serverStarted: false,
    cronStarted: false,
    socketStarted: false,
    redisWarned: false
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================================================

let serverInstance = null;

async function gracefulShutdown() {
    logger.warn('Received shutdown signal. Starting graceful shutdown...');
    
    await redisManager.close();
    try {
        const cronJobManager = require('./src/services/cronJobManager');
        if (cronJobManager && typeof cronJobManager.shutdown === 'function') {
            await cronJobManager.shutdown();
            logger.info('Cron jobs shut down gracefully');
        }
    } catch (e) {
        logger.warn(`Cron shutdown error: ${e.message}`);
    }
    try {
        const eventBus = require('./src/services/eventBus');
        await eventBus.shutdown();
    } catch (e) {
        logger.warn(`EventBus shutdown error: ${e.message}`);
    }

    await prisma.$disconnect();
    
    const activeServer = serverInstance || global.serverInstance || globalStartup.server;
    if (activeServer) {
        activeServer.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after 30 seconds');
            process.exit(1);
        }, 30000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection: ${reason?.stack || reason}`);
});
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error?.message || error}`);
    if (error?.stack) logger.error(error.stack);
    // Keep server alive on runtime/socket errors unless port binding failed at startup
    if (error?.code === 'EACCES') {
        gracefulShutdown();
    }
});




const app = require('./src/app.cjs');

const server = http.createServer(app);
globalStartup.server = server;
logger.info('Initializing socket connections...');
const { io } = initializeSockets(server, globalStartup);
logger.info('Socket connections initialized');
const PORT = process.env.PORT || 3000;

// ============================================================================
// START SERVER WITH PROPER ERROR HANDLING
// ============================================================================

async function startServerWithErrorHandling() {
    if (globalStartup.serverStarted) {
        logger.warn('Server start attempted twice in same process - skipping duplicate start');
        return;
    }
    globalStartup.serverStarted = true;

    logger.info('Awaiting Redis connection...');
    await redisReadyPromise;
    logger.info('Redis connection ready');
    const redisStatus = redisManager.getStatus();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!redisStatus.connected || redisStatus.useFallback)) {
        logger.error('FATAL: Redis-backed session store is unavailable in production. Server shutting down.');
        process.exit(1);
    }

    const basePort = parseInt(process.env.PORT, 10) || 5000;

    // ── Verify database connectivity before accepting traffic ──────────────────
    const { verifyDatabaseConnection } = require('./src/utils/prismaClient');
    await verifyDatabaseConnection(3, 2000);

    const maxAttempts = 2;
    let attempts = 0;
    let currentPort = basePort;

    const tryStart = () => {
        attempts += 1;

        if (global.serverInstance) {
            global.serverInstance.removeAllListeners('error');
        }

        global.serverInstance = server.listen(currentPort, '0.0.0.0', () => {
            const addr = global.serverInstance.address();
            logger.info('✅ Server is running on port ' + addr.port);
        });

        global.serverInstance.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn('Port ' + currentPort + ' is in use.');
                if (attempts < maxAttempts) {
                    currentPort += 1;
                    logger.info('Trying port ' + currentPort + '...');
                    setTimeout(tryStart, 1000);
                } else {
                    logger.error('Max attempts reached. Could not find an available port.');
                    process.exit(1);
                }
            } else {
                logger.error('Server error: ' + error.message);
                process.exit(1);
            }
        });
    };

    tryStart();
}

startServerWithErrorHandling().catch((error) => {
    logger.error('Failed to start server: ' + error.message);
    logger.error(error.stack);
    process.exit(1);
});
// restarted
