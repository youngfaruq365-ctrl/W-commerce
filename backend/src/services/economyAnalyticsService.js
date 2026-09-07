const prisma = require('../utils/prismaClient');

async function getEconomyOverview() {
    const [gong, gx, xp, held, pendingPayouts, rewardCount] = await Promise.all([
        prisma.wallet.aggregate({ _sum: { gongAvailable: true } }),
        prisma.wallet.aggregate({ _sum: { gxAvailable: true } }),
        prisma.wallet.aggregate({ _sum: { xpAvailable: true } }),
        prisma.wallet.aggregate({ _sum: { gongHeld: true } }),
        prisma.payout.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
        prisma.rewardGrant.count()
    ]);

    return {
        gongAvailable: Number(gong._sum.gongAvailable || 0),
        gxAvailable: Number(gx._sum.gxAvailable || 0),
        xpAvailable: Number(xp._sum.xpAvailable || 0),
        gongHeld: Number(held._sum.gongHeld || 0),
        pendingPayouts: Number(pendingPayouts._sum.amount || 0),
        rewardGrants: rewardCount
    };
}

module.exports = {
    getEconomyOverview
};
