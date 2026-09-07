const redisManager = require('../utils/redisManager');
const logger = require('../utils/logger');

/**
 * Redis Cache Middleware
 * Caches HTTP GET responses for a specified duration.
 * 
 * @param {number} durationSeconds - How long to cache the response
 */
const cacheMiddleware = (durationSeconds = 60) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Unique cache key based on URL and query params
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redisManager.get(key);
            
            if (cachedData) {
                try {
                    return res.json(typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData);
                } catch (e) {
                    return res.json(cachedData);
                }
            }

            // Override res.json to capture the response data
            const originalJson = res.json;
            res.json = function(data) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const stringData = typeof data === 'object' ? JSON.stringify(data) : data;
                    redisManager.set(key, stringData, durationSeconds).catch(err => {
                        logger.error('Failed to set cache for key: ' + key, err);
                    });
                }
                // Call original res.json
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next();
        }
    };
};

module.exports = cacheMiddleware;
