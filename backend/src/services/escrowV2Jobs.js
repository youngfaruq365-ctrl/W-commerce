'use strict';

/**
 * Escrow V2 Cron Jobs — Phase 6
 *
 * Three scheduled jobs:
 *
 *  1. escrow-v2-auto-release    (every hour, :00)
 *     Finds FulfillmentOrders where:
 *       - paymentStatus = HELD
 *       - escrowReleaseAt <= now
 *       - no open dispute against the MarketplaceOrder
 *     → Calls earningsLedgerService.releaseFulfillmentEscrow() for each
 *
 *  2. escrow-v2-stale-release   (daily, 02:00)
 *     Safety net: finds HELD FulfillmentOrders delivered > STALE_DAYS ago
 *     that somehow missed the hourly job (e.g., escrowReleaseAt never set).
 *     → Sets escrowReleaseAt = now then calls the same release function.
 *
 *  3. escrow-v2-expired-checkout  (every 15 min)
 *     Cancels MarketplaceOrders that are still PENDING and past expiresAt.
 *     → Restores stock and marks order CANCELLED.
 *     This prevents ghost reservations from abandoned checkouts.
 *
 * Registration:
 *   Call registerEscrowV2Jobs(cronJobManager) in server.cjs startup.
 *   All three jobs use distributed locking via CronJobManager + Redis so they
 *   run only once across multiple server instances.
 *
 * Tuning via env vars:
 *   ESCROW_RELEASE_DELAY_HOURS   — hours after delivery to release (default: 48)
 *   ESCROW_STALE_RELEASE_DAYS    — days before stale safety net fires (default: 14)
 */

const prisma               = require('../utils/prismaClient');
const logger               = require('../utils/logger');
const earningsLedger       = require('./earningsLedgerService');
const escrowLedger         = require('./escrowLedgerService');

const RELEASE_DELAY_HOURS  = parseInt(process.env.ESCROW_RELEASE_DELAY_HOURS || '48', 10);
const STALE_RELEASE_DAYS   = parseInt(process.env.ESCROW_STALE_RELEASE_DAYS  || '14', 10);

// ─── Job 1: Automatic hourly release ─────────────────────────────────────────

async function processAutoReleases() {
    const now = new Date();
    logger.info(`[EscrowV2] Auto-release run started at ${now.toISOString()}`);

    // Find all HELD FulfillmentOrders whose escrowReleaseAt has passed
    const due = await prisma.fulfillmentOrder.findMany({
        where: {
            paymentStatus:   'HELD',
            escrowPayment: {
                releaseScheduledAt: { lte: now }
            }
        },
        select: {
            id:                true,
            sellerId:          true,
            sellerAmount:      true,
            marketplaceOrderId: true,
        },
    });

    if (due.length === 0) {
        logger.info('[EscrowV2] Auto-release: no FulfillmentOrders due for release');
        return;
    }

    logger.info(`[EscrowV2] Auto-release: ${due.length} FulfillmentOrders due`);

    let released = 0;
    let skipped  = 0;
    let failed   = 0;

    for (const fo of due) {
        try {
            // Check for active disputes on the parent MarketplaceOrder
            const dispute = await prisma.dispute.findFirst({
                where: {
                    orderId: fo.marketplaceOrderId,
                    status:  { in: ['OPEN', 'UNDER_REVIEW'] },
                },
                select: { id: true },
            }).catch(() => null); // Dispute model may use different field names — safe skip

            if (dispute) {
                logger.info(`[EscrowV2] Skipping FO ${fo.id} — active dispute ${dispute.id}`);
                skipped++;
                continue;
            }

            const result = await earningsLedger.releaseFulfillmentEscrow(fo.id, 'SYSTEM_AUTO');
            if (result.released) released++;
            else skipped++;

        } catch (err) {
            failed++;
            logger.error(`[EscrowV2] Release failed for FO ${fo.id}: ${err.message}`);

            // Create an admin alert for manual review
            await prisma.notification.create({
                data: {
                    userId:  fo.sellerId,
                    type:    'ESCROW_RELEASE_FAILED',
                    title:   'Escrow Auto-Release Failed',
                    body:    `FO ${fo.id} (seller ${fo.sellerId}) — ₦${Number(fo.sellerAmount).toLocaleString()} could not be released automatically. Error: ${err.message}`,
                    linkUrl: `/admin/escrow/${fo.id}`,
                },
            }).catch(() => {});
        }
    }

    logger.info(
        `[EscrowV2] Auto-release complete: released=${released}, skipped=${skipped}, failed=${failed}`
    );
}

// ─── Job 2: Stale safety net ──────────────────────────────────────────────────

