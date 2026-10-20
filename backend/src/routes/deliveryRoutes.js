// src/backend/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const { updateDeliveryStatus } = require('../services/delivery/deliveryService.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');
const deliveryController = require('../controllers/deliveryController.js');
const { z } = require('zod');
const { calculateDistanceMeters } = require('../utils/geoUtils');

// Schemas
const statusSchema = z.object({
    status: z.enum(['IN_TRANSIT', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'EN_ROUTE_TO_DROPOFF', 'ARRIVED_AT_DROPOFF', 'DELIVERY_VERIFICATION', 'DELIVERED', 'CANCELLED']),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    accuracy: z.number().optional().nullable(),
    metadata: z.any().optional(),
    proofUrl: z.string().url().optional(),
    deliveryPin: z.string().optional(),
    packingConfirmationCode: z.string().optional()
});

const negotiateSchema = z.object({
    proposedFee: z.number().positive('Fee must be a positive number'),
    notes: z.string().optional()
});

router.get('/dashboard', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), deliveryController.getCourierDashboard);
router.get('/queue', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), deliveryController.getDeliveryQueue);

router.post('/:id/accept', protect, authorize('COURIER'), deliveryController.acceptDelivery);
router.post('/:id/report-incident', protect, authorize('COURIER', 'ADMIN'), deliveryController.reportDeliveryIncident);

router.post('/:id/negotiate', protect, authorize('COURIER'), (req, res, next) => {
    try {
        negotiateSchema.parse(req.body);
        next();
    } catch (e) {
        return res.status(400).json({ success: false, message: e.errors[0].message });
    }
}, deliveryController.negotiateDelivery);

router.get('/active', protect, authorize('COURIER', 'ADMIN'), async (req, res) => {
    try {
        const prisma = require('../utils/prismaClient');
        const profile = await prisma.courierProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

        const isPro = req.user.subscriptionTier === 'COURIER_PRO';

        const assignments = await prisma.deliveryAssignment.findMany({
            where: {
                courierId: profile.id,
                status: { notIn: ['DELIVERED', 'CANCELLED', 'FAILED'] }
            },
            include: {
                order: {
                    include: {
                        store: { select: { storeName: true, country: true, lat: true, lng: true } },
                        items: { include: { product: { select: { title: true } } } },
                        buyer: { select: { fullName: true, phone: true } },
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        const normalised = assignments.map(a => {
            let pricing = {};
            try { pricing = JSON.parse(a.pricingSnapshot || '{}'); } catch(e) {}
            return {
                ...a,
                pickupAddress: pricing.pickupLocation || a.order?.store?.storeName || 'Seller Location',
                pickupLat: pricing.pickupLat || a.order?.store?.lat || null,
                pickupLng: pricing.pickupLng || a.order?.store?.lng || null,
                dropoffAddress: a.order?.shippingAddress || 'Customer Address',
                dropoffLat: pricing.dropoffLat || null,
                dropoffLng: pricing.dropoffLng || null,
                customerPhone: a.order?.buyer?.phone || null,
            };
        });

        const data = isPro ? normalised : (normalised[0] || null);
        res.json({ success: true, data, isPro, count: normalised.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/:id/status', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { id } = req.params;
        // Validate payload using Zod
        const validated = statusSchema.parse(req.body);
        const { status, lat, lng, metadata, proofUrl, accuracy, deliveryPin, packingConfirmationCode } = validated;
        
        const prisma = require('../utils/prismaClient');
        const assignment = await prisma.deliveryAssignment.findUnique({
            where: { id },
            include: { order: { include: { store: true } } }
        });
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        // Backend Geofence Enforcement (Max 500 meters)
        if (lat && lng && (status === 'ARRIVED_AT_PICKUP' || status === 'ARRIVED_AT_DROPOFF')) {
            let pricing = {};
            try { pricing = JSON.parse(assignment.pricingSnapshot || '{}'); } catch(e) {}
            
            let targetLat = null;
            let targetLng = null;
            
            if (status === 'ARRIVED_AT_PICKUP') {
                targetLat = pricing.pickupLat || assignment.order?.store?.lat;
                targetLng = pricing.pickupLng || assignment.order?.store?.lng;
            } else if (status === 'ARRIVED_AT_DROPOFF') {
                targetLat = pricing.dropoffLat;
                targetLng = pricing.dropoffLng;
            }
            
            if (targetLat != null && targetLng != null) {
                const distance = calculateDistanceMeters(lat, lng, targetLat, targetLng);
                if (distance > 500) {
                    return res.status(400).json({ success: false, message: `You are too far from the location (${Math.round(distance)}m). Please get closer before swiping to arrive.` });
                }
            }
        }
        
        if (status === 'DELIVERED' || status === 'PICKED_UP') {
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
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0].message });
        }
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
        await updateDeliveryStatus(id, 'DELIVERY_VERIFICATION', { courierId: req.user.id });
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

router.post('/:id/rate-courier', protect, authorize('SELLER'), deliveryController.rateCourier);

module.exports = router;
