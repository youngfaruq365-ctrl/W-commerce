const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');

const DEFAULT_RATES = {
    'GONG:GX': 10,
    'GX:GONG': 0.08,
    'XP:GX': 0.01
};

function pair(fromCoin, toCoin) {
    return `${walletService.normalizeCoin(fromCoin)}:${walletService.normalizeCoin(toCoin)}`;
}

async function getRate(fromCoin, toCoin) {
    const from = walletService.normalizeCoin(fromCoin);
    const to = walletService.normalizeCoin(toCoin);
    const configured = await prisma.coinConversionRate.findUnique({
        where: { fromCoin_toCoin: { fromCoin: from, toCoin: to } }
    });
    if (configured && configured.isActive) return Number(configured.rate);
    return DEFAULT_RATES[pair(from, to)] || null;
}

async function convertForUser(userId, fromCoin, toCoin, amount, options = {}) {
    const rate = await getRate(fromCoin, toCoin);
    if (!rate) throw new Error(`Conversion is not enabled for ${fromCoin} to ${toCoin}`);
    return walletService.convert(userId, fromCoin, toCoin, amount, rate, options);
}

async function upsertRate({ fromCoin, toCoin, rate, minAmount = 0, maxAmount = null, isActive = true, updatedById = null }) {
    const from = walletService.normalizeCoin(fromCoin);
    const to = walletService.normalizeCoin(toCoin);
    if (from === to) throw new Error('Conversion coins must be different');
    return prisma.coinConversionRate.upsert({
        where: { fromCoin_toCoin: { fromCoin: from, toCoin: to } },
        update: { rate, minAmount, maxAmount, isActive, updatedById },
        create: { fromCoin: from, toCoin: to, rate, minAmount, maxAmount, isActive, updatedById }
    });
}

module.exports = {
    getRate,
    convertForUser,
    upsertRate
};
