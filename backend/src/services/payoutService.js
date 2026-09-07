const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');
const paystackService = require('./paystackService');

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
        await walletService.debit(userId, 'GONG', value, {
            idempotencyKey: `PAYOUT_REQUEST:${userId}:${Date.now()}`,
            direction: 'WITHDRAWAL',
            referenceType: 'PAYOUT',
            description: `Payout processed to ${accountNumber}`
        }, tx);

        let paystackResponse = null;
        if (bankCode && accountNumber) {
            try {
                const recipient = await paystackService.createTransferRecipient({
                    name: accountName || 'Seller',
                    accountNumber,
                    bankCode
                });
                paystackResponse = await paystackService.initiateTransfer(value, recipient.recipientCode, `Payout for user ${userId}`);
            } catch (err) {
                console.error("Paystack transfer failed", err);
                throw new Error("Failed to initiate transfer to bank account.");
            }
        }

        const payout = await tx.payout.create({
            data: {
                sellerId: userId,
                amount: value,
                currency: 'GONG',
                method: 'BANK_TRANSFER',
                status: 'COMPLETED',
                // store reference if needed
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
