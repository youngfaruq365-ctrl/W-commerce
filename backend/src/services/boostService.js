const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');

async function purchaseProductBoost(sellerId, productId, gxCost = 25, hours = 24) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { store: true }
    });
    if (!product || product.store?.sellerId !== sellerId) {
        const error = new Error('Product not found or not owned by seller');
        error.statusCode = 404;
        throw error;
    }

    const expiresAt = new Date(Date.now() + Number(hours || 24) * 60 * 60 * 1000);
    return prisma.$transaction(async (tx) => {
        await walletService.debit(sellerId, 'GX', gxCost, {
            idempotencyKey: `BOOST:${productId}:${sellerId}:${Date.now()}`,
            referenceType: 'PRODUCT',
            referenceId: productId,
            description: `Product boost for ${hours} hours`
        }, tx);

        return tx.product.update({
            where: { id: productId },
            data: {
                autoBoostExpiresAt: expiresAt,
                urgencyLevel: 'BOOSTED',
                isUrgencyBannerVisible: true
            }
        });
    });
}

module.exports = {
    purchaseProductBoost
};
