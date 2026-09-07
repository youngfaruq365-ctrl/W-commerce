'use strict';

/**
 * Earnings Ledger Service — Phase 6
 *
 * This service is the SINGLE source of truth for seller fund movements.
 * Every debit and credit for a FulfillmentOrder flows through here.
 *
 * Design principles:
 *  1. IMMUTABILITY — Every release creates a new Transaction row.
 *     sellerAmount is locked at checkout time and never recalculated.
 *  2. IDEMPOTENCY  — All operations keyed on `ESCROW_RELEASE:{foId}`.
 *     Duplicate calls for the same FulfillmentOrder are detected and skipped.
 *  3. ATOMICITY    — All DB mutations happen inside prisma.$transaction.
 *     If the Paystack transfer fails, the ledger row is rolled back.
 *  4. AUDITABILITY — Every state transition on FulfillmentOrder.paymentStatus
 *     is recorded with timestamps: escrowReleasedAt.
 *
 * Flow (triggered by escrowV2Jobs.js cron):
 *   FulfillmentOrder.paymentStatus = HELD
 *   → escrowReleaseAt <= now
 *   → no active dispute
 *   → releaseFulfillmentEscrow()
 *       a. Check idempotency
 *       b. Initiate Paystack transfer to seller's recipient code
 *       c. Atomic transaction:
 *           - FulfillmentOrder: paymentStatus=RELEASED, escrowReleasedAt=now
 *           - Payout record created
 *           - Transaction log (seller credit)
 *       d. Notify seller
 *
 *  If Paystack is not configured (dev/test mode):
 *   → Funds are credited to the seller's platform wallet (GONG) instead
 */

const prisma          = require('../utils/prismaClient');
const logger          = require('../utils/logger');
const paystackService = require('./paystackService');
const walletService   = require('./walletService');

// ─── Constants ────────────────────────────────────────────────────────────────

const IDEMPOTENCY_PREFIX = 'ESCROW_RELEASE';
const DEV_MODE           = !process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_PRIMARY_SECRET_KEY;

// ─── Core Release Function ────────────────────────────────────────────────────

/**
 * Release escrow funds for a single FulfillmentOrder.
 *
 * @param {string} fulfillmentOrderId
 * @param {string} [triggerSource] — 'SYSTEM_AUTO' | 'BUYER_CONFIRM' | 'ADMIN_MANUAL'
 * @returns {Promise<{ released: boolean, foId, sellerAmount, payoutRef }>}
 */
