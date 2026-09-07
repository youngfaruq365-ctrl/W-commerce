'use strict';

/**
 * Earnings V2 Controller — Phase 6
 *
 * Routes (under /api/v1/earnings):
 *   GET  /seller/summary       — Seller's earnings dashboard (total, held, paginated ledger)
 *   POST /buyer/confirm/:foId  — Buyer confirms receipt → immediate escrow release
 *   POST /admin/release/:foId  — Admin forces escrow release
 */

const earningsLedger = require('../services/earningsLedgerService');
const logger         = require('../utils/logger');

// ─── GET /api/v1/earnings/seller/summary ─────────────────────────────────────

exports.getSellerEarnings = async (req, res) => {
    try {
        const sellerId  = req.user.id;
        const page      = Math.max(1, parseInt(req.query.page  || '1',  10));
        const limit     = Math.min(50, parseInt(req.query.limit || '20', 10));
        const startDate = req.query.startDate || null;
        const endDate   = req.query.endDate   || null;

        const result = await earningsLedger.getSellerEarningsSummary(sellerId, {
            startDate,
            endDate,
            page,
            limit,
        });

        return res.json({ success: true, ...result });

    } catch (err) {
        logger.error(`[EarningsV2] getSellerEarnings error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch earnings.' });
    }
};

// ─── POST /api/v1/earnings/buyer/confirm/:foId ───────────────────────────────

exports.buyerConfirmReceipt = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { foId } = req.params;

        if (!foId) {
            return res.status(400).json({ success: false, message: 'Fulfillment order ID required.' });
        }

        const result = await earningsLedger.buyerConfirmReceipt(foId, buyerId);

        return res.json({
            success:  true,
            released: result.released,
            ...(result.reason ? { reason: result.reason } : {}),
            ...(result.sellerAmount ? { sellerAmount: result.sellerAmount } : {}),
        });

    } catch (err) {
        logger.error(`[EarningsV2] buyerConfirmReceipt error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Failed to confirm receipt.',
        });
    }
};

// ─── POST /api/v1/earnings/admin/release/:foId ──────────────────────────────

exports.adminRelease = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { foId } = req.params;
        const { note } = req.body;

        if (!foId) {
            return res.status(400).json({ success: false, message: 'Fulfillment order ID required.' });
        }

        const result = await earningsLedger.adminManualRelease(foId, adminId, note || 'Admin-triggered release');

        return res.json({
            success:  true,
            released: result.released,
            ...(result.payoutRef ? { payoutRef: result.payoutRef } : {}),
            ...(result.sellerAmount ? { sellerAmount: result.sellerAmount } : {}),
        });

    } catch (err) {
        logger.error(`[EarningsV2] adminRelease error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Failed to release escrow.',
        });
    }
};
