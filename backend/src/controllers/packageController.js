'use strict';

/**
 * Package Controller — Phase 8
 *
 * Routes (under /api/v1/packages):
 *
 *   POST   /                        Seller: create package for a FulfillmentOrder
 *   POST   /:packageId/custody      Any party: record a custody transfer/handoff
 *   GET    /:packageId              Get package + full custody chain
 *   GET    /by-barcode/:barcode     Look up by barcode (for scanning apps)
 *   GET    /by-order/:foId          Get package for a specific FulfillmentOrder
 */

const packageService = require('../services/packageService');
const logger         = require('../utils/logger');

// ─── POST /api/v1/packages ────────────────────────────────────────────────────

exports.createPackage = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const {
            fulfillmentOrderId,
            weightKg,
            dimensions,
            description,
            fragile,
            packingNote,
            sealPhotoUrl,
        } = req.body;

        if (!fulfillmentOrderId) {
            return res.status(400).json({ success: false, message: 'fulfillmentOrderId is required.' });
        }

        const pkg = await packageService.createPackage(fulfillmentOrderId, sellerId, {
            weightKg,
            dimensions,
            description,
            fragile,
            packingNote,
            sealPhotoUrl,
        });

        return res.status(201).json({ success: true, package: pkg });

    } catch (err) {
        logger.error(`[PackageCtrl] createPackage error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Failed to create package.' : err.message,
        });
    }
};

// ─── POST /api/v1/packages/:packageId/custody ────────────────────────────────

exports.recordCustodyTransfer = async (req, res) => {
    try {
        const actorId = req.user.id;
        const { packageId } = req.params;
        const {
            fromPartyType,
            fromPartyId,
            toPartyType,
            toPartyId,
            verificationMethod,
            verificationCode,
            lat,
            lng,
            locationName,
            condition,
            conditionNote,
            photoUrl,
            notes,
            metadata,
        } = req.body;

        if (!toPartyType || !toPartyId || !verificationMethod) {
            return res.status(400).json({
                success: false,
                message: 'toPartyType, toPartyId, and verificationMethod are required.',
            });
        }

        const validMethods = ['QR_SCAN', 'OTP', 'PHOTO', 'SIGNATURE', 'SYSTEM'];
        if (!validMethods.includes(verificationMethod)) {
            return res.status(400).json({
                success: false,
                message: `verificationMethod must be one of: ${validMethods.join(', ')}.`,
            });
        }

        const event = await packageService.recordCustodyTransfer(
            packageId,
            {
                fromPartyType,
                fromPartyId,
                toPartyType,
                toPartyId,
                verificationMethod,
                verificationCode,
                lat:          lat          ? parseFloat(lat)  : null,
                lng:          lng          ? parseFloat(lng)  : null,
                locationName,
                condition:    condition    || 'GOOD',
                conditionNote,
                photoUrl,
                notes,
                metadata,
            },
            actorId
        );

        return res.status(201).json({ success: true, custodyEvent: event });

    } catch (err) {
        logger.error(`[PackageCtrl] recordCustodyTransfer error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Failed to record custody transfer.' : err.message,
        });
    }
};

// ─── GET /api/v1/packages/:packageId ────────────────────────────────────────

exports.getPackage = async (req, res) => {
    try {
        const { packageId } = req.params;
        const pkg = await packageService.getPackageChain(packageId);

        return res.json({ success: true, package: pkg });

    } catch (err) {
        logger.error(`[PackageCtrl] getPackage error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Failed to fetch package.' : err.message,
        });
    }
};

// ─── GET /api/v1/packages/by-barcode/:barcode ────────────────────────────────

exports.getByBarcode = async (req, res) => {
    try {
        const barcode = decodeURIComponent(req.params.barcode).toUpperCase();
        const pkg = await packageService.getPackageChain(barcode);

        return res.json({ success: true, package: pkg });

    } catch (err) {
        logger.error(`[PackageCtrl] getByBarcode error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Package not found.' : err.message,
        });
    }
};

// ─── GET /api/v1/packages/by-order/:foId ─────────────────────────────────────

exports.getByFulfillmentOrder = async (req, res) => {
    try {
        const { foId } = req.params;
        const pkg = await packageService.getPackageByFulfillmentOrder(foId);

        if (!pkg) {
            return res.status(404).json({ success: false, message: 'No package found for this order yet.' });
        }

        return res.json({ success: true, package: pkg });

    } catch (err) {
        logger.error(`[PackageCtrl] getByFulfillmentOrder error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch package.' });
    }
};
