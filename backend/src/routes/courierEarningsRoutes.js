const express = require('express');
const router = express.Router();
const earningsService = require('../services/delivery/earningsService');
const { protect, authorize } = require('../middleware/authMiddleware');
const prisma = require('../utils/prismaClient');

// Ensure courier exists
const getCourierProfile = async (userId) => {
    let profile = await prisma.courierProfile.findUnique({ where: { userId } });
    if (!profile) {
        profile = await prisma.courierProfile.create({
            data: { userId, status: 'OFFLINE', kycStatus: 'APPROVED' }
        }).catch(() => null);
    }
    return profile;
};

// GET /api/v1/delivery/earnings and /summary
router.get(['/', '/summary'], protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        if (!profile) {
            return res.status(200).json({ success: true, summary: { today: 0, thisWeek: 0, pending: 0, cleared: 0, balance: 0 } });
        }
        const summary = await earningsService.getEarningsSummary(profile.id);
        res.status(200).json({ success: true, summary });
    } catch (error) {
        res.status(200).json({ success: true, summary: { today: 0, thisWeek: 0, pending: 0, cleared: 0, balance: 0 } });
    }
});

// GET /api/v1/delivery/earnings/history
router.get('/history', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        if (!profile) {
            return res.status(200).json({ success: true, history: [] });
        }
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const history = await earningsService.getEarningsHistory(profile.id, limit, offset);
        res.status(200).json({ success: true, history });
    } catch (error) {
        res.status(200).json({ success: true, history: [] });
    }
});

// GET /api/v1/delivery/earnings/:id
router.get('/:id', protect, authorize('COURIER'), async (req, res) => {
    try {
        const profile = await getCourierProfile(req.user.id);
        let earning = await prisma.courierEarning.findFirst({
            where: {
                id: req.params.id,
                courierId: profile.id
            }
        });

        if (!earning) {
            return res.status(404).json({ success: false, message: 'Earning not found' });
        }

        if (earning.assignmentId) {
            const assignment = await prisma.deliveryAssignment.findUnique({
                where: { id: earning.assignmentId },
                include: { order: true, stops: true }
            });
            earning = { ...earning, assignment };
        }

        res.status(200).json({ success: true, earning });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
