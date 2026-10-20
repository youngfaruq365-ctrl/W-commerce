const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const cronJobManager = require('../services/cronJobManager');
const sellerBanningService = require('../services/sellerBanningService');

const checkBanningRates = async () => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Unpacked for 24hr (+10%)
        // Status is PAID (ready to pack), but it's been 24h since creation
        const unpackViolations = await prisma.order.findMany({
            where: {
                status: 'PAID',
                createdAt: { lt: twentyFourHoursAgo },
                unpackPenaltyApplied: false,
                sellerId: { not: null }
            },
            include: { seller: { include: { store: true } } }
        });

        for (const order of unpackViolations) {
            if (order.seller && order.seller.store) {
                const store = order.seller.store;
                
                await sellerBanningService.applyPenalty({
                    storeId: store.id,
                    sellerId: order.sellerId,
                    causeCode: 'UNPACKED_ORDER_24H',
                    orderId: order.id,
                    orderNumber: order.id.slice(0, 8).toUpperCase(),
                    reason: `Order #${order.id.slice(0, 8)} remained unpacked for over 24 hours.`
                });

                await prisma.order.update({
                    where: { id: order.id },
                    data: { unpackPenaltyApplied: true }
                });
            }
        }

        // 2. Packed but unshipped for 24hr (+5%)
        // Status is PACKED, but it's been 24h since packedAt
        const unshipViolations = await prisma.order.findMany({
            where: {
                status: 'PACKED',
                packedAt: { lt: twentyFourHoursAgo },
                unshipPenaltyApplied: false,
                sellerId: { not: null }
            },
            include: { seller: { include: { store: true } } }
        });

        for (const order of unshipViolations) {
            if (order.seller && order.seller.store) {
                const store = order.seller.store;

                await sellerBanningService.applyPenalty({
                    storeId: store.id,
                    sellerId: order.sellerId,
                    causeCode: 'UNSHIPPED_ORDER_24H',
                    orderId: order.id,
                    orderNumber: order.id.slice(0, 8).toUpperCase(),
                    reason: `Order #${order.id.slice(0, 8)} was packed but remained unshipped for over 24 hours.`
                });

                await prisma.order.update({
                    where: { id: order.id },
                    data: { unshipPenaltyApplied: true }
                });
            }
        }

    } catch (error) {
        logger.error(`Error in sellerBanningCron: ${error.message}`);
    }
};

const initBanningCron = () => {
    // Run every hour
    cronJobManager.register('sellerBanningSystem', '0 * * * *', checkBanningRates, { runOnStartup: true });
};

module.exports = {
    initBanningCron,
    checkBanningRates
};
