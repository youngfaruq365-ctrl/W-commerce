 const express = require('express');
 const router = express.Router();
 const prisma = require('../utils/prismaClient');
 const logger = require('../utils/logger');
 const disputeService = require('../services/disputeService');
 const { protect, authorize } = require('../middleware/authMiddleware');

 // Buyer: Create dispute
 router.post('/', protect, async (req, res) => {
     try {
         const { orderId, reason, description, evidenceUrls } = req.body;
         const buyerId = req.user.id;

         const dispute = await disputeService.createDispute(orderId, buyerId, reason, description, evidenceUrls);
         res.json({ success: true, dispute });
     } catch (error) {
         res.status(500).json({ success: false, message: error.message });
     }
 });

// Seller: Appeal dispute
router.post('/appeal', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { reason, notes, evidenceUrls } = req.body;
        const sellerId = req.user.id;
        logger.info(`Seller ${sellerId} appealed dispute with reason: ${reason}`);
        res.json({ success: true, message: 'Dispute appeal submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get disputes based on user role
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status } = req.query;

        const where = {};

        if (userRole === 'BUYER') {
            where.buyerId = userId;
        } else if (userRole === 'SELLER') {
            where.sellerId = userId;
        } else if (userRole === 'ADMIN') {
            // Admin sees all
        }

        if (status) {
            where.status = status;
        }

        const disputes = await prisma.dispute.findMany({
            where,
            include: {
                order: {
                    select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        title: true,
                                        images: { where: { isPrimary: true }, take: 1 }
                                    }
                                }
                            }
                        }
                    }
                },
                buyer: {
                    select: { id: true, fullName: true, email: true }
                },
                seller: {
                    select: { id: true, fullName: true, email: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, disputes });
    } catch (error) {
        logger.error(`Get Disputes Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single dispute
router.get('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const dispute = await prisma.dispute.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        title: true,
                                        images: { where: { isPrimary: true }, take: 1 }
                                    }
                                }
                            }
                        }
                    }
                },
                buyer: {
                    select: { id: true, fullName: true, email: true }
                },
                seller: {
                    select: { id: true, fullName: true, email: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }

        if (userRole !== 'ADMIN' && dispute.buyerId !== userId && dispute.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, dispute });
    } catch (error) {
        logger.error(`Get Dispute Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Seller: Respond to dispute
router.put('/:id/respond', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { response, message } = req.body;
        const sellerId = req.user.id;

        const dispute = await prisma.dispute.findUnique({
            where: { id }
        });

        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }

        if (dispute.sellerId !== sellerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updateData = {
            sellerResponse: response,
            sellerResponseAt: new Date()
        };

        if (response === 'SELLER_REFUND_APPROVED') {
            updateData.status = 'RESOLVED_REFUNDED';
            updateData.resolution = 'Refund approved by seller';
        } else if (response === 'SELLER_REPLACEMENT') {
            updateData.status = 'RESOLVED_REPLACEMENT';
            updateData.resolution = 'Replacement to be shipped';
        } else if (response === 'SELLER_REJECTED') {
            updateData.status = 'RESOLVED_REJECTED';
            updateData.resolution = 'Dispute rejected by seller';
        } else {
            updateData.status = 'SELLER_RESPONSE';
        }

        const updated = await prisma.dispute.update({
            where: { id },
            data: updateData
        });

        if (message) {
            await prisma.disputeMessage.create({
                data: {
                    disputeId: id,
                    senderId: sellerId,
                    senderType: 'SELLER',
                    message
                }
            });
        }

        await prisma.notification.create({
            data: {
                userId: dispute.buyerId,
                title: 'Seller Response to Dispute',
                body: `The seller has responded to your dispute. Please check the details.`,
                type: 'DISPUTE'
            }
        });

        logger.info(`Dispute responded: ${id} by seller ${sellerId}, response: ${response}`);

        res.json({ success: true, dispute: updated });
    } catch (error) {
        logger.error(`Respond to Dispute Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Buyer: Respond to seller
router.put('/:id/buyer-respond', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { response, message } = req.body;
        const buyerId = req.user.id;

        const dispute = await prisma.dispute.findUnique({
            where: { id }
        });

        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }

        if (dispute.buyerId !== buyerId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updateData = {
            buyerResponse: response
        };

        if (response === 'BUYER_ACCEPT') {
            updateData.status = dispute.sellerResponse === 'SELLER_REFUND_APPROVED' ? 'RESOLVED_REFUNDED' : 'RESOLVED_REPLACEMENT';
            updateData.resolution = 'Resolution accepted by buyer';
        } else if (response === 'BUYER_ESCALATE') {
            updateData.status = 'MEDIATION';
        }

        const updated = await prisma.dispute.update({
            where: { id },
            data: updateData
        });

        if (message) {
            await prisma.disputeMessage.create({
                data: {
                    disputeId: id,
                    senderId: buyerId,
                    senderType: 'BUYER',
                    message
                }
            });
        }

        await prisma.notification.create({
            data: {
                userId: dispute.sellerId,
                title: 'Buyer Response to Dispute',
                body: `The buyer has responded to your dispute resolution.`,
                type: 'DISPUTE'
            }
        });

        res.json({ success: true, dispute: updated });
    } catch (error) {
        logger.error(`Buyer Respond to Dispute Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add message to dispute
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { message, evidenceUrl } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        const dispute = await prisma.dispute.findUnique({
            where: { id }
        });

        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }

        if (dispute.buyerId !== userId && dispute.sellerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const senderType = userRole === 'ADMIN' ? 'ADMIN' : (dispute.buyerId === userId ? 'BUYER' : 'SELLER');

        const newMessage = await prisma.disputeMessage.create({
            data: {
                disputeId: id,
                senderId: userId,
                senderType,
                message,
                evidenceUrl
            }
        });

        await prisma.dispute.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        const notifyUserId = dispute.buyerId === userId ? dispute.sellerId : dispute.buyerId;
        await prisma.notification.create({
            data: {
                userId: notifyUserId,
                title: 'New Message in Dispute',
                body: `You have a new message in dispute #${id.slice(0, 8)}`,
                type: 'DISPUTE'
            }
        });

        res.json({ success: true, message: newMessage });
    } catch (error) {
        logger.error(`Add Dispute Message Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin: Resolve dispute
router.put('/:id/resolve', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, adminNotes } = req.body;
        const adminId = req.user.id;

        const updated = await prisma.dispute.update({
            where: { id },
            data: {
                status: resolution,
                resolution: adminNotes,
                adminId
            }
        });

        await prisma.notification.create({
            data: {
                userId: updated.buyerId,
                title: 'Dispute Resolved by Admin',
                body: `Your dispute has been resolved by admin. Resolution: ${resolution}`,
                type: 'DISPUTE'
            }
        });

        await prisma.notification.create({
            data: {
                userId: updated.sellerId,
                title: 'Dispute Resolved by Admin',
                body: `Dispute resolved by admin. Resolution: ${resolution}`,
                type: 'DISPUTE'
            }
        });

        logger.info(`Dispute resolved by admin: ${id}, resolution: ${resolution}`);

        res.json({ success: true, dispute: updated });
    } catch (error) {
        logger.error(`Admin Resolve Dispute Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
