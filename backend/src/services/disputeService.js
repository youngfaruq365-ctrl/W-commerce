const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const escrowLedgerService = require('./escrowLedgerService');
const sellerBanningService = require('./sellerBanningService');

const DISPUTE_CAUSES = {
  DAMAGED_ITEM: {
    category: 'DAMAGED_ITEM',
    title: 'Damaged or Defective Item',
    icon: 'PackageX',
    description: 'The product arrived broken, crushed, defective, or not functioning properly.',
    subCauses: [
      { id: 'CRUSHED_BOX', label: 'Crushed / Torn Shipping Packaging', requiredEvidence: ['photo_packaging', 'photo_item'] },
      { id: 'BROKEN_SCREEN', label: 'Shattered Screen / Cracked Display', requiredEvidence: ['photo_item'] },
      { id: 'DEFECTIVE_HARDWARE', label: 'Internal Hardware or Electronic Malfunction', requiredEvidence: ['video_demo', 'photo_serial'] },
      { id: 'LEAKING_PACKAGE', label: 'Spilled or Leaking Product Contents', requiredEvidence: ['photo_packaging'] }
    ]
  },
  WRONG_ITEM: {
    category: 'WRONG_ITEM',
    title: 'Wrong Item or Variant Received',
    icon: 'Shuffle',
    description: 'Received a completely different product, incorrect size, wrong color, or missing components.',
    subCauses: [
      { id: 'WRONG_SIZE', label: 'Incorrect Size / Measurements Received', requiredEvidence: ['photo_tag', 'photo_item'] },
      { id: 'WRONG_COLOR', label: 'Incorrect Color / Style Mismatch', requiredEvidence: ['photo_item'] },
      { id: 'COMPLETELY_DIFFERENT', label: 'Completely Different Product Received', requiredEvidence: ['photo_item', 'photo_shipping_label'] },
      { id: 'MISSING_PARTS', label: 'Missing Accessories, Cables, or Parts', requiredEvidence: ['photo_item', 'photo_box'] }
    ]
  },
  NOT_AS_DESCRIBED: {
    category: 'NOT_AS_DESCRIBED',
    title: 'Not As Described or Counterfeit',
    icon: 'AlertTriangle',
    description: 'Item differs significantly from seller photos/specifications or suspected fake.',
    subCauses: [
      { id: 'COUNTERFEIT_SUSPECTED', label: 'Suspected Inauthentic / Counterfeit Product', requiredEvidence: ['photo_serial', 'photo_logo'] },
      { id: 'SPEC_MISMATCH', label: 'Material or Technical Specification Mismatch', requiredEvidence: ['photo_item', 'screenshot_listing'] },
      { id: 'USED_SOLD_AS_NEW', label: 'Used / Refurbished Item Sold As Brand New', requiredEvidence: ['photo_scratches_wear'] }
    ]
  },
  NOT_RECEIVED: {
    category: 'NOT_RECEIVED',
    title: 'Package Not Received',
    icon: 'Truck',
    description: 'Tracking has ceased updating or package is marked delivered but was not received.',
    subCauses: [
      { id: 'TRACKING_STUCK', label: 'Tracking Inactive / In Transit >7 Days Past ETA', requiredEvidence: ['carrier_tracking_screenshot'] },
      { id: 'MARKED_DELIVERED_NOT_RECEIVED', label: 'Marked "Delivered" but Not Received', requiredEvidence: ['neighborhood_statement'] },
      { id: 'INVALID_TRACKING', label: 'Invalid / Fake Tracking Number Provided', requiredEvidence: ['carrier_lookup_screenshot'] }
    ]
  },
  SELLER_UNRESPONSIVE: {
    category: 'SELLER_UNRESPONSIVE',
    title: 'Seller Unresponsive or Refused Return',
    icon: 'MessageSquareOff',
    description: 'Seller refuses to honor stated return policy or has stopped responding to customer inquiries.',
    subCauses: [
      { id: 'REFUSED_POLICY', label: 'Seller Refused Valid Return Window Policy', requiredEvidence: ['chat_screenshot'] },
      { id: 'GHOSTED_48H', label: 'Seller Ghosted Inquiries for Over 48 Hours', requiredEvidence: ['chat_screenshot'] }
    ]
  }
};