async function releaseFulfillmentEscrow(fulfillmentOrderId, triggerSource = 'SYSTEM_AUTO') {
    const idempotencyKey = `${IDEMPOTENCY_PREFIX}:${fulfillmentOrderId}`;

    // ── 0. Idempotency: has this FO already been released? ──────────────────
    const existing = await prisma.transaction.findFirst({
        where: { referenceId: idempotencyKey, status: 'COMPLETED' },
        select: { id: true },
    });
    if (existing) {
        logger.info(`[EarningsLedger] Skipping duplicate release for FO ${fulfillmentOrderId}`);
        return { released: false, foId: fulfillmentOrderId, reason: 'already_released' };
    }

    // ── 1. Load FulfillmentOrder ─────────────────────────────────────────────
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        include: {
            seller: {
                select: {
                    id: true, fullName: true, email: true,
                    store: { select: { id: true, storeName: true, paystackRecipientCode: true, bankCode: true, accountNumber: true } },
                },
            },
        },
    });

    if (!fo) {
        throw new Error(`FulfillmentOrder ${fulfillmentOrderId} not found`);
    }

    // ── 2. Guards ────────────────────────────────────────────────────────────
    if (fo.paymentStatus === 'RELEASED') {
        logger.info(`[EarningsLedger] FO ${fulfillmentOrderId} already RELEASED`);
        return { released: false, foId: fulfillmentOrderId, reason: 'already_released' };
    }

    if (fo.paymentStatus !== 'HELD') {
        throw new Error(`FO ${fulfillmentOrderId} cannot be released from status ${fo.paymentStatus}`);
    }

    // sellerAmount is immutable — locked at checkout (Phase 3)
    const sellerAmount = Number(fo.sellerAmount);
    if (sellerAmount <= 0) {
        throw new Error(`FO ${fulfillmentOrderId} has invalid sellerAmount: ${sellerAmount}`);
    }

    const seller = fo.seller;
    const store  = seller?.store;

    // ── 3. Determine payout method ───────────────────────────────────────────
    let payoutRef;
    let payoutMethod;

    if (DEV_MODE) {
        // Dev/test: credit platform wallet instead of real transfer
        logger.warn(`[EarningsLedger] DEV MODE — crediting GONG wallet instead of Paystack transfer for FO ${fulfillmentOrderId}`);
        await walletService.credit(seller.id, 'GONG', sellerAmount, {
            idempotencyKey,
            referenceType: 'FULFILLMENT_ORDER',
            referenceId:   fulfillmentOrderId,
            description:   `Escrow release (dev): FO ${fulfillmentOrderId.substring(0, 8)}`,
        });
        payoutRef    = `DEV-${idempotencyKey}`;
        payoutMethod = 'WALLET_CREDIT';
    } else {
        // Production: Paystack transfer
        let recipientCode = store?.paystackRecipientCode;

        // Auto-create recipient if missing
        if (!recipientCode && store?.bankCode && store?.accountNumber) {
            try {
                const recipient = await paystackService.createTransferRecipient({
                    name:          store.storeName || seller.fullName,
                    accountNumber: store.accountNumber,
                    bankCode:      store.bankCode,
                });
                recipientCode = recipient.recipientCode;

                // Persist for future payouts
                await prisma.store.update({
                    where: { id: store.id },
                    data:  { paystackRecipientCode: recipientCode },
                });
                logger.info(`[EarningsLedger] Created Paystack recipient for store ${store.id}: ${recipientCode}`);
            } catch (err) {
                throw new Error(`Cannot create Paystack recipient for seller ${seller.id}: ${err.message}`);
            }
        }

        if (!recipientCode) {
            throw new Error(
                `Seller ${seller.id} has no Paystack recipient code and no bank details configured. ` +
                `Manual payout required.`
            );
        }

        const transfer = await paystackService.initiateTransfer({
            amount:        sellerAmount,
            recipientCode,
            reference:     `PAYOUT-${fulfillmentOrderId.replace(/-/g, '').substring(0, 20)}-${Date.now()}`,
            reason:        `Sale proceeds — FO #${fulfillmentOrderId.substring(0, 8)}`,
        });

        payoutRef    = transfer.reference;
        payoutMethod = 'PAYSTACK_TRANSFER';

        logger.info(`[EarningsLedger] Paystack transfer initiated: ${payoutRef} | ₦${sellerAmount.toLocaleString()}`);
    }

    // ── 4. Atomic ledger commit ──────────────────────────────────────────────
    const now = new Date();

    await prisma.$transaction(async (tx) => {
        // a. Mark FulfillmentOrder as RELEASED
        await tx.fulfillmentOrder.update({
            where: { id: fulfillmentOrderId },
            data: {
                paymentStatus:   'RELEASED',
                escrowReleasedAt: now,
                // Advance fulfillment status to COMPLETED if it was DELIVERED
                ...(fo.status === 'DELIVERED' ? { status: 'COMPLETED' } : {}),
            },
        });

        // b. Create Payout record
        await tx.payout.create({
            data: {
                sellerId:          seller.id,
                amount:            sellerAmount,
                currency:          fo.currency,
                status:            DEV_MODE ? 'COMPLETED' : 'PROCESSING',  // Paystack confirms via webhook
                method:            payoutMethod,
                paystackTransferId: payoutRef,
                processedAt:       DEV_MODE ? now : null,
            },
        });

        // c. Transaction log (immutable audit entry)
        await tx.transaction.create({
            data: {
                userId:      seller.id,
                type:        'ESCROW_RELEASE',
                amount:      sellerAmount,
                currency:    fo.currency,
                status:      'COMPLETED',
                referenceId: idempotencyKey,    // keyed for idempotency
                description: (
                    `Escrow released (${triggerSource}). ` +
                    `FO #${fulfillmentOrderId.substring(0, 8)} | ` +
                    `Commission: ${fo.commissionRate * 100}% (₦${Number(fo.commissionAmount).toLocaleString()}) | ` +
                    `Payout: ₦${sellerAmount.toLocaleString()} via ${payoutMethod}`
                ),
            },
        });

        // d. Also log commission as platform income
        await tx.transaction.create({
            data: {
                userId:      'PLATFORM',
                type:        'COMMISSION',
                amount:      Number(fo.commissionAmount),
                currency:    fo.currency,
                status:      'COMPLETED',
                referenceId: `COMMISSION:${fulfillmentOrderId}`,
                description: `Platform commission ${fo.commissionRate * 100}% on FO ${fulfillmentOrderId.substring(0, 8)}`,
            },
        });
    });

    // ── 5. Notify seller ─────────────────────────────────────────────────────
    await prisma.notification.create({
        data: {
            userId:  seller.id,
            type:    'ESCROW_RELEASED',
            title:   'Funds Released 💸',
            body:    `₦${sellerAmount.toLocaleString()} has been transferred to your account for order #${fulfillmentOrderId.substring(0, 8).toUpperCase()}.`,
            linkUrl: `/seller/earnings`,
        },
    }).catch(e => logger.error(`[EarningsLedger] Seller notification failed: ${e.message}`));

    logger.info(
        `[EarningsLedger] ✅ Escrow released for FO ${fulfillmentOrderId} | ` +
        `Seller ${seller.id} | ₦${sellerAmount.toLocaleString()} | via ${payoutMethod} | trigger: ${triggerSource}`
    );

    return {
        released:    true,
        foId:        fulfillmentOrderId,
        sellerId:    seller.id,
        sellerAmount,
        payoutRef,
        payoutMethod,
        triggerSource,
    };
}

