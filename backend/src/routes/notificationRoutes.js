const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

router.get('/', notificationController.getNotifications);
router.post('/subscribe', notificationController.subscribeNotifications);
router.post('/mark-read/:notificationId', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.post('/:notificationId/interact', notificationController.interactWithNotification);
router.delete('/:notificationId', notificationController.deleteNotification);


module.exports = router;
