/**
 * GlobalX Cron Service
 * Handles automated background jobs:
 * - Escrow release after delivery
 * - Verification reminder emails
 * - Pool expiration checks
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const emailService = require('./emailService');
const flashDealService = require('./flashDealService');
const notificationScheduler = require('./notificationScheduler');
const packingWorkflowService = require('./packingWorkflowService');
const notificationEngine = require('../notifications/marketplaceNotificationEngine');

 const prisma = require('../utils/prismaClient');
 const trackingService = require('./trackingService');
 const inventoryService = require('./inventoryService');
 const reviewService = require('./reviewService');
 const sellerAnalyticsService = require('./sellerAnalyticsService');
 const disputeService = require('./disputeService');
 const wishlistService = require('./wishlistService');
 const cancelExpiredOrders = require('../cron/cancelExpiredOrders');

 // ... existing code for escrow, verification, pools, etc. remains above ...

 /**
  * Detects orders that are experiencing delivery delays and notifies buyers
  * Runs hourly
  */
 const checkDeliveryDelays = async () => {
     try {
         await trackingService.detectDelays();
     } catch (err) {
         logger.error('[CRON] Delivery delay error:', err.message);
     }
 };

 /**
  * Process wishlist alerts (price drops and back-in-stock notifications)
  * Runs every 2 hours
  */
 const processWishlistAlerts = async () => {
     try {
         await wishlistService.checkWishlistAlerts();
     } catch (err) {
         logger.error('[CRON] Wishlist alerts error:', err.message);
     }
 };

 /**
  * Generate seller performance insights and update scores
  * Runs daily
  */
 const generateSellerInsights = async () => {
     try {
         const sellers = await prisma.user.findMany({
             where: { role: 'SELLER' },
             select: { id: true }
         });
         for (const seller of sellers) {
             await sellerAnalyticsService.generateInsights(seller.id);
             await sellerAnalyticsService.updatePerformanceScore(seller.id);
         }
         logger.info(`[CRON] Generated insights for ${sellers.length} sellers`);
     } catch (err) {
         logger.error('[CRON] Insight generation error:', err.message);
     }
 };

 /**
  * Auto-escalate disputes where seller did not respond within 48h
  * Runs every 30 minutes
  */
 const autoEscalateDisputes = async () => {
     try {
         await disputeService.autoEscalate();
     } catch (err) {
         logger.error('[CRON] Dispute escalation error:', err.message);
     }
 };

 /**
  * Start all cron jobs
  */
 const startCronJobsLegacy = () => {
     if (process.env.ENABLE_CRON_JOBS === 'false') {
         logger.info('⏸️ Cron jobs disabled via ENABLE_CRON_JOBS=false');
         return;
     }

     // Existing jobs...
     setInterval(checkEscrowStatus, 5 * 60 * 1000);
     setInterval(sendVerificationReminders, 6 * 60 * 60 * 1000);
     setInterval(checkPoolExpirations, 5 * 60 * 1000);
     setInterval(cleanupUnverifiedAccounts, 24 * 60 * 60 * 1000);
     setInterval(updateExchangeRates, 6 * 60 * 60 * 1000);
     setInterval(manageFlashDeals, 5 * 60 * 1000);
     setInterval(notifyExpiringFlashDeals, 60 * 60 * 1000);
     setInterval(resetFlashDealViewerCounts, 24 * 60 * 60 * 1000);
     setInterval(() => notificationScheduler.runAllChecks(), 15 * 60 * 60 * 1000);

     // New Feature 6-11 jobs
     setInterval(checkDeliveryDelays, 60 * 60 * 1000); // Hourly
     setInterval(processWishlistAlerts, 2 * 60 * 60 * 1000); // Every 2 hours
     setInterval(generateSellerInsights, 24 * 60 * 60 * 1000); // Daily at midnight (approx)
     setInterval(autoEscalateDisputes, 30 * 60 * 1000); // Every 30 min

     logger.info('⏰ Cron Jobs Started:');
     logger.info('   - Escrow Release Check (every 5 min)');
     logger.info('   - Verification Reminders (every 6 hours)');
     logger.info('   - Pool Expiration Check (every 5 min)');
     logger.info('   - Account Cleanup (daily)');
     logger.info('   - Exchange Rate Refresh (every 6 hours)');
     logger.info('   - Flash Deal Management (every 5 min)');
     logger.info('   - Flash Deal Notifications (every hour)');
     logger.info('   - Flash Deal Viewer Reset (daily)');
     logger.info('   - Notification Scheduler (every 15 min)');
     logger.info('   - Delivery Delay Detection (hourly)');
     logger.info('   - Wishlist Alerts (every 2 hours)');
     logger.info('   - Seller Insights Generation (daily)');
     logger.info('   - Dispute Auto-Escalation (every 30 min)');

     // Run verification reminders once on startup (delayed 30s)
     setTimeout(() => {
         sendVerificationReminders().catch(console.error);
         updateExchangeRates().catch(console.error);
     }, 30000);
 };

