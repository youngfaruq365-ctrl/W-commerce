'use strict';

/**
 * Notification V2 Routes — /api/v1/notifications
 *
 * GET    /               Paginated notification list
 * GET    /unread         Unread count (bell badge)
 * PATCH  /read-all       Mark all read
 * PATCH  /:id/read       Mark one read
 *
 * Note: /read-all must come before /:id/read to avoid Express
 *       matching "read-all" as a dynamic :id param.
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificationV2Controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',           ctrl.listNotifications);
router.get('/unread',     ctrl.getUnreadCount);
router.patch('/read-all', ctrl.markAllRead);       // before /:id/read
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
