const express = require('express');
const router = express.Router();
const poolController = require('../controllers/poolController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Public routes (with optional auth for membership status)
router.get('/active', optionalProtect, poolController.getActivePools);
router.get('/:poolId', poolController.getPoolDetails);

// Protected routes (require login)
router.post('/create', protect, poolController.createPool);
router.post('/propose', protect, poolController.proposePool);
router.post('/join', protect, poolController.joinPool);
router.get('/my-participation', protect, poolController.getMyParticipation);
router.get('/seller/my-pools', protect, poolController.getSellerPools);
router.get('/check/:poolId', protect, poolController.checkPoolMembership);

module.exports = router;