class DisputeService {
    /**
     * Get standardized dispute causes taxonomy
     */
    getDisputeCauses() {
        return DISPUTE_CAUSES;
    }

    /**
     * Create a dispute and freeze escrow payment
     */
    async createDispute(orderId, buyerId, reason, description, evidenceUrls = [], extraMeta = {}) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { seller: { include: { store: true } } }
        });

        if (!order || order.buyerId !== buyerId) {
            throw new Error('Invalid order or unauthorized');
        }

        const existingDispute = await prisma.dispute.findUnique({ where: { orderId } });
        if (existingDispute) throw new Error('Dispute already exists for this order');

        const responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

        const causeCategory = extraMeta.causeCategory || reason;
        const subCause = extraMeta.subCause || null;
        const desiredResolution = extraMeta.desiredResolution || 'REFUND'; // REFUND, REPLACEMENT, PARTIAL_DISCOUNT

        const categoryInfo = DISPUTE_CAUSES[causeCategory] || { title: reason || 'Item Dispute' };
        const subCauseInfo = categoryInfo.subCauses?.find(sc => sc.id === subCause);

        const structuredDescription = JSON.stringify({
            userStatement: description,
            causeCategory,
            causeTitle: categoryInfo.title,
            subCause,
            subCauseLabel: subCauseInfo ? subCauseInfo.label : subCause,
            desiredResolution
        });

        const dispute = await prisma.dispute.create({
            data: {
                orderId,
                buyerId,
                sellerId: order.sellerId,
                reason: causeCategory,
                description: structuredDescription,
                evidenceUrls: JSON.stringify(evidenceUrls),
                responseDeadline
            },
            include: { seller: true, buyer: true }
        });

        // Freeze escrow on the order
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'DISPUTED' }
        });

        // Update EscrowPayment if exists
        await prisma.escrowPayment.updateMany({
            where: { orderId },
            data: { status: 'DISPUTED', disputedAt: new Date() }
        });

        // Lock WalletHold so funds cannot be auto-released during dispute
        try {
            await escrowLedgerService.disputeHold(orderId);
        } catch (err) {
            logger.warn(`[DISPUTE] Could not lock WalletHold for order ${orderId}: ${err.message}`);
        }

        // Notify seller with comprehensive cause alert & banning risk
        const orderShort = orderId.slice(0, 8).toUpperCase();
        const frozenAmount = Number(order.totalAmount).toLocaleString();
        const causeDisplay = subCauseInfo ? `${categoryInfo.title} (${subCauseInfo.label})` : categoryInfo.title;

        await prisma.notification.create({
            data: {
                userId: order.sellerId,
                title: `🚨 Dispute Opened: ${categoryInfo.title}`,
                body: `Order #${orderShort}: Buyer raised a dispute for "${causeDisplay}". Escrow frozen: $${frozenAmount}. ⏳ 48 Hours to respond. ⚠️ Unresolved disputes increase your store dispute rate and risk a +20% banning penalty.`,
                type: 'DISPUTE',
                linkUrl: `/seller-dashboard.html?tab=disputes`
            }
        }).catch(err => logger.error(`[DISPUTE] Notification error: ${err.message}`));

        // Check if dispute rate reaches threshold for banning rate
        try {
            const sellerOrdersCount = await prisma.order.count({ where: { sellerId: order.sellerId } });
            const sellerDisputesCount = await prisma.dispute.count({ where: { sellerId: order.sellerId } });
            
            const disputeRate = sellerOrdersCount > 0 ? (sellerDisputesCount / sellerOrdersCount) * 100 : 0;
            
            if (disputeRate >= 100) {
                const store = await prisma.store.findUnique({ where: { sellerId: order.sellerId } });
                if (store) {
                    await sellerBanningService.applyPenalty({
                        storeId: store.id,
                        sellerId: order.sellerId,
                        causeCode: 'HIGH_DISPUTE_RATE',
                        orderId: order.id,
                        orderNumber: orderShort,
                        reason: `Dispute rate reached ${Math.round(disputeRate)}% (${sellerDisputesCount} disputes out of ${sellerOrdersCount} orders).`
                    });
                }
            }
        } catch (err) {
            logger.error(`[DISPUTE] Error applying banning rate penalty: ${err.message}`);
        }

        logger.info(`[DISPUTE] Created ${dispute.id} for order ${orderId} (Cause: ${causeCategory})`);
        return dispute;
    }

    /**
     * Seller responds to dispute (Refund approval, Replacement, Partial settlement, or Rejection with proof)
     */
    async respondToDispute(disputeId, sellerId, payload = {}) {
        const dispute = await prisma.dispute.findUnique({
            where: { id: disputeId },
            include: { order: true }
        });

        if (!dispute) throw new Error('Dispute not found');
        if (dispute.sellerId !== sellerId) throw new Error('Unauthorized dispute response');

        const { response, message, evidenceUrls = [] } = payload;
        // response: 'SELLER_REFUND_APPROVED', 'SELLER_REPLACEMENT', 'SELLER_PARTIAL_REFUND', 'SELLER_REJECTED'

        const updateData = {
            sellerResponse: response,
            sellerResponseAt: new Date()
        };

        if (response === 'SELLER_REFUND_APPROVED') {
            updateData.status = 'RESOLVED_REFUNDED';
            updateData.resolution = 'SELLER_APPROVED_REFUND';

            // Auto-resolve escrow refund to buyer
            await prisma.escrowPayment.updateMany({
                where: { orderId: dispute.orderId },
                data: { status: 'REFUNDED', refundedAt: new Date() }
            });
            await prisma.order.update({
                where: { id: dispute.orderId },
                data: { paymentStatus: 'REFUNDED', status: 'CANCELLED' }
            });
            try {
                await escrowLedgerService.refundBuyer({ orderId: dispute.orderId, buyerId: dispute.buyerId });
            } catch (err) {
                logger.warn(`[DISPUTE] refundBuyer note: ${err.message}`);
            }

            // Notify buyer
            await prisma.notification.create({
                data: {
                    userId: dispute.buyerId,
                    title: '✅ Dispute Resolved — Refund Approved',
                    body: `The seller approved your dispute for Order #${dispute.orderId.slice(0, 8)}. Funds have been refunded to your wallet/card.`,
                    type: 'DISPUTE',
                    linkUrl: '/buyer/dashboard?tab=disputes'
                }
            }).catch(() => {});
        } else if (response === 'SELLER_REPLACEMENT') {
            updateData.status = 'SELLER_RESPONSE';
            // Notify buyer of replacement offer
            await prisma.notification.create({
                data: {
                    userId: dispute.buyerId,
                    title: '📦 Seller Offered Replacement Item',
                    body: `The seller has offered a free replacement item for Order #${dispute.orderId.slice(0, 8)}. Note: "${message}". Please review and confirm.`,
                    type: 'DISPUTE',
                    linkUrl: '/buyer/dashboard?tab=disputes'
                }
            }).catch(() => {});
        } else if (response === 'SELLER_REJECTED') {
            updateData.status = 'MEDIATION'; // Moves to admin mediation since seller contests the claim
            // Notify buyer and admin
            await prisma.notification.create({
                data: {
                    userId: dispute.buyerId,
                    title: '⚖️ Dispute Moved to Mediation',
                    body: `The seller has contested your claim with counter-evidence. An admin mediator will review both submissions within 24 hours.`,
                    type: 'DISPUTE',
                    linkUrl: '/buyer/dashboard?tab=disputes'
                }
            }).catch(() => {});
        }

        const updatedDispute = await prisma.dispute.update({
            where: { id: disputeId },
            data: updateData
        });

        // Add seller response message to thread
        await prisma.disputeMessage.create({
            data: {
                disputeId,
                senderId: sellerId,
                senderType: 'SELLER',
                message: `[RESPONSE: ${response}] ${message}`,
                evidenceUrl: Array.isArray(evidenceUrls) && evidenceUrls.length > 0 ? evidenceUrls.join(', ') : null
            }
        });

        logger.info(`[DISPUTE] Seller ${sellerId} responded to dispute ${disputeId} with ${response}`);
        return updatedDispute;
    }

    /**
     * Auto-escalate disputes where seller hasn't responded within deadline (48h)
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
                    title: 'Dispute Escalated to Admin Mediation',
                    body: 'The seller did not respond within 48 hours. An admin mediator has taken over your dispute for immediate resolution.',
                    type: 'DISPUTE',
                    linkUrl: '/buyer/dashboard?tab=disputes'
                }
            });

            // Warn seller of deadline miss
            await prisma.notification.create({
                data: {
                    userId: dispute.sellerId,
                    title: '⚠️ 48h Dispute Response Deadline Missed',
                    body: `You did not respond to the dispute for Order #${dispute.orderId.slice(0, 8)} within 48 hours. It has been escalated to admin mediation, which may impact your store trust score.`,
                    type: 'ALERT',
                    linkUrl: '/seller-dashboard.html?tab=disputes'
                }
            });

            logger.info(`[DISPUTE] Auto-escalated dispute ${dispute.id} due to seller timeout`);
        }
    }

    /**
     * Resolve dispute with escrow action (Admin mediation outcome)
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

        // Trigger escrow action based on resolution
        if (resolution === 'refund') {
            await prisma.escrowPayment.updateMany({
                where: { orderId: dispute.orderId },
                data: { status: 'REFUNDED', refundedAt: new Date() }
            });
            await prisma.order.update({
                where: { id: dispute.orderId },
                data: { paymentStatus: 'REFUNDED', status: 'CANCELLED' }
            });
            try {
                await escrowLedgerService.refundBuyer({ orderId: dispute.orderId, buyerId: dispute.buyerId });
            } catch (err) {
                logger.warn(`[DISPUTE] Could not refund hold for order ${dispute.orderId}: ${err.message}`);
            }
        } else if (resolution === 'reject') {
            await prisma.escrowPayment.updateMany({
                where: { orderId: dispute.orderId },
                data: { status: 'RELEASED', releasedAt: new Date() }
            });
            await prisma.order.update({
                where: { id: dispute.orderId },
                data: { paymentStatus: 'RELEASED', status: 'COMPLETED' }
            });
            try {
                const order = await prisma.order.findUnique({
                    where: { id: dispute.orderId },
                    select: { totalAmount: true, sellerId: true, buyerId: true }
                });
                if (order) {
                    await escrowLedgerService.releaseToSeller({
                        orderId: dispute.orderId,
                        buyerId: order.buyerId || dispute.buyerId,
                        sellerId: order.sellerId || dispute.sellerId,
                        amount: order.totalAmount,
                        triggerSource: 'ADMIN_DISPUTE_REJECT'
                    });
                }
            } catch (err) {
                logger.warn(`[DISPUTE] Could not release funds to seller for order ${dispute.orderId}: ${err.message}`);
            }
        }

        // Notify both parties
        await prisma.notification.createMany({
            data: [
                {
                    userId: dispute.buyerId,
                    title: 'Dispute Resolution Completed',
                    body: `Your dispute for Order #${dispute.orderId.slice(0, 8)} has concluded with outcome: ${resolution.toUpperCase()}.`,
                    type: 'DISPUTE'
                },
                {
                    userId: dispute.sellerId,
                    title: 'Dispute Resolution Completed',
                    body: `Dispute for Order #${dispute.orderId.slice(0, 8)} has concluded with outcome: ${resolution.toUpperCase()}.`,
                    type: 'DISPUTE'
                }
            ]
        });

        logger.info(`[DISPUTE] Resolved ${disputeId}: ${resolution}`);
        return { success: true };
    }
}

module.exports = new DisputeService();
