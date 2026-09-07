const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');

const DEFAULT_XP = {
    PURCHASE: 25,
    REVIEW: 15,
    REFERRAL: 500,
    DAILY_LOGIN: 5,
    WISHLIST: 3,
    PROFILE_COMPLETE: 100,
    SELLER_RESPONSE: 10,
    REPEAT_PURCHASE: 40
};

async function getRule(eventType) {
    const normalized = String(eventType || '').toUpperCase();
    const rule = await prisma.rewardRule.findUnique({ where: { eventType: normalized } });
    if (rule && rule.isActive) return rule;
    return {
        id: null,
        eventType: normalized,
        xpAmount: DEFAULT_XP[normalized] || 0,
        gxAmount: 0
    };
}

async function grantReward(userId, eventType, eventKey, options = {}) {
    const normalizedType = String(eventType || '').toUpperCase();
    if (!eventKey) throw new Error('Reward event key is required');

    const existing = await prisma.rewardGrant.findUnique({ where: { eventKey } });
    if (existing) return { duplicate: true, grant: existing };

    const rule = await getRule(normalizedType);
    const xpAmount = Number(options.xpAmount ?? rule.xpAmount ?? 0);
    const gxAmount = Number(options.gxAmount ?? rule.gxAmount ?? 0);

    return prisma.$transaction(async (tx) => {
        const grant = await tx.rewardGrant.create({
            data: {
                userId,
                ruleId: rule.id || null,
                eventType: normalizedType,
                eventKey,
                xpAmount,
                gxAmount,
                referenceType: options.referenceType || null,
                referenceId: options.referenceId || null,
                metadata: options.metadata ? JSON.stringify(options.metadata) : null
            }
        });

        if (xpAmount > 0) {
            await walletService.credit(userId, 'XP', xpAmount, {
                idempotencyKey: `REWARD:${eventKey}:XP`,
                referenceType: 'REWARD',
                referenceId: grant.id,
                description: `${normalizedType} XP reward`
            }, tx);
        }

        if (gxAmount > 0) {
            await walletService.credit(userId, 'GX', gxAmount, {
                idempotencyKey: `REWARD:${eventKey}:GX`,
                referenceType: 'REWARD',
                referenceId: grant.id,
                description: `${normalizedType} GX reward`
            }, tx);
        }

        return { duplicate: false, grant };
    });
}

async function listRewards(userId, limit = 50) {
    return prisma.rewardGrant.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit || 50), 100)
    });
}

async function upsertRule(data) {
    const eventType = String(data.eventType || '').toUpperCase();
    if (!eventType) throw new Error('eventType is required');
    return prisma.rewardRule.upsert({
        where: { eventType },
        update: {
            xpAmount: data.xpAmount,
            gxAmount: data.gxAmount || 0,
            discountAmount: data.discountAmount || 0,
            cooldownHours: data.cooldownHours || 0,
            isActive: data.isActive !== false,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null
        },
        create: {
            eventType,
            xpAmount: data.xpAmount,
            gxAmount: data.gxAmount || 0,
            discountAmount: data.discountAmount || 0,
            cooldownHours: data.cooldownHours || 0,
            isActive: data.isActive !== false,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
    });
}

module.exports = {
    grantReward,
    listRewards,
    upsertRule,
    getRule
};
