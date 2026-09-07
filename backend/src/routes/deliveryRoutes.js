// src/backend/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const { updateDeliveryStatus } = require('../services/delivery/deliveryService.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');
const deliveryController = require('../controllers/deliveryController.js');

router.get('/queue', protect, authorize('COURIER', 'ADMIN'), deliveryController.getDeliveryQueue);
router.get('/active', protect, authorize('COURIER', 'ADMIN'), async (req, res) => {
    try {
        const prisma = require('../utils/prismaClient');
        const profile = await prisma.courierProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

        const assignment = await prisma.deliveryAssignment.findFirst({
            where: {
                courierId: profile.id,
                status: { notIn: ['DELIVERED', 'CANCELLED', 'FAILED'] }
            },
            include: {
                order: {
                    include: {
                        items: { include: { product: { select: { title: true } } } },
                        store: { select: { storeName: true, country: true, user: { select: { phone: true } } } },
                        buyer: { select: { fullName: true, phone: true } },
                    }
                }
            }
        });
        
        res.json({ success: true, data: assignment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/:id/status', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, lat, lng, metadata, proofUrl, accuracy, deliveryPin, packingConfirmationCode } = req.body;
        
        if (status === 'DELIVERED' || status === 'PICKED_UP') {
            const prisma = require('../utils/prismaClient');
            const assignment = await prisma.deliveryAssignment.findUnique({
                where: { id },
                include: { order: true }
            });
            
            if (status === 'DELIVERED' && assignment?.order?.deliveryConfirmationCode && assignment.order.deliveryConfirmationCode !== deliveryPin) {
                return res.status(400).json({ success: false, message: 'Invalid delivery PIN' });
            }
            
            if (status === 'PICKED_UP' && assignment?.order?.packingConfirmationCode && assignment.order.packingConfirmationCode !== packingConfirmationCode) {
                return res.status(400).json({ success: false, message: 'Invalid packing confirmation code' });
            }
        }
        
        const updatedAssignment = await updateDeliveryStatus(id, status, {
            lat,
            lng,
            accuracy,
            metadata,
            proofUrl,
            courierId: req.user.role === 'COURIER' ? req.user.id : undefined,
        });

        res.status(200).json({ success: true, assignment: updatedAssignment });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/verify-pickup', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { qrCode } = req.body;
        const prisma = require('../utils/prismaClient');
        
        const assignment = await prisma.deliveryAssignment.findUnique({ where: { id } });
        if (!assignment || assignment.pickupQrCode !== qrCode) {
             return res.status(400).json({ success: false, message: 'Invalid QR Code' });
        }
        
        const { updateDeliveryStatus } = require('../services/delivery/deliveryService.js');
        const updated = await updateDeliveryStatus(id, 'PICKED_UP', { courierId: req.user.id });
        res.status(200).json({ success: true, assignment: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/verify-dropoff', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { pin } = req.body;
        const prisma = require('../utils/prismaClient');
        
        const assignment = await prisma.deliveryAssignment.findUnique({ where: { id } });
        if (!assignment || assignment.deliveryPin !== pin) {
             return res.status(400).json({ success: false, message: 'Invalid Delivery PIN' });
        }
        
        const { updateDeliveryStatus } = require('../services/delivery/deliveryService.js');
        const updated = await updateDeliveryStatus(id, 'DELIVERED', { courierId: req.user.id });
        res.status(200).json({ success: true, assignment: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/call', protect, async (req, res) => {
    try {
        const twilioMaskingService = require('../services/twilioMaskingService');
        const proxyNumber = await twilioMaskingService.getProxyNumber(req.params.id, req.user.id, req.body.recipientId);
        res.status(200).json({ success: true, proxyNumber });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
