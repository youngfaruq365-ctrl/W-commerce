// test_delivery_lifecycle.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { createAssignmentForOrder, assignCourierToDelivery } from './src/backend/services/delivery/assignmentService.js';
import { updateDeliveryStatus } from './src/backend/services/delivery/deliveryService.js';
import { DELIVERY_STATES } from './src/backend/services/delivery/deliveryStateMachine.js';

async function testLifecycle() {
    try {
        console.log("Creating mock users and order...");
        const buyer = await prisma.user.create({
            data: {
                email: `buyer_${Date.now()}@test.com`,
                passwordHash: 'hash',
                fullName: 'Test Buyer',
                role: 'BUYER'
            }
        });

        const courierUser = await prisma.user.create({
            data: {
                email: `courier_${Date.now()}@test.com`,
                passwordHash: 'hash',
                fullName: 'Test Courier',
                role: 'COURIER'
            }
        });

        const courier = await prisma.courierProfile.create({
            data: {
                userId: courierUser.id,
                status: 'ONLINE',
                activeVehicle: {
                    create: {
                        type: 'MOTORCYCLE',
                        plateNumber: 'ABC-123'
                    }
                }
            },
            include: { activeVehicle: true }
        });

        const order = await prisma.order.create({
            data: {
                buyerId: buyer.id,
                totalAmount: 5000,
                shippingCost: 500,
                taxAmount: 0,
                status: 'PAID'
            }
        });

        console.log("Mock data created. Order ID:", order.id);

        console.log("Phase 1: Creating Assignment...");
        const assignment = await createAssignmentForOrder(order.id);
        console.log("Assignment created:", assignment.id, "Status:", assignment.status);

        console.log("Phase 2: Admin assigning courier...");
        let updatedAssignment = await assignCourierToDelivery(assignment.id, courier.userId, 'admin123');
        console.log("Courier assigned. Status:", updatedAssignment.status);

        console.log("Phase 3: Courier accepts...");
        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.COURIER_ACCEPTED, { courierId: courier.id });
        console.log("Status:", updatedAssignment.status);

        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.EN_ROUTE_TO_PICKUP, { courierId: courier.id });
        
        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.ARRIVED_AT_PICKUP, { courierId: courier.id });

        console.log("Phase 4: Picked up (Should sync Order)...");
        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.PICKED_UP, { courierId: courier.id });
        
        let syncedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        console.log("Synced Order Status:", syncedOrder.status); // Should be OUT_FOR_DELIVERY

        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.IN_TRANSIT, { courierId: courier.id });

        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.ARRIVED_AT_DESTINATION, { courierId: courier.id });

        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.DELIVERY_VERIFICATION, { courierId: courier.id });

        console.log("Phase 5: Delivered (Should sync Order & create earnings)...");
        updatedAssignment = await updateDeliveryStatus(assignment.id, DELIVERY_STATES.DELIVERED, { 
            courierId: courier.id,
            proofUrl: 'https://example.com/proof.jpg'
        });

        syncedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        console.log("Final Order Status:", syncedOrder.status); // Should be DELIVERED

        const earnings = await prisma.courierEarning.findUnique({ where: { assignmentId: assignment.id } });
        console.log("Courier Earnings Created:", earnings ? earnings.amount + ' ' + earnings.currency : 'No');

        const outboxCount = await prisma.notificationOutbox.count();
        console.log("Outbox Events count:", outboxCount);

        console.log("Test Passed!");

    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testLifecycle();
