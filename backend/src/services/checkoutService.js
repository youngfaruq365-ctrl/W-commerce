const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * Validates cart, applies promos, calculates taxes, decrements stock, and creates Parent/Child orders.
 */
exports.processCheckout = async ({
    userId,
    items,
    shippingAddress,
    isConsolidated,
    region = 'US',
    promoCodeStr,
    paymentMethod,
    initialStatus = 'PENDING',
    idempotencyKey,
    dryRun = false
}) => {
    if (!items || items.length === 0) {
        throw new Error('Cart is empty.');
    }

    if (idempotencyKey) {
        const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey } });
        if (existingOrder) {
            return { parentOrder: existingOrder, totalAmountUSD: Number(existingOrder.totalAmount), isExistingOrder: true };
        }
    }

    // 1. Backend Price & Stock Validation
    let subtotal = 0;
    const orderItemsData = [];
    const productsToUpdate = [];
    const sellerIds = new Set();
    const sellerSubtotals = {};
    const sellerItems = {};

    for (const item of items) {
        const product = await prisma.product.findUnique({
            where: { id: String(item.productId || item.id) },
            include: { store: true }
        });

        if (!product) {
            throw new Error(`Product ${item.productId || item.id} not found.`);
        }

        const qty = Math.max(1, Math.floor(Number(item.quantity || item.qty || 1)));
        // BUG-ORDER-06: Was missing floor/positive guard — qty: -1 would increment stock
        // and produce a negative subtotal, reducing the buyer's total cost
        if (!Number.isFinite(qty) || qty < 1) {
            throw new Error(`Invalid quantity for product ${product.title}`);
        }
        if (product.stock < qty) {
            throw new Error(`Insufficient stock for ${product.title}`);
        }

        let finalPrice = Number(product.price);
        if (product.isFlashSale && product.flashPrice) {
            finalPrice = Number(product.flashPrice);
        }

        const itemTotal = finalPrice * qty;
        subtotal += itemTotal;
        
        const sellerId = product.store?.sellerId || 'default';
        sellerIds.add(sellerId);
        
        if (!sellerSubtotals[sellerId]) sellerSubtotals[sellerId] = 0;
        sellerSubtotals[sellerId] += itemTotal;
        
        if (!sellerItems[sellerId]) sellerItems[sellerId] = [];
        
        const orderItem = {
            productId: product.id,
            quantity: qty,
            priceAtTime: finalPrice,
            variants: item.variants ? (Array.isArray(item.variants) ? item.variants.join(', ') : item.variants) : null
        };
        
        orderItemsData.push(orderItem);
        sellerItems[sellerId].push(orderItem);
        
        productsToUpdate.push({ id: product.id, quantity: qty });
    }

    // 2. Promo Code Logic
    let discount = 0;
    let appliedPromo = null;
    if (promoCodeStr) {
        const promo = await prisma.promoCode.findUnique({ where: { code: promoCodeStr } });
        const now = new Date();
        
        if (promo && promo.isActive && promo.startsAt <= now && (!promo.expiresAt || promo.expiresAt >= now)) {
            // Check limits
            const usageCount = await prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id } });
            const userUsage = await prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id, userId } });
            
            if ((!promo.maxUses || usageCount < promo.maxUses) && userUsage < promo.maxUsesPerUser) {
                // If it's scoped to a seller, check if the seller is in the cart
                if (!promo.sellerId || sellerIds.has(promo.sellerId)) {
                    // Applicable
                    const applicableSubtotal = promo.sellerId ? sellerSubtotals[promo.sellerId] : subtotal;

                    if (promo.discountType === 'PERCENTAGE') {
                        discount = applicableSubtotal * (Number(promo.discountValue) / 100);
                    } else {
                        discount = Math.min(Number(promo.discountValue), applicableSubtotal);
                    }
                    appliedPromo = promo;
                }
            }
        }
    }
    
    // Fallback to platform discount if no promo code applied (legacy behavior)
    if (discount === 0) {
        discount = (subtotal > 150) ? 10.00 : ((subtotal > 80) ? 5.00 : 0);
    }
    
    // Prevent negative subtotal
    discount = Math.min(discount, subtotal);

    // 3. Logistics & Tax
    const sellerCount = sellerIds.size;
    let shippingCost = items.length > 0 ? (sellerCount * 15) : 0;
    if (isConsolidated) shippingCost = Math.max(15, shippingCost * 0.6);

    const rate = getTaxRate(region);
    const taxableAmount = Math.max(0, subtotal + shippingCost - discount);
    const taxAmount = taxableAmount * rate;
    const totalAmountUSD = subtotal + shippingCost - discount + taxAmount;
    
    const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');
    const commissionAmount = totalAmountUSD * COMMISSION_RATE;
    const sellerAmountCalc = totalAmountUSD - commissionAmount;

    const expiresAt = initialStatus === 'PENDING' ? new Date(Date.now() + 15 * 60 * 1000) : null;
    const addressStr = typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress);

    if (dryRun) {
        const sId = Array.from(sellerIds)[0];
        return { totalAmountUSD, parentOrder: { id: 'dry-run', sellerId: sId === 'default' ? null : sId } };
    }

    // 4. Atomic Transaction for Orders and Stock
    const result = await prisma.$transaction(async (tx) => {
        let activeHubId = null;
        let consolidatedPackageId = null;
        let hubLocationName = null;

        if (isConsolidated) {
            const hub = await tx.hub.findFirst({ where: { isActive: true } });
            if (hub) {
                activeHubId = hub.id;
                hubLocationName = hub.name;
                const pkg = await tx.consolidatedPackage.create({
                    data: { buyerId: userId, hubId: activeHubId, status: 'AWAITING_ITEMS' }
                });
                consolidatedPackageId = pkg.id;
            }
        }

        // A. Create Parent Order
        const parentOrder = await tx.order.create({
            data: {
                buyerId: userId,
                totalAmount: totalAmountUSD,
                shippingCost,
                taxAmount,
                status: initialStatus,
                paymentStatus: initialStatus === 'PAID' ? 'HELD' : 'PENDING',
                paymentMethod,
                commissionRate: COMMISSION_RATE,
                commissionAmount,
                sellerAmount: sellerAmountCalc, // Total for parent
                shippingAddress: addressStr,
                expiresAt,
                idempotencyKey,
                isConsolidated: isConsolidated && !!activeHubId,
                hubLocation: hubLocationName,
                consolidatedPackageId: consolidatedPackageId,
                items: { create: orderItemsData } // Parent has all items for easy querying
            }
        });
        
        // B. Create Child Orders if Multi-Seller
        const childOrders = [];
        if (sellerCount > 1) {
            for (const sellerId of sellerIds) {
                const sSubtotal = sellerSubtotals[sellerId];
                // Pro-rate shipping, tax, and discount (simplified: equal split)
                const sShipping = shippingCost / sellerCount;
                const sTax = taxAmount / sellerCount;
                const sDiscount = discount / sellerCount;
                const sTotal = sSubtotal + sShipping - sDiscount + sTax;
                
                const childOrder = await tx.order.create({
                    data: {
                        buyerId: userId,
                        parentOrderId: parentOrder.id,
                        sellerId: sellerId === 'default' ? null : sellerId,
                        totalAmount: sTotal,
                        shippingCost: sShipping,
                        taxAmount: sTax,
                        status: initialStatus,
                        paymentStatus: initialStatus === 'PAID' ? 'HELD' : 'PENDING',
                        paymentMethod,
                        commissionRate: COMMISSION_RATE,
                        commissionAmount: sTotal * COMMISSION_RATE,
                        sellerAmount: sTotal - (sTotal * COMMISSION_RATE),
                        shippingAddress: addressStr,
                        expiresAt,
                        isConsolidated: isConsolidated && !!activeHubId,
                        hubLocation: hubLocationName,
                        consolidatedPackageId: consolidatedPackageId,
                        items: { create: sellerItems[sellerId] }
                    }
                });
                childOrders.push(childOrder);
            }
        } else {
            // Single seller, just set the sellerId on the parent order to keep it simple
            const sId = Array.from(sellerIds)[0];
            await tx.order.update({
                where: { id: parentOrder.id },
                data: { sellerId: sId === 'default' ? null : sId }
            });
        }
        
        // C. Decrement Stock Immediately
        for (const p of productsToUpdate) {
            await tx.product.update({
                where: { id: p.id },
                data: { stock: { decrement: p.quantity } }
            });
        }

        // C.5 Wallet deduction
        let updatedUser = null;
        if (paymentMethod === 'WALLET') {
            const walletService = require('./walletService');
            // Use walletService.createHold to properly deduct funds and track escrow
            const hold = await walletService.createHold(userId, 'GONG', totalAmountUSD, {
                referenceType: 'ORDER',
                referenceId: parentOrder.id,
                description: `Payment hold for Order #${parentOrder.id.substring(0, 8)}`
            }, tx);
            
            // Get the updated wallet to return a simulated updatedUser for backward compatibility
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            updatedUser = { id: userId, balance: wallet ? wallet.gongAvailable : 0 };
            
            // Log Transaction (Legacy)
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'PURCHASE',
                    amount: totalAmountUSD,
                    currency: 'USD',
                    status: 'COMPLETED',
                    referenceId: parentOrder.id,
                    description: `Wallet Payment for Order #${parentOrder.id.substring(0, 8)}`
                }
            });
        }
        
        // D. Record Promo Usage
        if (appliedPromo) {
            await tx.promoCodeUsage.create({
                data: {
                    promoCodeId: appliedPromo.id,
                    userId,
                    orderId: parentOrder.id,
                    discountApplied: discount
                }
            });
            await tx.promoCode.update({
                where: { id: appliedPromo.id },
                data: { usedCount: { increment: 1 } }
            });
        }

        return { parentOrder, childOrders, totalAmountUSD, updatedUser };
    });

    return result;
};

function getTaxRate(region) {
    switch (region?.toUpperCase()) {
        case 'EU':
        case 'FR':
        case 'DE': return 0.21;
        case 'UK': 
        case 'GB': return 0.20;
        case 'MENA': return 0.05;
        case 'AFRICA': return 0.15;
        case 'NG': 
        case 'NIGERIA': return 0.075;
        default: return 0.08;
    }
}
