const redisManager = require('../utils/redisManager');
const logger = require('../utils/logger');

// Initialize Redis early and await it before binding the HTTP server.
const redisReadyPromise = (async () => {
    try {
        await redisManager.initialize();
        logger.info('Redis initialized successfully');
        return redisManager;
    } catch (error) {
        logger.error(`Redis initialization failed: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            logger.error('FATAL: Redis is required in production. Server shutting down.');
            process.exit(1);
        }
        return redisManager;
    }
})();

module.exports = {
    redisManager,
    redisReadyPromise
};
