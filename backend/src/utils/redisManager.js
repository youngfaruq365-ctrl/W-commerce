/**
 * Redis Connection Manager
 * Provides Redis client with graceful fallback to in-memory store
 * Implements connection pooling, exponential reconnect, and health checks
 */

const redis = require('redis');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

class RedisManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useInMemoryFallback = false;
        this.inMemoryStore = new Map();
        this.redisErrorLogged = false;
        this.redisWarned = false;
        this.readyPromise = null;
        this.retryCount = 0;
        this.maxRetries = parseInt(process.env.REDIS_CONNECT_RETRIES || '5', 10);
        this.baseRetryDelayMs = parseInt(process.env.REDIS_RETRY_BASE_MS || '500', 10);
        this.retryTimer = null;
        this.status = {
            connected: false,
            backend: 'unknown',
            mode: isProduction ? 'production' : 'development',
            lastError: null,
            attempts: 0,
            lastAttemptAt: null,
            lastSuccessAt: null,
            health: 'unknown'
        };
    }

    ready() {
        return this.readyPromise || Promise.resolve();
    }

    async initialize() {
        if (this.readyPromise) {
            return this.readyPromise;
        }

        this.readyPromise = this._initializeInternal();
        return this.readyPromise;
    }

    async _initializeInternal() {
        const redisUrl = process.env.REDIS_URL;
        this.status.lastAttemptAt = new Date().toISOString();
        this.status.attempts += 1;

        if (!redisUrl) {
            if (!this.redisWarned) {
                logger.warn('⚠️ REDIS_URL not set. Using in-memory cache.');
                this.redisWarned = true;
            }
            this._enableMemoryFallback('REDIS_URL missing');
            return;
        }

        try {
            await this._connectWithBackoff(redisUrl);
            return;
        } catch (error) {
            this.status.lastError = error.message;
            if (isProduction) {
                logger.error('❌ Redis is required in production and could not be established.');
                throw error;
            }

            logger.warn('⚠️ Redis unavailable. Falling back to in-memory cache.');
            return this._enableMemoryFallback(error.message);
        }
    }

    async _connectWithBackoff(redisUrl) {
        while (this.retryCount < this.maxRetries) {
            try {
                await this._createClient(redisUrl);
                this.retryCount = 0;
                this.status.health = 'healthy';
                this.status.lastSuccessAt = new Date().toISOString();
                this.status.backend = 'Redis';
                this.status.connected = true;
                return;
            } catch (error) {
                this.retryCount += 1;
                this.status.lastError = error.message;
                const retryDelay = this.baseRetryDelayMs * Math.pow(2, this.retryCount - 1);
                const cappedDelay = Math.min(retryDelay, 10000);
                const nextDelay = cappedDelay + Math.floor(Math.random() * 100);

                if (!this.redisErrorLogged) {
                    logger.error('Redis connection failed', { error: error.message, attempt: this.retryCount, nextRetryMs: nextDelay });
                    this.redisErrorLogged = true;
                } else {
                    logger.warn('Retrying Redis connection', { attempt: this.retryCount, nextRetryMs: nextDelay });
                }

                if (this.retryCount >= this.maxRetries) {
                    throw new Error(`Redis connection failed after ${this.retryCount} attempts: ${error.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, nextDelay));
            }
        }
    }

    async _createClient(redisUrl) {
        if (this.client) {
            try {
                await this.client.quit();
            } catch (err) {
                // ignore
            }
            this.client = null;
        }

        this.client = redis.createClient({
            url: redisUrl,
            socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => {
                    if (retries >= 3) {
                        return new Error("Redis connection retries exhausted");
                    }
                    return Math.min(retries * 100, 1000);
                }
            }
        });

        this.client.on('error', (err) => {
            if (!this.redisErrorLogged) {
                logger.error(`Redis client error: ${err.message}`);
                this.redisErrorLogged = true;
            }
            this.status.lastError = err.message;
            this.status.health = 'unhealthy';
            this.useInMemoryFallback = true;
            this.isConnected = false;
        });

        this.client.on('connect', () => {
            logger.info('✅ Connected to Redis');
            this.isConnected = true;
            this.useInMemoryFallback = false;
            this.status.connected = true;
            this.status.backend = 'Redis';
            this.status.health = 'healthy';
        });

        this.client.on('end', () => {
            logger.warn('⚠️ Redis connection ended.');
            this.isConnected = false;
            this.status.connected = false;
            this.status.health = 'disconnected';
            if (!isProduction) {
                this.useInMemoryFallback = true;
            }
        });

        await this.client.connect();
        this.status.lastSuccessAt = new Date().toISOString();
        this.status.connected = true;
        this.status.health = 'healthy';

        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }

        setInterval(() => this.healthCheck(), 30000);
    }

    async healthCheck() {
        if (!this.client || !this.isConnected) {
            if (!this.useInMemoryFallback && !this.retryTimer) {
                this.reconnectWithBackoff();
            }
            return;
        }

        try {
            await this.client.ping();
            this.status.health = 'healthy';
            this.status.lastSuccessAt = new Date().toISOString();
        } catch (error) {
            logger.warn('Redis health check failed', { error: error.message });
            this.isConnected = false;
            this.status.connected = false;
            this.status.health = 'unhealthy';
            if (!isProduction) {
                this.useInMemoryFallback = true;
            }
            this.reconnectWithBackoff();
        }
    }

    async reconnectWithBackoff() {
        if (isProduction) {
            logger.warn('Redis disconnected in production; application requires Redis.');
            return;
        }

        if (this.retryTimer) {
            return;
        }

        const delay = Math.min(this.baseRetryDelayMs * Math.pow(2, this.retryCount), 10000);
        logger.info('Scheduling Redis reconnect', { delay });
        this.retryTimer = setTimeout(async () => {
            this.retryTimer = null;
            this.retryCount += 1;
            try {
                const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
                await this._createClient(redisUrl);
                this.useInMemoryFallback = false;
                this.status.connected = true;
                this.status.health = 'healthy';
            } catch (error) {
                logger.warn('Redis reconnect attempt failed', { error: error.message, retryCount: this.retryCount });
                if (this.retryCount < this.maxRetries) {
                    this.reconnectWithBackoff();
                } else {
                    logger.warn('Redis reconnect exhausted; continuing with memory fallback');
                    this.useInMemoryFallback = true;
                }
            }
        }, delay);
    }

    _enableMemoryFallback(reason) {
        this.useInMemoryFallback = true;
        this.isConnected = false;
        this.status.backend = 'in-memory';
        this.status.health = 'degraded';
        this.status.lastError = reason;
        logger.info('Cache mode: memory', { reason });
    }

    async set(key, value, expirySeconds = null) {
        try {
            if (this.useInMemoryFallback) {
                this.inMemoryStore.set(key, { value, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null });
                return;
            }

            if (expirySeconds) {
                await this.client.setEx(key, expirySeconds, JSON.stringify(value));
            } else {
                await this.client.set(key, JSON.stringify(value));
            }
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis SET failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            this.inMemoryStore.set(key, { value, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null });
        }
    }

    async get(key) {
        try {
            if (this.useInMemoryFallback) {
                const item = this.inMemoryStore.get(key);
                if (!item) return null;
                if (item.expiry && item.expiry < Date.now()) {
                    this.inMemoryStore.delete(key);
                    return null;
                }
                return item.value;
            }

            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis GET failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            return null;
        }
    }

    async increment(key, expirySeconds = null) {
        try {
            if (this.useInMemoryFallback) {
                const item = this.inMemoryStore.get(key) || { value: 0, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null };
                if (item.expiry && item.expiry < Date.now()) {
                    this.inMemoryStore.set(key, { value: 1, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null });
                    return 1;
                }
                item.value++;
                this.inMemoryStore.set(key, item);
                return item.value;
            }

            const value = await this.client.incr(key);
            if (expirySeconds && value === 1) {
                await this.client.expire(key, expirySeconds);
            }
            return value;
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis INCR failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            const item = this.inMemoryStore.get(key) || { value: 0 };
            item.value++;
            this.inMemoryStore.set(key, item);
            return item.value;
        }
    }

    async delete(key) {
        try {
            if (this.useInMemoryFallback) {
                this.inMemoryStore.delete(key);
                return;
            }
            await this.client.del(key);
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis DEL failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            this.inMemoryStore.delete(key);
        }
    }

    async flushAll() {
        try {
            if (this.useInMemoryFallback) {
                this.inMemoryStore.clear();
                return;
            }
            await this.client.flushAll();
            logger.warn('Redis cache cleared');
        } catch (error) {
            logger.error(`Redis FLUSHALL failed: ${error.message}`);
            this._enableMemoryFallback(error.message);
            this.inMemoryStore.clear();
        }
    }

    async setIfNotExists(key, value, expirySeconds) {
        try {
            if (this.useInMemoryFallback) {
                const item = this.inMemoryStore.get(key);
                if (item && (!item.expiry || item.expiry > Date.now())) return false;
                this.inMemoryStore.set(key, { value, token: value, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null });
                return true;
            }

            const setResult = await this.client.set(key, JSON.stringify(value), { NX: true, EX: expirySeconds });
            return setResult === 'OK' || setResult === true;
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis SET NX failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            const item = this.inMemoryStore.get(key);
            if (item && (!item.expiry || item.expiry > Date.now())) return false;
            this.inMemoryStore.set(key, { value, token: value, expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null });
            return true;
        }
    }

    async releaseLockIfOwner(key, ownerToken) {
        try {
            if (this.useInMemoryFallback) {
                const item = this.inMemoryStore.get(key);
                if (!item) return false;
                if (item.token === ownerToken) {
                    this.inMemoryStore.delete(key);
                    return true;
                }
                return false;
            }

            const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
            const result = await this.client.eval(script, { keys: [key], arguments: [JSON.stringify(ownerToken)] });
            return result === 1;
        } catch (error) {
            if (!this.redisErrorLogged) {
                logger.error(`Redis releaseLockIfOwner failed for key "${key}": ${error.message}`);
                this.redisErrorLogged = true;
            }
            this._enableMemoryFallback(error.message);
            const item = this.inMemoryStore.get(key);
            if (item && item.token === ownerToken) {
                this.inMemoryStore.delete(key);
                return true;
            }
            return false;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            useFallback: this.useInMemoryFallback,
            backend: this.status.backend,
            mode: this.status.mode,
            lastError: this.status.lastError,
            attempts: this.status.attempts,
            lastAttemptAt: this.status.lastAttemptAt,
            lastSuccessAt: this.status.lastSuccessAt,
            health: this.status.health,
            inMemoryKeys: this.inMemoryStore.size
        };
    }

    async close() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                logger.info('Redis connection closed gracefully');
            } catch (error) {
                logger.error(`Error closing Redis: ${error.message}`);
            }
        }
    }
}

const redisManager = new RedisManager();
module.exports = redisManager;
