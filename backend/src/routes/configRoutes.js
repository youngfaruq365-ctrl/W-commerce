const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints
router.get('/', configController.getPublicConfig);
router.get('/google-maps-key', protect, configController.getGoogleMapsKey);

module.exports = router;
