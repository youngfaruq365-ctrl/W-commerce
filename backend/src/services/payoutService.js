const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');

async function requestPayout(userId, amount, destination = 'BANK_TRANSFER', bankCode, accountNumber, accountName) {
    const value = walletService.normalizeAmount(amount);
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { store: true } });
    if (!user) throw new Error('User not found');
    if (!user.store || !user.store.isVerified) {
        const error = new Error('Your store must be KYB verified before requesting payouts.');
        error.statusCode = 403;
        throw error;
    }

    return prisma.$transaction(async (tx) => {
        // Save bank details to store if provided, so admin can process it later
        if (bankCode && accountNumber) {
            await tx.store.update({
                where: { id: user.store.id },
                data: { bankCode, accountNumber, accountName: accountName || user.fullName }
            });
        }

        await walletService.debit(userId, 'GONG', value, {
            idempotencyKey: `PAYOUT_REQUEST:${userId}:${Date.now()}`,
            direction: 'WITHDRAWAL',
            referenceType: 'PAYOUT',
            description: `Payout requested to ${accountNumber || user.store.accountNumber || 'bank'}`
        }, tx);

        const payout = await tx.payout.create({
            data: {
                sellerId: userId,
                amount: value,
                currency: 'GONG',
                method: 'BANK_TRANSFER',
                status: 'PENDING',
            }
        });

        await tx.notification.create({
            data: {
                userId,
                title: 'Payout Requested',
                body: `Your payout request for ${value.toFixed(2)} GONG is pending admin review.`,
                type: 'INFO'
            }
        });

        return payout;
    });
}

module.exports = {
    requestPayout
};