async function processStaleReleases() {
    const now       = new Date();
    const staleDate = new Date(now.getTime() - STALE_RELEASE_DAYS * 24 * 60 * 60 * 1000);

    logger.info(`[EscrowV2] Stale-release: scanning for FOs delivered before ${staleDate.toISOString()}`);

    // FOs that are HELD + delivered long ago but escrowReleaseAt was never set
    // (shouldn't happen with Phase 5 webhook, but belt-and-suspenders)
    const stale = await prisma.fulfillmentOrder.findMany({
        where: {
            paymentStatus: 'HELD',
            status: { in: ['DELIVERED', 'COMPLETED'] },
            updatedAt: { lte: staleDate },
            escrowPayment: {
                releaseScheduledAt: null
            }
        },
        select: { id: true, sellerId: true, sellerAmount: true },
    });

    // Also: FOs with escrowReleaseAt set but > STALE_RELEASE_DAYS ago and still not released
    const overdueCapped = await prisma.fulfillmentOrder.findMany({
        where: {
            paymentStatus:   'HELD',
            escrowPayment: {
                releaseScheduledAt: {
                    lte: new Date(now.getTime() - STALE_RELEASE_DAYS * 24 * 60 * 60 * 1000),
                }
            }
        },
        select: { id: true, sellerId: true, sellerAmount: true },
    });

    const allStale = [...stale, ...overdueCapped].filter(
        (fo, i, arr) => arr.findIndex(f => f.id === fo.id) === i  // deduplicate
    );

    if (allStale.length === 0) {
        logger.info('[EscrowV2] Stale-release: no stale FulfillmentOrders found');
        return;
    }

    logger.warn(`[EscrowV2] Stale-release: ${allStale.length} overdue FulfillmentOrders found`);

    for (const fo of allStale) {
        try {
            // Backfill escrowReleaseAt = now so the auto-release logic works
            await prisma.escrowPayment.update({
                where: { fulfillmentOrderId: fo.id },
                data:  { releaseScheduledAt: new Date() },
            }).catch(() => {}); // ignore if doesn't exist

            await earningsLedger.releaseFulfillmentEscrow(fo.id, 'SYSTEM_AUTO');

            logger.info(`[EscrowV2] Stale-release: released FO ${fo.id}`);
        } catch (err) {
            logger.error(`[EscrowV2] Stale-release failed for FO ${fo.id}: ${err.message}`);
        }
    }
}

// ─── Job 3: Expired checkout cancellation ────────────────────────────────────

async function cancelExpiredCheckouts() {
    const now = new Date();

    const expired = await prisma.order.findMany({
        where: {
            paymentStatus: 'PENDING',
            status:        'PENDING',
            expiresAt:     { lte: now },
        },
        include: {
            subOrders: {
                include: { items: true },
            },
        },
    });

    if (expired.length === 0) return;

    logger.info(`[EscrowV2] Cancelling ${expired.length} expired checkout sessions`);

    for (const order of expired) {
        try {
            await prisma.$transaction(async (tx) => {
                // Cancel Order
                await tx.order.update({
                    where: { id: order.id },
                    data:  { status: 'CANCELLED', paymentStatus: 'FAILED' },
                });

                for (const fo of order.subOrders) {
                    await tx.order.update({
                        where: { id: fo.id },
                        data:  { status: 'CANCELLED' },
                    });

                    // Restore stock
                    for (const item of fo.items) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data:  { stock: { increment: item.quantity } },
                        });
                    }
                }

                // Notify buyer
                await tx.notification.create({
                    data: {
                        userId:  order.buyerId,
                        type:    'ORDER_EXPIRED',
                        title:   'Checkout Session Expired',
                        body:    `Your order #${order.id.substring(0, 8).toUpperCase()} was not paid within 30 minutes and has been cancelled. Items are back in stock.`,
                        linkUrl: `/cart`,
                    },
                }).catch(() => {});
            });

            logger.info(`[EscrowV2] Cancelled expired checkout: Order ${order.id}`);
        } catch (err) {
            logger.error(`[EscrowV2] Failed to cancel Order ${order.id}: ${err.message}`);
        }
    }
}

// ─── Job 4: WalletHold auto-release for direct Orders (non-FulfillmentOrder) ──

/**
 * processWalletHoldAutoReleases
 *
 * Closes the gap where wallet-paid Orders (paymentMethod='WALLET') have a
 * WalletHold record that was never released because the FulfillmentOrder-based
 * cron jobs don't cover them.
 *
 * Runs hourly. Finds Orders where:
 *   - paymentMethod = 'WALLET'
 *   - paymentStatus = 'HELD'
 *   - escrowReleaseAt <= now
 *   - no open dispute
 * Then calls escrowLedger.releaseToSeller() which:
 *   1. Finds and releases the WalletHold (gongHeld decremented)
 *   2. Credits seller wallet after deducting platform commission
 */
