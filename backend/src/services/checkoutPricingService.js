const prisma = require('../utils/prismaClient');
const walletService = require('./walletService');

async function calculateXpDiscount(userId, subtotal, requestedXp = 0) {
    const xpToUse = Math.max(0, Number(requestedXp || 0));
    if (!xpToUse) return { xpUsed: 0, discount: 0 };

    const wallet = await walletService.ensureWallet(userId);
    const availableXp = Number(wallet.xpAvailable || 0);
    const safeXp = Math.min(xpToUse, availableXp);

    // Conservative default: 100 XP = 1 GONG, capped at 20% of subtotal.
    const rawDiscount = safeXp / 100;
    const cap = Number(subtotal || 0) * 0.20;
    const discount = Math.min(rawDiscount, cap);
    return {
        xpUsed: Math.floor(discount * 100),
        discount: Math.round(discount * 100) / 100
    };
}

async function buildCheckoutSnapshot({ userId, items, region = 'US', isConsolidated = false, requestedXp = 0 }) {
    if (!items || items.length === 0) {
        const error = new Error('Cart is empty.');
        error.statusCode = 400;
        throw error;
    }

    let subtotal = 0;
    const orderItemsData = [];
    const sellerIds = new Set();

    for (const item of items) {
        const product = await prisma.product.findUnique({
            where: { id: String(item.productId) },
            include: { store: true }
        });

        if (!product) {
            const error = new Error(`Product ${item.productId} not found.`);
            error.statusCode = 404;
            throw error;
        }

        const quantity = Number(item.quantity || 1);
        const finalPrice = product.isFlashSale && product.flashPrice ? Number(product.flashPrice) : Number(product.price);
        subtotal += finalPrice * quantity;
        if (product.store?.sellerId) sellerIds.add(product.store.sellerId);
        orderItemsData.push({
            productId: product.id,
            quantity,
            priceAtTime: finalPrice
        });
    }

    // Dynamic Shipping Base Rate (configurable via env or API config)
    const dynamicBaseRate = parseFloat(process.env.SHIPPING_BASE_RATE || '12.50');
    const shippingCost = items.length > 0 ? Math.max(dynamicBaseRate, sellerIds.size * dynamicBaseRate * (isConsolidated ? 0.6 : 1)) : 0;
    const taxRate = String(region).toUpperCase() === 'NG' ? 0.075 : 0.08;
    const xpDiscount = await calculateXpDiscount(userId, subtotal, requestedXp);
    const taxableAmount = Math.max(0, subtotal + shippingCost - xpDiscount.discount);
    const taxAmount = taxableAmount * taxRate;
    const totalAmountUSD = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
        subtotal,
        shippingCost,
        taxAmount,
        discount: xpDiscount.discount,
        xpUsed: xpDiscount.xpUsed,
        totalAmountUSD,
        orderItemsData,
        sellerIds: [...sellerIds]
    };
}

module.exports = {
    calculateXpDiscount,
    buildCheckoutSnapshot
};
