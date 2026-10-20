'use strict';

/**
 * Fulfillment Controller — Phase 14
 *
 * Seller-side state machine endpoints (all require seller auth):
 *
 *   POST /api/v1/fulfillment/:id/accept
 *   POST /api/v1/fulfillment/:id/reject
 *   POST /api/v1/fulfillment/:id/start-preparing
 *   POST /api/v1/fulfillment/:id/mark-packed
 *   POST /api/v1/fulfillment/:id/request-courier
 *   POST /api/v1/fulfillment/:id/handover
 *
 *   GET  /api/v1/fulfillment/:id          — get single FO (seller or buyer)
 *   GET  /api/v1/fulfillment              — list seller's FOs
 */

const fulfillmentService = require('../services/fulfillmentService');
const prisma             = require('../utils/prismaClient');
const logger             = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendError(res, err) {
    const status = err.statusCode || 500;
    logger.error(`[FulfillmentCtrl] ${err.message}`);
    return res.status(status).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message });
}

function getFulfillmentOrderId(req) {
    return req.params.id || req.params.fulfillmentOrderId;
}

// ─── GET /api/v1/fulfillment  (seller's list) ─────────────────────────────────

exports.listMyOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status, page = '1', limit = '20' } = req.query;
        const take = Math.min(Number(limit) || 20, 100);
        const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

        const where = { sellerId, ...(status ? { status } : {}) };

        const store = await prisma.store.findUnique({
            where: { sellerId }
        });

        const [orders, total, legacyOrders] = await Promise.all([
            prisma.fulfillmentOrder.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    items:   { include: { product: { select: { id: true, title: true, images: { take: 1 } } } } },
                    buyer:   { select: { id: true, fullName: true, email: true } },
                    package: { select: { id: true, barcode: true, status: true } },
                    marketplaceOrder: { select: { shippingSnapshot: true } }
                },
            }),
            prisma.fulfillmentOrder.count({ where }),
            store ? prisma.order.findMany({
                where: {
                    items: { some: { product: { storeId: store.id } } },
                    ...(status ? { status } : {})
                },
                include: {
                    buyer: { select: { fullName: true, email: true } },
                    items: { include: { product: { include: { images: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            }) : Promise.resolve([])
        ]);

        function mapFulfillmentToLegacy(fo) {
            return {
                ...fo,
                shippingAddress: fo.marketplaceOrder?.shippingSnapshot || null,
                status: fo.status === 'DELIVERED' ? 'DELIVERED' : fo.status,
                items: fo.items.map(item => ({
                    ...item,
                    product: item.product
                }))
            };
        }

        const mergedOrders = [...legacyOrders, ...orders.map(mapFulfillmentToLegacy)]
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            data:    mergedOrders,
            orders:  mergedOrders, // for frontend backwards compatibility
            meta:    { total, page: Number(page), limit: take, pages: Math.ceil(total / take) },
        });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── GET /api/v1/fulfillment/:id ─────────────────────────────────────────────

exports.getOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const id     = getFulfillmentOrderId(req);

        const fo = await prisma.fulfillmentOrder.findUnique({
            where: { id },
            include: {
                items:   { include: { product: { select: { id: true, title: true, images: { take: 1 } } } } },
                buyer:   { select: { id: true, fullName: true, email: true } },
                seller:  { select: { id: true, fullName: true } },
                package: true,
                marketplaceOrder: { select: { id: true, grandTotal: true, currency: true } },
            },
        });

        if (!fo) {
            return res.status(404).json({ success: false, message: 'Fulfillment order not found.' });
        }

        // Buyer or seller can view their own order
        if (fo.sellerId !== userId && fo.buyerId !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.json({ success: true, data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── GET /api/v1/fulfillment/:id/package ───────────────────────────────────────

exports.getPackage = async (req, res) => {
    try {
        const userId             = req.user.id;
        const fulfillmentOrderId = getFulfillmentOrderId(req);

        const pkg = await fulfillmentService.getPackageForOrder({ fulfillmentOrderId, userId });
        return res.json({ success: true, data: pkg });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/accept ─────────────────────────────────────

exports.accept = async (req, res) => {
    try {
        const sellerId             = req.user.id;
        const fulfillmentOrderId   = getFulfillmentOrderId(req);
        const { estimatedPackingMinutes } = req.body;

        const fo = await fulfillmentService.accept({
            fulfillmentOrderId,
            sellerId,
            estimatedPackingMinutes: estimatedPackingMinutes ? Number(estimatedPackingMinutes) : undefined,
        });

        return res.json({ success: true, message: 'Order accepted.', data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/reject ─────────────────────────────────────

exports.reject = async (req, res) => {
    try {
        const sellerId           = req.user.id;
        const fulfillmentOrderId = getFulfillmentOrderId(req);
        const { reason }         = req.body;

        if (!reason?.trim()) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
        }

        const fo = await fulfillmentService.reject({ fulfillmentOrderId, sellerId, reason });
        return res.json({ success: true, message: 'Order rejected.', data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/start-preparing ────────────────────────────

exports.startPreparing = async (req, res) => {
    try {
        const sellerId           = req.user.id;
        const fulfillmentOrderId = getFulfillmentOrderId(req);

        const fo = await fulfillmentService.startPreparing({ fulfillmentOrderId, sellerId });
        return res.json({ success: true, message: 'Order moved to PREPARING.', data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/mark-packed ────────────────────────────────

exports.markPacked = async (req, res) => {
    try {
        const sellerId           = req.user.id;
        const fulfillmentOrderId = getFulfillmentOrderId(req);
        const { notes, ...packageDetails } = req.body;
    // packageDetails may contain: weightKg, dimensions, description, fragile, packingNote, sealPhotoUrl

        const fo = await fulfillmentService.markPacked({ fulfillmentOrderId, sellerId, notes, packageDetails });
        return res.json({
            success: true,
            message: 'Order marked as PACKED. Package barcode generated.',
            data:    fo,
            package: fo.package || null,   // barcode + QR code for label printing
        });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/request-courier ────────────────────────────

exports.requestCourier = async (req, res) => {
    try {
        const sellerId           = req.user.id;
        const fulfillmentOrderId = getFulfillmentOrderId(req);

        const fo = await fulfillmentService.requestCourier({ fulfillmentOrderId, sellerId });
        return res.json({ success: true, message: 'Courier requested. Order is AWAITING_COURIER.', data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};

// ─── POST /api/v1/fulfillment/:id/handover ───────────────────────────────────

exports.handover = async (req, res) => {
    try {
        const sellerId             = req.user.id;
        const fulfillmentOrderId   = getFulfillmentOrderId(req);
        const { trackingNumber, carrier } = req.body;

        const fo = await fulfillmentService.handover({
            fulfillmentOrderId,
            sellerId,
            trackingNumber,
            carrier,
        });

        return res.json({ success: true, message: 'Package handed to courier.', data: fo });
    } catch (err) {
        return sendError(res, err);
    }
};
