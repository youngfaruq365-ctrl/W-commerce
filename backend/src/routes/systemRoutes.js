const express = require('express');
const router = express.Router();

router.get('/stories', (req, res) => res.json({ success: true, stories: [], config: {} }));
router.get('/stories/config', (req, res) => res.json({ success: true, config: {} }));
router.put('/stories/config', (req, res) => res.json({ success: true, config: {} }));
router.post('/stories/config/reset', (req, res) => res.json({ success: true, config: {} }));
router.get('/stories/health', (req, res) => res.json({ success: true, health: {} }));

module.exports = router;