/**
 * Release eligible escrow orders whose scheduled release time has passed.
 * Runs every 5 minutes.
 */
const checkEscrowStatus = async () => {
    try {
        const { processEscrowRelease, processFulfillmentEscrowRelease } = require('../controllers/paymentController');
        const dueOrders = await prisma.order.findMany({
            where: {
                status: { in: ['DELIVERED', 'COMPLETED'] },
                paymentStatus: 'HELD',
                escrowReleaseAt: { lte: new Date() },
                escrowReleasedAt: null,
                dispute: null
            },
            select: { id: true }
        });

        for (const order of dueOrders) {
            await processEscrowRelease(order.id, 'SYSTEM_AUTO');
        }

        const dueFulfillmentOrders = await prisma.fulfillmentOrder.findMany({
            where: {
                status: { in: ['DELIVERED', 'COMPLETED'] },
                paymentStatus: 'HELD',
                escrowReleaseAt: { lte: new Date() }
            },
            select: { id: true }
        });

        for (const fo of dueFulfillmentOrders) {
            await processFulfillmentEscrowRelease(fo.id, 'SYSTEM_AUTO');
        }

        const totalProcessed = dueOrders.length + dueFulfillmentOrders.length;
        if (totalProcessed > 0) {
            logger.info(`[CRON] Processed ${totalProcessed} escrow release(s)`);
        }
    } catch (err) {
        logger.error('[CRON] Escrow status check error:', err.message);
    }
};

/**
 * Send verification reminder emails
 * Runs every 6 hours, reminds users who signed up 12-18h ago
 */
const sendVerificationReminders = async () => {
    try {
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const eighteenHoursAgo = new Date(now.getTime() - 18 * 60 * 60 * 1000);

        const unverifiedUsers = await prisma.user.findMany({
            where: {
                isVerified: false,
                createdAt: {
                    gte: eighteenHoursAgo,
                    lte: twelveHoursAgo
                }
            },
            select: { id: true, email: true, createdAt: true }
        });

        if (unverifiedUsers.length === 0) {
            return;
        }

        logger.info(`[CRON] Found ${unverifiedUsers.length} users needing verification reminders`);

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('[CRON] JWT_SECRET not set, cannot send verification reminders');
            return;
        }

        for (const user of unverifiedUsers) {
            try {
                const verificationToken = jwt.sign(
                    { id: user.id, type: 'email_verification' },
                    jwtSecret,
                    { expiresIn: '12h' }
                );
                const port = process.env.PORT || 3000;
                const verifyLink = `http://localhost:${port}/api/auth/verify?token=${verificationToken}`;

                await emailService.sendVerificationReminder(user.email, {
                    verifyLink,
                    hoursSinceSignup: Math.round((now.getTime() - new Date(user.createdAt).getTime()) / (60 * 60 * 1000))
                });
            } catch (innerErr) {
                logger.error('[CRON] Failed to send verification reminder for user', user.id, innerErr.message);
            }
        }
    } catch (err) {
        logger.error('[CRON] Verification reminder error:', err.message);
    }
};

