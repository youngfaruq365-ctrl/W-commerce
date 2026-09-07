/**
 * GlobalX Geo-IP Detection Middleware
 * Automatically detects user region and currency based on IP address.
 * Falls back to default USD/Global if detection fails or is local.
 */
const http = require('http');
const logger = require('../utils/logger');

/**
 * Lightweight HTTP GET using built-in http module (avoids node-fetch dependency).
 */
function httpGet(url, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(null); }
            });
        });
        req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
        req.on('error', () => resolve(null));
    });
}

const geoIPMiddleware = async (req, res, next) => {
    // If we already have a session preference, skip
    if (req.headers.cookie?.includes('gx_currency') || req.headers.cookie?.includes('gx_lang')) {
        return next();
    }

    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Skip for localhost / private IPs
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
            req.detectedRegion = 'GLOBAL';
            return next();
        }

        // Use ip-api.com (free tier, no key needed, 1s timeout)
        const data = await httpGet(`http://ip-api.com/json/${ip}?fields=status,countryCode,currency`, 1000);

        if (data && data.status === 'success') {
            req.detectedRegion = data.countryCode;
            req.detectedCurrency = data.currency;

            // Set non-binding hint headers
            res.setHeader('X-Detected-Region', data.countryCode);
            logger.info(`[GEO] Detected user from ${data.countryCode} via IP ${ip}`);
        }
    } catch (err) {
        // Silent fail - don't block user if IP API is down
        logger.warn(`[GEO] Detection failed: ${err.message}`);
    }

    next();
};

module.exports = geoIPMiddleware;
