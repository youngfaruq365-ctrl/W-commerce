// src/backend/routes/dispatchRoutes.js
const express = require('express');
const router = express.Router();
const { assignCourierToDelivery } = require('../services/delivery/assignmentService.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');
const prisma = require('../utils/prismaClient');

router.post('/assign', protect, authorize('DISPATCH_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { assignmentId, courierId } = req.body;
        
        const updatedAssignment = await assignCourierToDelivery(assignmentId, courierId, req.user.id);

        res.status(200).json({ success: true, assignment: updatedAssignment });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/fleet', protect, authorize('DISPATCH_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const couriers = await prisma.courierProfile.findMany({
            where: { status: 'ONLINE' },
            include: { activeVehicle: true, assignments: { where: { status: { in: ['ASSIGNED', 'IN_TRANSIT', 'EN_ROUTE_TO_PICKUP'] } } }, user: { select: { fullName: true } } }
        });

        res.status(200).json({ success: true, couriers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/orders/unassigned', protect, authorize('DISPATCH_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        // Fetch orders that don't have a delivery assignment, or have a pending one
        const orders = await prisma.order.findMany({
            where: {
                fulfillmentOrders: {
                    some: { status: 'AWAITING_COURIER' }
                },
                deliveryAssignment: null
            },
            include: { buyer: { select: { fullName: true, addresses: true } } },
            take: 20
        });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/match/:orderId', protect, authorize('DISPATCH_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const couriers = await prisma.courierProfile.findMany({
            where: { status: 'ONLINE' },
            include: { activeVehicle: true, assignments: { where: { status: { in: ['ASSIGNED', 'IN_TRANSIT', 'EN_ROUTE_TO_PICKUP'] } } }, user: { select: { fullName: true } } }
        });

        // Score couriers by availability (fewer active jobs = higher score)
        const scoredCouriers = couriers.map((courier) => {
            const activeAssignments = courier.assignments.length;
            const score = Math.max(0, 100 - (activeAssignments * 20));
            return {
                courierId: courier.id,
                score,
                activeJobs: activeAssignments,
                vehicleType: courier.activeVehicle?.type || 'UNKNOWN',
                courierName: courier.user?.fullName || 'Unknown',
                courier
            };
        });

        scoredCouriers.sort((a, b) => b.score - a.score);

        res.status(200).json({ success: true, matches: scoredCouriers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
