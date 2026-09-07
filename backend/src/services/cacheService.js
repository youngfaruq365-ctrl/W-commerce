/**
 * GlobalX Cache Service
 * Provides caching functionality for frequently accessed data
 */

const redisManager = require('../utils/redisManager');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.init();
    }

    async init() {
        try {
            await redisManager.initialize();
            await redisManager.ready();
            this.redis = redisManager.useInMemoryFallback ? null : redisManager;
            if (!this.redis) {
                logger.warn('Cache service initialized in memory fallback mode');
            } else {
                logger.info('Cache service initialized with Redis backend');
            }
        } catch (error) {
            logger.warn('Cache service: Redis initialization failed, using memory cache', {
                error: error.message
            });
            this.redis = null;
            this.memoryCache = new Map();
        }
    }

    async get(key) {
        try {
            if (this.redis) {
                const data = await this.redis.get(key);
                return data || null;
            }
            return this.memoryCache.get(key) || null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, value, ttlMs = 300000) { // 5 minutes default
        try {
            if (this.redis) {
                const ttlSec = ttlMs ? Math.ceil(ttlMs / 1000) : null;
                await this.redis.set(key, value, ttlSec);
            } else {
                this.memoryCache.set(key, value);
                setTimeout(() => this.memoryCache.delete(key), ttlMs);
            }
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async del(key) {
        try {
            if (this.redis) {
                await this.redis.delete(key);
            } else {
                this.memoryCache.delete(key);
            }
        } catch (error) {
            console.error('Cache del error:', error);
        }
    }

    // Flash deals specific methods
    getActiveDealsCacheKey(limit = 10) {
        return `flash_deals:active:${limit}`;
    }

    async invalidateActiveDealsCache() {
        const keys = [
            this.getActiveDealsCacheKey(10),
            this.getActiveDealsCacheKey(20),
            this.getActiveDealsCacheKey(50)
        ];

        for (const key of keys) {
            await this.del(key);
        }
    }
}

const cacheService = new CacheService();

module.exports = cacheService;