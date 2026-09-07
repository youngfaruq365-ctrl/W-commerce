const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

// Comments
router.get('/:postId/comments', feedController.getComments);
router.post('/:postId/comments', protect, feedController.postComment);
router.delete('/:postId/comments/:commentId', protect, feedController.deleteComment);

// Likes
router.post('/:postId/like', protect, feedController.likePost);
router.delete('/:postId/like', protect, feedController.unlikePost);

// Engagement Stats
router.get('/:postId/engagement', feedController.getEngagementStats);

// Batch Event Ingestion (View, Click)
router.post('/events/batch', feedController.batchEvents);

module.exports = router;