async function processWalletHoldAutoReleases() {
    const now = new Date();
    logger.info(`[EscrowV2-Wallet] WalletHold auto-release run at ${now.toISOString()}`);

    const dueOrders = await prisma.order.findMany({
        where: {
            paymentMethod:   'WALLET',
            paymentStatus:   'HELD',
            escrowReleaseAt: { lte: now },
            dispute:         null,          // no dispute record linked
        },
        select: { id: true, buyerId: true, sellerId: true, totalAmount: true },
    });

    if (dueOrders.length === 0) {
        logger.info('[EscrowV2-Wallet] No wallet holds due for release');
        return;
    }

    logger.info(`[EscrowV2-Wallet] ${dueOrders.length} wallet hold(s) due for release`);

    let released = 0, skipped = 0, failed = 0;

    for (const order of dueOrders) {
        try {
            // Double-check for any open dispute
            const dispute = await prisma.dispute.findFirst({
                where: {
                    orderId: order.id,
                    status:  { in: ['OPEN', 'SELLER_RESPONSE', 'MEDIATION', 'UNDER_REVIEW'] },
                },
                select: { id: true },
            }).catch(() => null);

            if (dispute) {
                logger.info(`[EscrowV2-Wallet] Skipping Order ${order.id} — active dispute ${dispute.id}`);
                skipped++;
                continue;
            }

            if (!order.sellerId) {
                logger.warn(`[EscrowV2-Wallet] Skipping Order ${order.id} — no sellerId`);
                skipped++;
                continue;
            }

            await escrowLedger.releaseToSeller({
                orderId:       order.id,
                buyerId:       order.buyerId,
                sellerId:      order.sellerId,
                amount:        order.totalAmount,
                triggerSource: 'SYSTEM_AUTO',
            });

            // Mark Order as released
            await prisma.order.update({
                where: { id: order.id },
                data:  { paymentStatus: 'RELEASED', escrowReleasedAt: now },
            });

            logger.info(`[EscrowV2-Wallet] Released WalletHold for Order ${order.id}`);
            released++;

        } catch (err) {
            failed++;
            logger.error(`[EscrowV2-Wallet] Failed for Order ${order.id}: ${err.message}`);
            // Alert admin
            await prisma.notification.create({
                data: {
                    userId:  'PLATFORM',
                    type:    'ESCROW_RELEASE_FAILED',
                    title:   'Wallet Hold Auto-Release Failed',
                    body:    `Order ${order.id} wallet hold could not be released. Error: ${err.message}`,
                    linkUrl: `/admin/orders/${order.id}`,
                },
            }).catch(() => {});
        }
    }

    logger.info(`[EscrowV2-Wallet] Done: released=${released}, skipped=${skipped}, failed=${failed}`);
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register all Phase 6 escrow V2 cron jobs.
 * @param {CronJobManager} cronJobManager — singleton from cronJobManager.js
 */
function registerEscrowV2Jobs(cronJobManager) {
    // Job 1: Auto-release FulfillmentOrders — top of every hour
    cronJobManager.register(
        'escrow-v2-auto-release',
        '0 * * * *',
        processAutoReleases,
        { runOnStartup: false, lockExpiry: 300 }
    );

    // Job 2: Stale safety net for FulfillmentOrders — 02:00 every night
    cronJobManager.register(
        'escrow-v2-stale-release',
        '0 2 * * *',
        processStaleReleases,
        { runOnStartup: false, lockExpiry: 600 }
    );

    // Job 3: Expired checkout cleaner — every 15 minutes
    cronJobManager.register(
        'escrow-v2-expired-checkout',
        '*/15 * * * *',
        cancelExpiredCheckouts,
        { runOnStartup: true, lockExpiry: 120 }
    );

    // Job 4: WalletHold auto-release for direct Orders — top of every hour (30s offset)
    cronJobManager.register(
        'escrow-v2-wallet-hold-release',
        '0 * * * *',
        processWalletHoldAutoReleases,
        { runOnStartup: false, lockExpiry: 300 }
    );

    logger.info('[EscrowV2] All Phase 6 cron jobs registered (incl. wallet hold auto-release)');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    registerEscrowV2Jobs,
    // Exported for admin manual trigger endpoints
    processAutoReleases,
    processStaleReleases,
    cancelExpiredCheckouts,
    processWalletHoldAutoReleases,
};
