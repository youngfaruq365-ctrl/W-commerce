const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');
const sellerPlanService = require('./sellerPlanService');

async function holdBuyerFunds({ buyerId, orderId, amount, idempotencyKey, releaseAt = null }) {
    return walletService.createHold(buyerId, 'GONG', amount, {
        idempotencyKey,
        reason: 'ESCROW',
        referenceType: 'ORDER',
        referenceId: orderId,
        releaseAt,
        description: `Escrow hold for order ${orderId}`
    });
}

async function releaseToSeller({ holdId, orderId, buyerId, sellerId, amount, triggerSource = 'SYSTEM_AUTO' }) {
    const commissionRate = await sellerPlanService.getCommissionRate(sellerId, Number(process.env.PLATFORM_COMMISSION_RATE || 0.10));
    const commissionAmount = Math.round(Number(amount) * commissionRate * 100) / 100;
    const sellerAmount = Math.round((Number(amount) - commissionAmount) * 100) / 100;

    return prisma.$transaction(async (tx) => {
        let hold = null;
        if (holdId) {
            hold = await walletService.releaseHold(holdId, {
                referenceType: 'ORDER',
                referenceId: orderId,
                description: `Escrow released by ${triggerSource}`
            }, tx);
        } else if (buyerId) {
            hold = await tx.walletHold.findFirst({
                where: { userId: buyerId, referenceType: 'ORDER', referenceId: orderId, status: { in: ['HELD', 'DISPUTED'] } }
            });
            if (hold) {
                await walletService.releaseHold(hold.id, {
                    referenceType: 'ORDER',
                    referenceId: orderId,
                    description: `Escrow released by ${triggerSource}`
                }, tx);
            }
        }

        await walletService.credit(sellerId, 'GONG', sellerAmount, {
            idempotencyKey: `ESCROW_RELEASE:${orderId}:${sellerId}`,
            referenceType: 'ORDER',
            referenceId: orderId,
            description: `Seller proceeds after ${commissionRate * 100}% platform fee`
        }, tx);

        await tx.transaction.create({
            data: {
                userId: sellerId,
                type: 'ESCROW_RELEASE',
                amount: sellerAmount,
                currency: 'GONG',
                status: 'COMPLETED',
                referenceId: orderId,
                description: `Escrow released (${triggerSource}). Commission: ${commissionAmount} GONG`
            }
        });

        return { hold, sellerAmount, commissionAmount, commissionRate };
    });
}

async function refundBuyer({ holdId, orderId, buyerId }) {
    const hold = holdId
        ? await prisma.walletHold.findUnique({ where: { id: holdId } })
        : await prisma.walletHold.findFirst({ where: { userId: buyerId, referenceType: 'ORDER', referenceId: orderId, status: { in: ['HELD', 'DISPUTED'] } } });
    if (!hold) throw new Error('Escrow hold not found');
    return walletService.refundHold(hold.id, {
        referenceType: 'ORDER',
        referenceId: orderId,
        description: `Escrow refund for order ${orderId}`
    });
}

async function disputeHold(orderId) {
    return prisma.walletHold.updateMany({
        where: { referenceType: 'ORDER', referenceId: orderId, status: 'HELD' },
        data: { status: 'DISPUTED' }
    });
}

module.exports = {
    holdBuyerFunds,
    releaseToSeller,
    refundBuyer,
    disputeHold
};
