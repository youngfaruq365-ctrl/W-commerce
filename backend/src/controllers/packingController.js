const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
const packingWorkflowService = require('../services/packingWorkflowService');

const RESPONSE_TEMPLATES = {
    shipping_tomorrow: 'SHIPPING_TOMORROW',
    refund_issued: 'REFUND_ISSUED',
    replacement_sent: 'REPLACEMENT_SENT',
    product_unavailable: 'PRODUCT_UNAVAILABLE'
};

function normalizeIssueType(value) {
    const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (['MISSING_ITEM', 'WRONG_ITEM', 'DAMAGED_PRODUCT', 'LATE_DELIVERY'].includes(normalized)) {
        return normalized;
    }

    return 'MISSING_ITEM';
}

async function getOrderForPacking(orderId) {
    return prisma.order.findUnique({
        where: { id: orderId },
        include: {
            buyer: {
                select: {
                    id: true,
                    fullName: true,
                    email: true
                }
            },
            items: {
                include: {
                    product: {
                        include: {
                            store: true,
                            images: {
                                where: { isPrimary: true },
                                take: 1,
                                select: { url: true }
                            }
                        }
                    }
                }
            },
            packingResponse: true,
            packingIssue: true,
            trackingEvents: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    });
}

function sellerOwnsOrder(order, sellerId) {
    return order.items.some((item) => item.product?.store?.sellerId === sellerId);
}

exports.markOrderPacked = async (req, res) => {
    try {
        const { orderId } = req.body;
        const sellerId = req.user.id;

        const order = await getOrderForPacking(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!sellerOwnsOrder(order, sellerId)) {
            return res.status(403).json({ success: false, message: 'Not authorized to pack this order' });
        }

        if (!['PAID', 'PROCESSING'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Cannot pack order with status: ${order.status}` });
        }

        const identifiers = packingWorkflowService.buildPackingIdentifiers(orderId);

        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'PACKED',
                packedAt: new Date(),
                packingSerial: identifiers.packingSerial,
                packingConfirmationCode: identifiers.packingConfirmationCode
            }
        });

        await notificationService.createWorkflowNotifications({
            userId: order.buyerId,
            orderId,
            message: `Order ${identifiers.packingSerial} is packed. Confirmation code: ${identifiers.packingConfirmationCode}. Escrow protected while you verify the package.`,
            type: 'delivery_update',
            channels: ['in_app', 'email']
        });

        await prisma.trackingEvent.create({
            data: {
                orderId,
                status: 'PACKED',
                location: 'Seller Warehouse',
                description: `Order packed. Serial ${identifiers.packingSerial}. Awaiting buyer confirmation.`
            }
        });

        res.json({
            success: true,
            message: 'Order marked as packed and buyer notified.',
            packingSerial: identifiers.packingSerial,
            confirmationCode: identifiers.packingConfirmationCode
        });
    } catch (error) {
        logger.error(`Mark Order Packed Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.confirmPackage = async (req, res) => {
    try {
        const { orderId, confirmationCode } = req.body;
        const buyerId = req.user.id;

        const order = await getOrderForPacking(orderId);
        if (!order || order.buyerId !== buyerId) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'PACKED') {
            return res.status(400).json({ success: false, message: `Cannot confirm order with status: ${order.status}` });
        }

        if (!confirmationCode || !order.packingConfirmationCode || String(confirmationCode).trim().toUpperCase() !== String(order.packingConfirmationCode).trim().toUpperCase()) {
            return res.status(400).json({ success: false, message: 'Confirmation code is missing or invalid.' });
        }

        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'CONFIRMED',
                packageConfirmedAt: new Date(),
                readyToShipAt: new Date(),
                responseDueAt: null
            }
        });

        const sellerId = order.items[0]?.product?.store?.sellerId;
        if (sellerId) {
            await notificationService.createWorkflowNotifications({
                userId: sellerId,
                orderId,
                message: `Buyer confirmed package ${order.packingSerial || orderId.substring(0, 8)}. Ready for shipping.`,
                type: 'delivery_update',
                channels: ['in_app']
            });
        }

        await prisma.trackingEvent.create({
            data: {
                orderId,
                status: 'CONFIRMED',
                location: 'Buyer Verification',
                description: 'Buyer confirmed package contents. Ready for shipping.'
            }
        });

        res.json({
            success: true,
            message: 'Package confirmed. Seller has been notified and shipping can proceed.'
        });
    } catch (error) {
        logger.error(`Confirm Package Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.reportPackingIssue = async (req, res) => {
    try {
        const { orderId, issueType, message } = req.body;
        const buyerId = req.user.id;

        const order = await getOrderForPacking(orderId);
        if (!order || order.buyerId !== buyerId) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'PACKED') {
            return res.status(400).json({ success: false, message: `Cannot report issue for order with status: ${order.status}` });
        }

        const sellerId = order.items[0]?.product?.store?.sellerId;
        if (!sellerId) {
            return res.status(400).json({ success: false, message: 'Seller information not found' });
        }

        const normalizedType = normalizeIssueType(issueType);
        const responseDeadline = new Date(Date.now() + (24 * 60 * 60 * 1000));

        const issue = await prisma.packingIssue.upsert({
            where: { orderId },
            update: {
                issueType: normalizedType,
                buyerMessage: message || null,
                status: 'OPEN',
                responseDeadline,
                sellerRespondedAt: null,
                escalatedAt: null,
                responseLatencyMinutes: null
            },
            create: {
                orderId,
                buyerId,
                sellerId,
                issueType: normalizedType,
                buyerMessage: message || null,
                status: 'OPEN',
                responseDeadline
            }
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { responseDueAt: responseDeadline }
        });

        await notificationService.createWorkflowNotifications({
            userId: sellerId,
            orderId,
            message: `Buyer reported ${normalizedType.replace(/_/g, ' ').toLowerCase()} for ${order.packingSerial || orderId.substring(0, 8)}. Seller response due within 24h.`,
            type: 'delivery_update',
            channels: ['in_app', 'email']
        });

        await prisma.trackingEvent.create({
            data: {
                orderId,
                status: 'ISSUE_REPORTED',
                location: 'Buyer Verification',
                description: `Buyer reported ${normalizedType.replace(/_/g, ' ').toLowerCase()}.`
            }
        });

        res.json({
            success: true,
            message: 'Issue reported. Seller has 24 hours to respond before escalation.',
            issue
        });
    } catch (error) {
        logger.error(`Report Packing Issue Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.sendPackingResponse = async (req, res) => {
    try {
        const { orderId, responseType, customMessage } = req.body;
        const sellerId = req.user.id;

        const order = await getOrderForPacking(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!sellerOwnsOrder(order, sellerId)) {
            return res.status(403).json({ success: false, message: 'Not authorized to respond to this order' });
        }

        const templateKey = RESPONSE_TEMPLATES[String(responseType || '').trim().toLowerCase()] || String(responseType || '').trim().toUpperCase();
        const template = packingWorkflowService.getResponseTemplate(templateKey);
        if (!template) {
            return res.status(400).json({ success: false, message: 'Invalid response type' });
        }

        const issue = order.packingIssue;
        const respondedAt = new Date();
        const responseTimeMinutes = issue?.createdAt
            ? Math.max(1, Math.round((respondedAt.getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60)))
            : null;

        await prisma.packingResponse.upsert({
            where: { orderId },
            update: {
                type: template.type,
                message: template.message,
                buyerMessage: customMessage || null,
                templateKey,
                issueType: issue?.issueType || null,
                respondedAt,
                responseTimeMinutes,
                escalated: false
            },
            create: {
                orderId,
                type: template.type,
                message: template.message,
                buyerMessage: customMessage || null,
                templateKey,
                issueType: issue?.issueType || null,
                respondedAt,
                responseTimeMinutes,
                escalated: false
            }
        });

        if (issue) {
            await prisma.packingIssue.update({
                where: { orderId },
                data: {
                    status: 'SELLER_RESPONDED',
                    sellerRespondedAt: respondedAt,
                    responseLatencyMinutes: responseTimeMinutes
                }
            });
        }

        let nextStatus = order.status;
        const tType = String(template.type).toUpperCase();
        if (tType === 'REFUND_ISSUED' || tType === 'PRODUCT_UNAVAILABLE') {
            nextStatus = 'CANCELLED';
        } else if (tType === 'SHIPPING_TOMORROW' || tType === 'REPLACEMENT_SENT') {
            nextStatus = 'CONFIRMED';
        }

        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: nextStatus,
                responseDueAt: null
            }
        });

        const responseSummary = customMessage ? `${template.message} ${customMessage}` : template.message;
        const trustMessage = responseTimeMinutes ? ` Seller responded in ${responseTimeMinutes} mins.` : '';

        await notificationService.createWorkflowNotifications({
            userId: order.buyerId,
            orderId,
            message: `Update on ${order.packingSerial || orderId.substring(0, 8)}: ${responseSummary}.${trustMessage}`,
            type: 'delivery_update',
            channels: ['in_app', 'email']
        });

        await prisma.trackingEvent.create({
            data: {
                orderId,
                status: template.type.toUpperCase(),
                location: 'Seller Response',
                description: responseSummary
            }
        });

        res.json({
            success: true,
            message: 'Response sent to buyer.',
            responseTimeMinutes
        });
    } catch (error) {
        logger.error(`Send Packing Response Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getOrdersToPack = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const store = await prisma.store.findUnique({ where: { sellerId } });
        if (!store) {
            return res.json({ success: true, orders: [] });
        }

        const orders = await prisma.order.findMany({
            where: {
                status: { in: ['PAID', 'PROCESSING'] },
                items: {
                    some: {
                        product: { storeId: store.id }
                    }
                }
            },
            include: {
                buyer: { select: { fullName: true, email: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                title: true,
                                price: true,
                                stock: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({ success: true, orders });
    } catch (error) {
        logger.error(`Get Orders To Pack Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getPackedOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const store = await prisma.store.findUnique({ where: { sellerId } });
        if (!store) {
            return res.json({ success: true, orders: [] });
        }

        const orders = await prisma.order.findMany({
            where: {
                status: { in: ['PACKED', 'CONFIRMED', 'DISPUTED'] },
                items: {
                    some: {
                        product: { storeId: store.id }
                    }
                }
            },
            include: {
                buyer: { select: { fullName: true, email: true } },
                items: {
                    include: {
                        product: { select: { title: true, price: true } }
                    }
                },
                packingResponse: true,
                packingIssue: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        const decorated = orders.map((order) => ({
            ...order,
            trustIndicators: [
                'Escrow protected',
                order.packingResponse?.responseTimeMinutes ? `Seller responded in ${order.packingResponse.responseTimeMinutes} mins` : null
            ].filter(Boolean)
        }));

        res.json({ success: true, orders: decorated });
    } catch (error) {
        logger.error(`Get Packed Orders Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getOrdersForConfirmation = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const orders = await prisma.order.findMany({
            where: {
                buyerId,
                status: { in: ['PACKED', 'DISPUTED'] }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                price: true,
                                images: {
                                    where: { isPrimary: true },
                                    select: { url: true },
                                    take: 1
                                }
                            }
                        }
                    }
                },
                trackingEvents: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                packingIssue: true,
                packingResponse: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        const decorated = orders.map((order) => ({
            ...order,
            trustIndicators: [
                'Escrow protected',
                order.packingResponse?.responseTimeMinutes ? `Seller responded in ${order.packingResponse.responseTimeMinutes} mins` : null
            ].filter(Boolean)
        }));

        res.json({ success: true, orders: decorated });
    } catch (error) {
        logger.error(`Get Orders For Confirmation Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