/**
 * Detect abandoned pending payments and remind buyers.
 * Runs hourly for orders pending 24h+ (up to 72h).
 */
const remindAbandonedPayments = async () => {
    try {
        const now = Date.now();
        const minAge = new Date(now - 24 * 60 * 60 * 1000);
        const maxAge = new Date(now - 72 * 60 * 60 * 1000);
        const staleOrders = await prisma.order.findMany({
            where: {
                status: 'PENDING',
                paymentStatus: 'PENDING',
                createdAt: {
                    lte: minAge,
                    gte: maxAge
                }
            },
            select: {
                id: true,
                buyerId: true,
                totalAmount: true
            },
            take: 200
        });

        for (const order of staleOrders) {
            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    title: '🛒 Payment Pending',
                    body: `Your order #${order.id.substring(0, 8)} is waiting for payment. Complete checkout to avoid cancellation.`,
                    type: 'ORDER',
                    linkUrl: `cart.html?retryOrder=${order.id}`
                }
            });
        }

        if (staleOrders.length > 0) {
            logger.info(`[CRON] Sent ${staleOrders.length} abandoned payment reminders`);
        }
    } catch (err) {
        logger.error('[CRON] Abandoned payment reminder error:', err.message);
    }
};

/**
 * Check for expired pools and update their status
 * Runs every 5 minutes
 */
const checkPoolExpirations = async () => {
    try {
        const now = new Date();

        const expiredPools = await prisma.pool.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: now }
            },
            include: {
                participants: { include: { user: true } },
                product: true
            }
        });

        for (const pool of expiredPools) {
            const newStatus = pool.currentSize >= pool.targetSize ? 'FILLED' : 'EXPIRED';

            await prisma.pool.update({
                where: { id: pool.id },
                data: { status: newStatus }
            });

            logger.info(`[CRON] Pool ${pool.id} marked as ${newStatus}`);

            // Notify participants
            for (const participant of pool.participants) {
                await prisma.notification.create({
                    data: {
                        userId: participant.userId,
                        title: newStatus === 'FILLED' ? '🎉 Pool Completed!' : '⏰ Pool Expired',
                        body: newStatus === 'FILLED'
                            ? `Great news! The pool for "${pool.product.title}" has reached its target.`
                            : `The pool for "${pool.product.title}" has expired without reaching the target.`,
                        type: 'POOL',
                        linkUrl: '/buyer-dashboard.html?tab=pools'
                    }
                });
            }
        }
    } catch (err) {
        logger.error('[CRON] Pool expiration check error:', err.message);
    }
};

/**
 * Update Exchange Rates from external API
 * Runs every 6 hours
 */
const updateExchangeRates = async () => {
    try {
        const exchangeRates = require('../utils/exchangeRates');
        const latest = await exchangeRates.fetchLatestRates();
        if (latest) {
            logger.info(`[CRON] Exchange rates refreshed successfully`);
        }
    } catch (err) {
        logger.error('[CRON] Exchange rate update error:', err.message);
    }
};

/**
 * Clean up old unverified accounts (30+ days old)
 * Runs once daily
 */
const cleanupUnverifiedAccounts = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await prisma.user.deleteMany({
            where: {
                isVerified: false,
                createdAt: { lt: thirtyDaysAgo },
                orders: { none: {} } // Only delete if no orders
            }
        });

        if (result.count > 0) {
            logger.info(`[CRON] Cleaned up ${result.count} old unverified accounts`);
        }
    } catch (err) {
        logger.error('[CRON] Account cleanup error:', err.message);
    }
};

/**
 * Manage flash deals - activate/deactivate automatically
 * Runs every 5 minutes
 */
const manageFlashDeals = async () => {
    try {
        const activated = await flashDealService.activateExpiredDeals();
        const deactivated = await flashDealService.deactivateExpiredDeals();

        if (activated > 0 || deactivated > 0) {
            logger.info(`[CRON] Flash Deals: +${activated} activated, -${deactivated} deactivated`);
        }
    } catch (err) {
        logger.error('[CRON] Flash deal management error:', err.message);
    }
};

