const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class DisputeService {
    /**
     * Create a dispute and freeze escrow payment
     */
    async createDispute(orderId, buyerId, reason, description, evidenceUrls = []) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { seller: true }
        });

        if (!order || order.buyerId !== buyerId) {
            throw new Error('Invalid order or unauthorized');
        }

        const existingDispute = await prisma.dispute.findUnique({ where: { orderId } });
        if (existingDispute) throw new Error('Dispute already exists');

        const responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

        const dispute = await prisma.dispute.create({
            data: {
                orderId,
                buyerId,
                sellerId: order.sellerId,
                reason,
                description,
                evidenceUrls: JSON.stringify(evidenceUrls),
                responseDeadline
            },
            include: { seller: true, buyer: true }
        });

        // Freeze escrow
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'DISPUTED' }
        });

        // Update EscrowPayment if exists
        await prisma.escrowPayment.updateMany({
            where: { orderId },
            data: { status: 'DISPUTED', disputedAt: new Date() }
        });

        // Notify seller
        await prisma.notification.create({
            data: {
                userId: order.sellerId,
                title: '🚨 Dispute Opened',
                body: `A buyer opened a dispute for order #${orderId.slice(0,8)}. You have 48 hours to respond.`,
                type: 'DISPUTE',
                linkUrl: `/seller-dashboard.html?tab=disputes`
            }
        });

        logger.info(`[DISPUTE] Created ${dispute.id} for order ${orderId}`);
        return dispute;
    }

    /**
     * Auto-escalate disputes where seller hasn't responded within deadline
     * Called by cron every 30 min
     */
    async autoEscalate() {
        const now = new Date();
        const overdue = await prisma.dispute.findMany({
            where: {
                status: 'OPEN',
                responseDeadline: { lt: now },
                sellerResponse: null
            },
            include: { order: true, seller: true, buyer: true }
        });

        for (const dispute of overdue) {
            // Escalate to mediation
            await prisma.dispute.update({
                where: { id: dispute.id },
                data: { status: 'MEDIATION' }
            });

            // Notify admin and buyer
            await prisma.notification.create({
                data: {
                    userId: dispute.buyerId,
                    title: 'Dispute Escalated',
                    body: 'Seller did not respond in time. Admin will review your case.',
                    type: 'DISPUTE',
                    linkUrl: '/dispute.html'
                }
            });

            logger.info(`[DISPUTE] Auto-escalated dispute ${dispute.id} due to seller timeout`);
        }
    }

    /**
     * Resolve dispute with escrow action
     */
    async resolveDispute(disputeId, resolution, adminId, notes = '') {
        const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
        if (!dispute) throw new Error('Dispute not found');

        const statusMap = {
            'refund': 'RESOLVED_REFUNDED',
            'replacement': 'RESOLVED_REPLACEMENT',
            'reject': 'RESOLVED_REJECTED'
        };
        const newStatus = statusMap[resolution] || 'RESOLVED_REFUNDED';

        // Update dispute
        await prisma.dispute.update({
            where: { id: disputeId },
            data: {
                status: newStatus,
                adminId,
                adminNotes: notes,
                resolvedAt: new Date()
            }
        });

        // Trigger escrow action:
        // If refunded -> release refund to buyer
        // If replacement -> keep escrow until replacement ships
        if (resolution === 'refund') {
            await prisma.escrowPayment.updateMany({
                where: { orderId: dispute.orderId },
                data: { status: 'REFUNDED', refundedAt: new Date() }
            });
            await prisma.order.update({
                where: { id: dispute.orderId },
                data: { paymentStatus: 'REFUNDED', status: 'CANCELLED' }
            });
            
            // Actually refund the funds in the wallet ledger
            try {
                const escrowLedgerService = require('./escrowLedgerService');
                await escrowLedgerService.refundBuyer({ orderId: dispute.orderId, buyerId: dispute.buyerId });
            } catch (err) {
                logger.warn(`Could not automatically refund hold for order ${dispute.orderId}: ${err.message}`);
            }
        }

        // Notify both parties
        await prisma.notification.createMany({
            data: [
                {
                    userId: dispute.buyerId,
                    title: 'Dispute Resolved',
                    body: `Outcome: ${resolution}.`,
                    type: 'DISPUTE'
                },
                {
                    userId: dispute.sellerId,
                    title: 'Dispute Resolved',
                    body: `Dispute resolved. Outcome: ${resolution}.`,
                    type: 'DISPUTE'
                }
            ]
        });

        logger.info(`[DISPUTE] Resolved ${disputeId}: ${resolution}`);
        return { success: true };
    }
}

module.exports = new DisputeService();
