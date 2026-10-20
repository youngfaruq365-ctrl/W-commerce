const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

router.get('/', notificationController.getNotifications);

// GET /unread — returns just the unread count (used by useNotifications hook)
router.get('/unread', notificationController.getUnreadCount);

router.post('/subscribe', notificationController.subscribeNotifications);

// Support both POST (legacy) and PATCH (new hook) for marking all as read (must precede /:notificationId/read)
router.post('/mark-all-read', notificationController.markAllAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

// Support both POST (legacy) and PATCH (new hook) for marking as read
router.post('/mark-read/:notificationId', notificationController.markAsRead);
router.patch('/:notificationId/read', notificationController.markAsRead);

router.post('/:notificationId/interact', notificationController.interactWithNotification);
router.delete('/:notificationId', notificationController.deleteNotification);


module.exports = router;