/**
 * Send notifications for expiring flash deals
 * Runs every hour
 */
const notifyExpiringFlashDeals = async () => {
    try {
        const notified = await flashDealService.notifyExpiringDeals();
        if (notified > 0) {
            logger.info(`[CRON] Sent ${notified} flash deal expiration notifications`);
        }
    } catch (err) {
        logger.error('[CRON] Flash deal notification error:', err.message);
    }
};

/**
 * Reset flash deal viewer counts daily
 * Runs once daily
 */
const resetFlashDealViewerCounts = async () => {
    try {
        await flashDealService.resetViewerCounts();
        logger.info('[CRON] Reset flash deal viewer counts');
    } catch (err) {
        logger.error('[CRON] Reset viewer counts error:', err.message);
    }
};

/**
 * Escalate unattended packing issues after 24 hours.
 * Runs every 15 minutes.
 */
const checkPackingEscalations = async () => {
    try {
        const escalatedIssues = await packingWorkflowService.escalateExpiredIssues();
        for (const issue of escalatedIssues) {
            await notificationEngine.notifyPackingEscalation({
                buyerId: issue.buyerId,
                sellerId: issue.sellerId,
                orderId: issue.orderId
            });
        }

        if (escalatedIssues.length > 0) {
            logger.info(`[CRON] Escalated ${escalatedIssues.length} packing issue(s)`);
        }
    } catch (err) {
        logger.error('[CRON] Packing escalation error:', err.message);
    }
};

/**
 * Process nightly payouts
 * Runs daily at midnight
 */
const processNightlyPayouts = async () => {
    try {
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
                paymentStatus: 'HELD'
            }
        });
        if (pendingOrders.length > 0) {
            await prisma.order.updateMany({
                where: { id: { in: pendingOrders.map(o => o.id) } },
                data: { paymentStatus: 'RELEASED' }
            });
            logger.info(`[CRON] Processed ${pendingOrders.length} nightly payouts`);
        }
    } catch (err) {
        logger.error('[CRON] Nightly payout error:', err.message);
    }
};

/**
 * Expire old sessions
 * Runs daily
 */
const expireOldSessions = async () => {
    try {
        const result = await prisma.session.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        });
        if (result.count > 0) {
            logger.info(`[CRON] Expired ${result.count} old sessions`);
        }
    } catch (err) {
        logger.error('[CRON] Session expiration error:', err.message);
    }
};

/**
 * Handle cart abandonment
 * Runs hourly
 */
const handleCartAbandonment = async () => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        
        const abandonedCarts = await prisma.cart.findMany({
            where: {
                updatedAt: { lt: twentyFourHoursAgo, gt: fortyEightHoursAgo }
            },
            include: { user: true }
        });

        for (const cart of abandonedCarts) {
            if (cart.user) {
                await prisma.notification.create({
                    data: {
                        userId: cart.userId || cart.user.id,
                        title: '🛒 You left something behind!',
                        body: 'Complete your purchase before items sell out.',
                        type: 'SYSTEM',
                        linkUrl: '/cart.html'
                    }
                });
            }
        }
        if (abandonedCarts.length > 0) {
            logger.info(`[CRON] Handled ${abandonedCarts.length} abandoned carts`);
        }
    } catch (err) {
        logger.error('[CRON] Cart abandonment error:', err.message);
    }
};

/**
 * Start all cron jobs with singleton pattern (prevents duplicate execution)
 * Uses cronJobManager for distributed locking
 */
