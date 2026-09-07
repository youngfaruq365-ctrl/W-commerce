'use strict';

/**
 * Courier Offer Routes — Phase 16
 *
 * All routes require courier authentication (protect middleware).
 * The courierId is resolved from req.user.courierProfile.id.
 *
 *   GET  /api/v1/courier/offers              — list my pending offers
 *   POST /api/v1/courier/offers/:id/accept   — accept offer
 *   POST /api/v1/courier/offers/:id/decline  — decline offer
 */

const express              = require('express');
const router               = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const courierOfferService  = require('../services/delivery/courierOfferService');
const prisma               = require('../utils/prismaClient');
const logger               = require('../utils/logger');

router.use(protect, authorize('COURIER'));

// ─── Resolve CourierProfile ID from JWT user ──────────────────────────────────

async function resolveCourierId(req, res) {
    const profile = await prisma.courierProfile.findUnique({
        where:  { userId: req.user.id },
        select: { id: true },
    });
    if (!profile) {
        res.status(403).json({ success: false, message: 'No courier profile found for this account.' });
        return null;
    }
    return profile.id;
}

// ─── GET /api/v1/courier/offers ───────────────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const courierId = await resolveCourierId(req, res);
        if (!courierId) return;

        const offers = await courierOfferService.getMyOffers(courierId);
        return res.json({ success: true, data: offers });
    } catch (err) {
        logger.error(`[CourierOfferRoute] GET /offers: ${err.message}`);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/v1/courier/offers/:id/accept ───────────────────────────────────

router.post('/:id/accept', async (req, res) => {
    try {
        const courierId = await resolveCourierId(req, res);
        if (!courierId) return;

        const offer = await courierOfferService.acceptOffer(req.params.id, courierId);
        return res.json({ success: true, message: 'Offer accepted. You are now assigned to this delivery.', data: offer });
    } catch (err) {
        logger.error(`[CourierOfferRoute] POST /offers/:id/accept: ${err.message}`);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/v1/courier/offers/:id/decline ─────────────────────────────────

router.post('/:id/decline', async (req, res) => {
    try {
        const courierId = await resolveCourierId(req, res);
        if (!courierId) return;

        const { reason } = req.body;
        await courierOfferService.declineOffer(req.params.id, courierId, reason);
        return res.json({ success: true, message: 'Offer declined.' });
    } catch (err) {
        logger.error(`[CourierOfferRoute] POST /offers/:id/decline: ${err.message}`);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
});

module.exports = router;
