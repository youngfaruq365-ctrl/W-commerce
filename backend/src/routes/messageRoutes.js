const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// Get list of active conversations
router.get('/conversations', protect, messageController.getConversations);

// Recent inbox preview
router.get('/recent', protect, messageController.getRecentMessages);

// Get specific history
router.get('/history', protect, messageController.getHistory);
router.get('/history/:otherUserId', protect, messageController.getHistory);

// Send a message
router.post('/send', protect, messageController.sendMessage);
router.post('/send/order/:orderId', protect, messageController.sendMessage);
router.post('/send/delivery/:deliveryId', protect, messageController.sendMessage);

// Mark as read
router.post('/mark-read/:otherUserId', protect, messageController.markAsRead);
router.post('/mark-read', protect, messageController.markAsRead);

// Quick replies
router.get('/quick-replies', protect, messageController.getQuickReplies);
router.post('/quick-replies', protect, messageController.createQuickReply);

// Translate message
router.post('/translate', protect, messageController.translateMessage);

module.exports = router;