const startCronJobs = (cronJobManager = null) => {
    if (process.env.ENABLE_CRON_JOBS === 'false') {
        logger.info('⏸️ Cron jobs disabled via ENABLE_CRON_JOBS=false');
        return;
    }

    // If cronJobManager is provided, use it for distributed locking
    if (cronJobManager) {
        logger.info('Using singleton cron job manager with distributed locking...');
        cronJobManager.register('escrow-status', '*/5 * * * *', checkEscrowStatus);
        cronJobManager.register('verification-reminders', '0 */6 * * *', sendVerificationReminders);
        cronJobManager.register('pool-expiration', '*/5 * * * *', checkPoolExpirations);
        cronJobManager.register('cleanup-accounts', '0 0 * * *', cleanupUnverifiedAccounts);
        cronJobManager.register('update-exchange-rates', '0 */6 * * *', updateExchangeRates);
        cronJobManager.register('manage-flash-deals', '*/5 * * * *', manageFlashDeals);
        cronJobManager.register('notify-flash-deals', '0 * * * *', notifyExpiringFlashDeals);
        cronJobManager.register('reset-flash-viewers', '0 0 * * *', resetFlashDealViewerCounts);
        cronJobManager.register('notification-scheduler', '*/15 * * * *', () => notificationScheduler.runAllChecks());
        cronJobManager.register('packing-escalations', '*/15 * * * *', checkPackingEscalations);
        cronJobManager.register('delivery-delays', '0 * * * *', checkDeliveryDelays);
        cronJobManager.register('wishlist-alerts', '0 */2 * * *', processWishlistAlerts);
        cronJobManager.register('seller-insights', '0 0 * * *', generateSellerInsights);
        cronJobManager.register('dispute-escalation', '*/30 * * * *', autoEscalateDisputes);
        cronJobManager.register('payment-reminders', '0 * * * *', remindAbandonedPayments);
        cronJobManager.register('cancel-expired-orders', '*/5 * * * *', cancelExpiredOrders);
        cronJobManager.register('nightly-payouts', '0 0 * * *', processNightlyPayouts);
        cronJobManager.register('expire-sessions', '0 0 * * *', expireOldSessions);
        cronJobManager.register('cart-abandonment', '0 * * * *', handleCartAbandonment);
        logger.info('✅ All cron jobs registered with distributed locking');
    } else {
        logger.warn('⚠️ Using legacy setInterval-based cron jobs (not recommended for production)');
        setInterval(checkEscrowStatus, 5 * 60 * 1000);
        setInterval(sendVerificationReminders, 6 * 60 * 60 * 1000);
        setInterval(checkPoolExpirations, 5 * 60 * 1000);
        setInterval(cleanupUnverifiedAccounts, 24 * 60 * 60 * 1000);
        setInterval(updateExchangeRates, 6 * 60 * 60 * 1000);
        setInterval(manageFlashDeals, 5 * 60 * 1000);
        setInterval(notifyExpiringFlashDeals, 60 * 60 * 1000);
        setInterval(resetFlashDealViewerCounts, 24 * 60 * 60 * 1000);
        setInterval(() => notificationScheduler.runAllChecks(), 15 * 60 * 1000);
        setInterval(checkPackingEscalations, 15 * 60 * 1000);
        setInterval(checkDeliveryDelays, 60 * 60 * 1000);
        setInterval(processWishlistAlerts, 2 * 60 * 60 * 1000);
        setInterval(generateSellerInsights, 24 * 60 * 60 * 1000);
        setInterval(autoEscalateDisputes, 30 * 60 * 1000);
        setInterval(remindAbandonedPayments, 60 * 60 * 1000);
        setInterval(cancelExpiredOrders, 5 * 60 * 1000);
        setInterval(processNightlyPayouts, 24 * 60 * 60 * 1000);
        setInterval(expireOldSessions, 24 * 60 * 60 * 1000);
        setInterval(handleCartAbandonment, 60 * 60 * 1000);
    }

    // Run verification reminders once on startup (delayed 30s)
    setTimeout(() => {
        sendVerificationReminders().catch(console.error);
        updateExchangeRates().catch(console.error);
    }, 30000);
};

module.exports = {
    startCronJobs,
    checkEscrowStatus,
    sendVerificationReminders,
    checkPoolExpirations,
    cleanupUnverifiedAccounts,
    updateExchangeRates,
    manageFlashDeals,
    notifyExpiringFlashDeals,
    resetFlashDealViewerCounts,
    checkPackingEscalations,
    remindAbandonedPayments,
    notificationScheduler,
    processNightlyPayouts,
    expireOldSessions,
    handleCartAbandonment
};
