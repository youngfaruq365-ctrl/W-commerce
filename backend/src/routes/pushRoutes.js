const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const prisma = require('../utils/prismaClient');

router.get('/public-key', (req, res) => {
    res.json({
        success: true,
        publicKey: process.env.VAPID_PUBLIC_KEY || 'dummy_public_key'
    });
});

router.post('/subscribe', protect, async (req, res) => {
    try {
        const subscription = req.body;
        await prisma.user.update({
            where: { id: req.user.id },
            data: { pushSubscription: JSON.stringify(subscription) }
        });
        res.status(201).json({ success: true, message: 'Subscription saved.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to save subscription.' });
    }
});

module.exports = router;
