'use strict';

/**
 * Tracking Routes — Phase 17
 *
 * REST API for delivery tracking. Supplements real-time Socket.IO events
 * with an HTTP endpoint for initial page load (before the socket connects).
 */

const express         = require('express');
const router          = express.Router();
const { protect }     = require('../middleware/authMiddleware');
const gpsTracking     = require('../services/delivery/gpsTrackingService');
const prisma          = require('../utils/prismaClient');
const logger          = require('../utils/logger');

router.use(protect);

// ─── GET /api/v1/tracking/by-order/:fulfillmentOrderId ───────────────────────
// Must come BEFORE /:assignmentId to prevent shadowing
router.get('/by-order/:fulfillmentOrderId', async (req, res) => {
    try {
        const assignment = await prisma.deliveryAssignment.findFirst({
            where:  { fulfillmentOrderId: req.params.fulfillmentOrderId },
            select: { id: true },
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'No delivery assignment found for this fulfillment order.',
            });
        }

        const snapshot = await gpsTracking.getTrackingSnapshot(assignment.id, req.user.id);
        return res.json({ success: true, data: snapshot });
    } catch (err) {
        logger.error(`[TrackingRoute] GET /by-order/:foId: ${err.message}`);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/v1/tracking/:assignmentId ──────────────────────────────────────

router.get('/:assignmentId', async (req, res) => {
    try {
        const snapshot = await gpsTracking.getTrackingSnapshot(
            req.params.assignmentId,
            req.user.id
        );
        return res.json({ success: true, data: snapshot });
    } catch (err) {
        logger.error(`[TrackingRoute] GET /:assignmentId: ${err.message}`);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
});

module.exports = router;
