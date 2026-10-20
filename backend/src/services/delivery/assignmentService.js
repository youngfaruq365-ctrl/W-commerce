// src/backend/services/delivery/assignmentService.js

const prisma = require('../../utils/prismaClient');
const { DELIVERY_STATES } = require('./deliveryStateMachine.js');

const createAssignmentForOrder = async (orderId) => {
    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { deliveryAssignment: true }
        });

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        if (order.deliveryAssignment) {
            throw new Error(`Order ${orderId} already has a delivery assignment`);
        }

        const assignment = await tx.deliveryAssignment.create({
            data: {
                orderId,
                status: DELIVERY_STATES.PENDING,
            }
        });

        await tx.deliveryTrackingEvent.create({
            data: {
                assignmentId: assignment.id,
                status: DELIVERY_STATES.PENDING,
                metadata: JSON.stringify({ note: 'Delivery assignment created' })
            }
        });

        return assignment;
    });
};

const assignCourierToDelivery = async (assignmentId, courierId, adminId = null) => {
    return await prisma.$transaction(async (tx) => {
        const assignment = await tx.deliveryAssignment.findUnique({
            where: { id: assignmentId }
        });

        if (!assignment) {
            throw new Error(`DeliveryAssignment ${assignmentId} not found`);
        }

        if (![DELIVERY_STATES.PENDING, DELIVERY_STATES.REJECTED, DELIVERY_STATES.RESCHEDULED].includes(assignment.status)) {
            throw new Error(`Cannot assign courier. Delivery is currently in state: ${assignment.status}`);
        }

        const courier = await tx.courierProfile.findUnique({
            where: { userId: courierId }
        });

        if (!courier) {
            throw new Error(`Courier profile for user ${courierId} not found`);
        }

        const updatedAssignment = await tx.deliveryAssignment.update({
            where: { id: assignmentId },
            data: {
                courierId: courier.id,
                vehicleId: courier.activeVehicleId,
                status: DELIVERY_STATES.ASSIGNED
            }
        });

        await tx.deliveryTrackingEvent.create({
            data: {
                assignmentId,
                status: DELIVERY_STATES.ASSIGNED,
                metadata: JSON.stringify({ courierId: courier.id, adminId })
            }
        });

        await tx.notificationOutbox.create({
            data: {
                eventType: 'delivery.courier.assigned',
                payload: JSON.stringify({
                    assignmentId,
                    courierId: courier.id
                }),
                status: 'PENDING'
            }
        });

        return updatedAssignment;
    });
};

module.exports = {
    createAssignmentForOrder,
    assignCourierToDelivery
};
