const session = require('express-session');

class RedisSessionStore extends session.Store {
    constructor(options = {}) {
        super();
        this.redisManager = options.redisManager;
        this.prefix = options.prefix || 'sess:';
        this.ttlSeconds = options.ttlSeconds || 24 * 60 * 60;
        this.fallbackStore = new Map();
    }

    _key(sid) {
        return `${this.prefix}${sid}`;
    }

    _getClient() {
        const status = this.redisManager?.getStatus?.();
        if (!this.redisManager?.client || !status?.connected || status?.useFallback) {
            return null;
        }
        return this.redisManager.client;
    }

    _getTtlSeconds(sess) {
        const expires = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : null;
        if (expires && Number.isFinite(expires)) {
            return Math.max(1, Math.ceil((expires - Date.now()) / 1000));
        }

        const originalMaxAge = sess?.cookie?.originalMaxAge;
        if (originalMaxAge && Number.isFinite(originalMaxAge)) {
            return Math.max(1, Math.ceil(originalMaxAge / 1000));
        }

        return this.ttlSeconds;
    }

    async _readyClient() {
        try {
            await this.redisManager.ready();
        } catch (e) {
            // Ignore ready errors, fallback to memory
        }
        return this._getClient();
    }

    get(sid, callback) {
        this._readyClient()
            .then((client) => {
                if (!client) {
                    const payload = this.fallbackStore.get(this._key(sid));
                    return callback(null, payload ? JSON.parse(payload) : null);
                }
                return client.get(this._key(sid)).then(payload => callback(null, payload ? JSON.parse(payload) : null));
            })
            .catch((error) => callback(error));
    }

    set(sid, sess, callback) {
        this._readyClient()
            .then((client) => {
                if (!client) {
                    this.fallbackStore.set(this._key(sid), JSON.stringify(sess));
                    return callback && callback(null);
                }
                return client.setEx(this._key(sid), this._getTtlSeconds(sess), JSON.stringify(sess)).then(() => callback && callback(null));
            })
            .catch((error) => callback && callback(error));
    }

    touch(sid, sess, callback) {
        this._readyClient()
            .then((client) => {
                if (!client) {
                    return callback && callback(null);
                }
                return client.expire(this._key(sid), this._getTtlSeconds(sess)).then(() => callback && callback(null));
            })
            .catch((error) => callback && callback(error));
    }

    destroy(sid, callback) {
        this._readyClient()
            .then((client) => {
                if (!client) {
                    this.fallbackStore.delete(this._key(sid));
                    return callback && callback(null);
                }
                return client.del(this._key(sid)).then(() => callback && callback(null));
            })
            .catch((error) => callback && callback(error));
    }
}

module.exports = RedisSessionStore;
