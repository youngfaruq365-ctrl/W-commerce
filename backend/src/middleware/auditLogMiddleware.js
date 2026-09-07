'use strict';

/**
 * Audit Log Middleware — Phase 7
 *
 * Express middleware that automatically logs admin write operations
 * to the AuditLog table. Attach it to admin routes:
 *
 *   router.use(auditLog());  // logs all POST/PUT/PATCH/DELETE on that router
 *
 * Or per-route:
 *   router.post('/ban/:id', auditLog({ action: 'BAN_USER' }), ctrl.banUser);
 *
 * The middleware:
 *  1. Captures the request body as the "before" state (actually the input payload)
 *  2. Monkey-patches res.json() to capture the "after" state (response body)
 *  3. Writes the AuditLog entry after the response is sent (non-blocking)
 *
 * Also exports a direct `logAudit()` function for services that need to
 * log admin actions outside of Express middleware.
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// ─── Methods that constitute "write" operations ──────────────────────────────

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ─── Express Middleware ───────────────────────────────────────────────────────

/**
 * @param {Object} [options]
 * @param {string} [options.action]     — explicit action name (e.g. 'BAN_USER')
 * @param {string} [options.entityType] — explicit entity type (auto-inferred if omitted)
 */
function auditLogMiddleware(options = {}) {
    return (req, res, next) => {
        // Only log write operations
        if (!WRITE_METHODS.has(req.method)) {
            return next();
        }

        // Only log if user is an admin (or any authenticated user if needed)
        if (!req.user) {
            return next();
        }

        const startPayload = {
            body:   req.body  || {},
            params: req.params || {},
            query:  req.query  || {},
        };

        // Monkey-patch res.json to capture the response body
        const originalJson = res.json.bind(res);
        let responseBody = null;

        res.json = (body) => {
            responseBody = body;
            return originalJson(body);
        };

        // When the response finishes, write the audit log (non-blocking)
        res.on('finish', () => {
            // Skip logging for non-write or non-admin (belt-and-suspenders)
            const actorId   = req.user?.id;
            const actorType = req.user?.role === 'ADMIN' ? 'ADMIN' : 'USER';

            if (!actorId) return;

            const action     = options.action     || _inferAction(req.method);
            const entityType = options.entityType  || _inferEntityType(req.originalUrl);
            const entityId   = req.params?.id || req.params?.foId || req.params?.userId || 'N/A';

            // Build diff summary
            const diff = _buildDiff(startPayload.body, responseBody);

            _writeLog({
                actorId,
                actorType,
                action,
                entityType,
                entityId:  String(entityId),
                before:    JSON.stringify(startPayload.body).substring(0, 5000),
                after:     responseBody ? JSON.stringify(responseBody).substring(0, 5000) : null,
                diff:      diff ? JSON.stringify(diff).substring(0, 2000) : null,
                ip:        req.ip || req.headers['x-forwarded-for'] || 'unknown',
                userAgent: (req.headers['user-agent'] || '').substring(0, 500),
                endpoint:  `${req.method} ${req.originalUrl}`,
                reason:    req.body?.reason || req.body?.note || null,
            });
        });

        next();
    };
}

// ─── Direct Logging Function ──────────────────────────────────────────────────

/**
 * Log an audit entry directly (not via middleware).
 * Use this in services that need to log admin actions.
 *
 * @param {Object} entry
 * @param {string} entry.actorId
 * @param {string} entry.action
 * @param {string} entry.entityType
 * @param {string} entry.entityId
 * @param {Object} [entry.before]
 * @param {Object} [entry.after]
 * @param {string} [entry.reason]
 */
async function logAudit(entry) {
    return _writeLog({
        actorId:    entry.actorId,
        actorType:  entry.actorType || 'ADMIN',
        action:     entry.action,
        entityType: entry.entityType,
        entityId:   entry.entityId,
        before:     entry.before  ? JSON.stringify(entry.before).substring(0, 5000)  : null,
        after:      entry.after   ? JSON.stringify(entry.after).substring(0, 5000)   : null,
        diff:       entry.diff    ? JSON.stringify(entry.diff).substring(0, 2000)    : null,
        ip:         entry.ip      || null,
        userAgent:  entry.userAgent || null,
        endpoint:   entry.endpoint || null,
        reason:     entry.reason  || null,
    });
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get audit logs for an entity.
 */
async function getAuditTrail(entityType, entityId, { limit = 50, offset = 0 } = {}) {
    return prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
}

/**
 * Get all audit logs by an admin user.
 */
async function getAdminActivity(actorId, { limit = 50, offset = 0 } = {}) {
    return prisma.auditLog.findMany({
        where: { actorId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _writeLog(data) {
    try {
        await prisma.auditLog.create({ data });
    } catch (err) {
        // Audit logging should NEVER crash the request
        logger.error(`[AuditLog] Write failed: ${err.message}`);
    }
}

function _inferAction(method) {
    switch (method) {
        case 'POST':   return 'CREATE';
        case 'PUT':    return 'REPLACE';
        case 'PATCH':  return 'UPDATE';
        case 'DELETE': return 'DELETE';
        default:       return method;
    }
}

function _inferEntityType(url) {
    // /api/v1/admin/users/123/ban → 'User'
    // /api/v1/earnings/admin/release/xyz → 'FulfillmentOrder'
    const segments = url.replace(/^\/api\/(v1\/)?/, '').split('/').filter(Boolean);

    const entityMap = {
        users:       'User',
        products:    'Product',
        orders:      'Order',
        checkout:    'MarketplaceOrder',
        fulfillment: 'FulfillmentOrder',
        earnings:    'FulfillmentOrder',
        escrow:      'EscrowPayment',
        payment:     'Payment',
        stores:      'Store',
        disputes:    'Dispute',
        payouts:     'Payout',
    };

    for (const seg of segments) {
        if (entityMap[seg]) return entityMap[seg];
    }

    return segments[0] || 'Unknown';
}

function _buildDiff(input, output) {
    if (!input || !output || typeof input !== 'object') return null;

    try {
        const diff = {};
        for (const key of Object.keys(input)) {
            if (key === 'password' || key === 'token') continue;  // never log secrets
            diff[key] = input[key];
        }
        return Object.keys(diff).length > 0 ? diff : null;
    } catch {
        return null;
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = auditLogMiddleware;
module.exports.logAudit       = logAudit;
module.exports.getAuditTrail  = getAuditTrail;
module.exports.getAdminActivity = getAdminActivity;
