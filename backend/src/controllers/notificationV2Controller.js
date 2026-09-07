'use strict';

/**
 * Notification V2 Controller — Phase 9
 *
 * Routes (under /api/v1/notifications):
 *   GET    /           — paginated list (newest first, respects expiresAt)
 *   GET    /unread     — unread count (for bell badge)
 *   PATCH  /:id/read   — mark one notification read
 *   PATCH  /read-all   — mark all notifications read
 */

const notificationV2 = require('../services/notificationV2Service');
const logger         = require('../utils/logger');

// ─── GET /api/v1/notifications ────────────────────────────────────────────────

exports.listNotifications = async (req, res) => {
    try {
        const userId     = req.user.id;
        const page       = Math.max(1, parseInt(req.query.page       || '1',  10));
        const limit      = Math.min(50, parseInt(req.query.limit      || '20', 10));
        const unreadOnly = req.query.unreadOnly === 'true';

        const result = await notificationV2.getUserNotifications(userId, { page, limit, unreadOnly });

        return res.json({ success: true, ...result });

    } catch (err) {
        logger.error(`[NotifV2Ctrl] listNotifications: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
};

// ─── GET /api/v1/notifications/unread ────────────────────────────────────────

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await notificationV2.getUnreadCount(req.user.id);
        return res.json({ success: true, unreadCount: count });

    } catch (err) {
        logger.error(`[NotifV2Ctrl] getUnreadCount: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to get unread count.' });
    }
};

// ─── PATCH /api/v1/notifications/:id/read ────────────────────────────────────

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        await notificationV2.markRead(id, req.user.id);
        return res.json({ success: true });

    } catch (err) {
        logger.error(`[NotifV2Ctrl] markRead: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to mark as read.' });
    }
};

// ─── PATCH /api/v1/notifications/read-all ────────────────────────────────────

exports.markAllRead = async (req, res) => {
    try {
        const result = await notificationV2.markAllRead(req.user.id);
        return res.json({ success: true, updated: result.count });

    } catch (err) {
        logger.error(`[NotifV2Ctrl] markAllRead: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
    }
};
