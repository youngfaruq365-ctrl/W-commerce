const prisma = require('../utils/prismaClient');

exports.getCommissionRate = async (sellerId, defaultRate) => {
    try {
        const store = await prisma.store.findFirst({ where: { sellerId } });
        const tier = store ? (store.sellerTier || 'NONE') : 'NONE';
        
        if (tier === 'DIAMOND') return 0.00;
        if (tier === 'PLATINUM') return 0.02;
        if (tier === 'GOLD') return 0.05;
        
        return defaultRate !== undefined ? defaultRate : 0.10;
    } catch (e) {
        return defaultRate !== undefined ? defaultRate : 0.10;
    }
};

exports.getSellerPlan = async (sellerId) => {
    try {
        const store = await prisma.store.findFirst({ where: { sellerId } });
        if (store && store.sellerTier) {
            return { name: store.sellerTier, tier: store.sellerTier };
        }
        return { name: 'Free', tier: 'NONE' };
    } catch (e) {
        return { name: 'Free', tier: 'NONE' };
    }
};
