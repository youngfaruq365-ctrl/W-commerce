const express = require('express');
const router = express.Router();
const earningsService = require('../services/delivery/earningsService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ensure courier exists
const getCourierProfile = async (userId) => {
    const profile = await prisma.courierProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Courier profile not found');
    return profile;
};

// GET /api/v1/delivery/earnings/summary
router.get('/summary', protect, authorize('COURIER'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        const summary = await earningsService.getEarningsSummary(profile.id);
        res.status(200).json({ success: true, summary });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/v1/delivery/earnings/history
router.get('/history', protect, authorize('COURIER'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const history = await earningsService.getEarningsHistory(profile.id, limit, offset);
        res.status(200).json({ success: true, history });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/v1/delivery/earnings/:id
router.get('/:id', protect, authorize('COURIER'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        const earning = await prisma.courierEarning.findFirst({
            where: {
                id: req.params.id,
                courierId: profile.id
            },
            include: {
                assignment: {
                    include: {
                        order: true,
                        stops: true
                    }
                }
            }
        });

        if (!earning) {
            return res.status(404).json({ success: false, message: 'Earning not found' });
        }

        res.status(200).json({ success: true, earning });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