// ─── Buyer Confirm Receipt ────────────────────────────────────────────────────

/**
 * Buyer explicitly confirms delivery — triggers immediate escrow release.
 * Used by the frontend "I received my order" button.
 */
async function buyerConfirmReceipt(fulfillmentOrderId, buyerId) {
    // Verify the buyer owns this FO
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        select: { buyerId: true, paymentStatus: true, status: true },
    });

    if (!fo) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    if (fo.buyerId !== buyerId) throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
    if (fo.paymentStatus === 'RELEASED') {
        return { released: false, reason: 'already_released' };
    }
    if (!['DELIVERED', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(fo.status)) {
        throw Object.assign(
            new Error('Order has not been marked as delivered yet. Please wait for delivery confirmation.'),
            { statusCode: 409 }
        );
    }

    // Update deliveredAt if not already set
    if (!fo.deliveredAt) {
        await prisma.fulfillmentOrder.update({
            where: { id: fulfillmentOrderId },
            data: { deliveredAt: new Date(), status: 'DELIVERED' },
        });
    }

    return releaseFulfillmentEscrow(fulfillmentOrderId, 'BUYER_CONFIRM');
}

// ─── Admin Manual Release ─────────────────────────────────────────────────────

/**
 * Admin forces release (e.g., dispute resolved in seller's favour).
 */
async function adminManualRelease(fulfillmentOrderId, adminId, note) {
    logger.warn(`[EarningsLedger] Admin manual release: FO ${fulfillmentOrderId} by admin ${adminId}. Note: ${note}`);
    const result = await releaseFulfillmentEscrow(fulfillmentOrderId, 'ADMIN_MANUAL');

    if (note && result.released) {
        await prisma.fulfillmentOrder.update({
            where: { id: fulfillmentOrderId },
            data:  { delayReason: `Admin release: ${note}` },
        }).catch(() => {});
    }

    return result;
}

// ─── Seller Earnings Summary ──────────────────────────────────────────────────

/**
 * Aggregate seller earnings from the ledger (Transaction table).
 * Used by the seller dashboard /earnings endpoint.
 */
async function getSellerEarningsSummary(sellerId, { startDate, endDate, page = 1, limit = 20 } = {}) {
    const where = {
        userId:  sellerId,
        type:    { in: ['ESCROW_RELEASE', 'PURCHASE'] },
        status:  'COMPLETED',
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate   ? { lte: new Date(endDate)   } : {}),
            },
        } : {}),
    };

    const [entries, total, aggregate] = await Promise.all([
        prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * limit,
            take:    limit,
        }),
        prisma.transaction.count({ where }),
        prisma.transaction.aggregate({
            where: { userId: sellerId, type: 'ESCROW_RELEASE', status: 'COMPLETED' },
            _sum:  { amount: true },
        }),
    ]);

    // Held (pending release)
    const held = await prisma.fulfillmentOrder.aggregate({
        where: { sellerId, paymentStatus: 'HELD' },
        _sum:  { sellerAmount: true },
    });

    return {
        totalEarned:   Number(aggregate._sum.amount || 0),
        totalHeld:     Number(held._sum.sellerAmount || 0),
        entries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    releaseFulfillmentEscrow,
    buyerConfirmReceipt,
    adminManualRelease,
    getSellerEarningsSummary,
};
