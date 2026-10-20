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
    dryRun = false,
    gamificationReward
}) => {
    if (!items || items.length === 0) {
        throw new Error('Cart is empty.');
    }

    if (idempotencyKey) {
        const existingOrder = await prisma.order.findUnique({ 
            where: { idempotencyKey },
            include: { items: true }
        });
        if (existingOrder) {
            return { parentOrder: existingOrder, totalAmountUSD: Number(existingOrder.totalAmount), isExistingOrder: true };
        }
    }

    // 1. Backend Price & Stock Validation
    let subtotal = 0;
    let directShippingCost = 0;
    const orderItemsData = [];
    const productsToUpdate = [];
    const sellerIds = new Set();
    const sellerSubtotals = {};
    const sellerItems = {};
    const productIds = items.map(i => String(i.productId || i.id));
    let adDiscountSessions = [];
    if (userId) {
        adDiscountSessions = await prisma.adDiscountSession.findMany({
            where: {
                buyerId: userId,
                productId: { in: productIds },
                currentDiscountPct: { gt: 0 }
            }
        });
    }

    for (const item of items) {
        const product = await prisma.product.findUnique({
            where: { id: String(item.productId || item.id) },
            include: { 
                store: true,
                flashDeals: {
                    where: {
                        isActive: true,
                        startDate: { lte: new Date() },
                        endDate: { gt: new Date() }
                    }
                }
            }
        });

        if (!product) {
            throw new Error(`Product ${item.productId || item.id} not found.`);
        }

        // Products from stores that have not been approved by an admin are not purchasable
        if (product.isArchived || !product.store || product.store.approvalStatus !== 'APPROVED') {
            const err = new Error(`"${product.title}" is not currently available for purchase.`);
            err.statusCode = 409;
            throw err;
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
        if (product.isFlashSale && product.flashPrice && new Date() < new Date(product.flashEndsAt)) {
            finalPrice = Number(product.flashPrice);
        } else if (product.flashDeals && product.flashDeals.length > 0) {
            const activeDeal = product.flashDeals[0];
            finalPrice = Number((finalPrice * (1 - (Number(activeDeal.discount || 0) / 100))).toFixed(2));
        }

        const adSession = adDiscountSessions.find(s => s.productId === product.id);
        if (adSession) {
            finalPrice = Number((finalPrice * (1 - (adSession.currentDiscountPct / 100))).toFixed(2));
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

        // Direct shipping uses the product's own shippingFee — identical to the cart UI
        // (cartStore: directShippingRate = parseFloat(product.shippingFee) || 0).
        const directRate = parseFloat(product.shippingFee) || 0;
        directShippingCost += directRate * qty;
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
    
    // NOTE: The hidden legacy platform discount ($10 over 150 / $5 over 80) was removed —
    // it was never shown in the cart UI and caused total/receipt mismatches.
    
    // Gamification Reward Logic
    if (gamificationReward === '5_off') {
        discount += 5.00;
    } else if (gamificationReward === '10_off') {
        discount += 10.00;
    } else if (gamificationReward === 'free_shipping') {
        discount += isConsolidated ? 25.00 : directShippingCost;
    }

    // Prevent negative subtotal
    discount = Math.min(discount, subtotal + (isConsolidated ? 25.00 : directShippingCost));

    // 3. Logistics & Tax
    const sellerCount = sellerIds.size;
    let shippingCost = isConsolidated ? 25.00 : directShippingCost;

    const rate = 0; // Removed tax to match frontend UI
    const taxableAmount = Math.max(0, subtotal + shippingCost - discount);
    const taxAmount = 0;
    const totalAmountUSD = subtotal + shippingCost - discount + taxAmount;
    
    const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');
    const commissionAmount = totalAmountUSD * COMMISSION_RATE;
    const sellerAmountCalc = totalAmountUSD - commissionAmount;

    const expiresAt = initialStatus === 'PENDING' ? new Date(Date.now() + 15 * 60 * 1000) : null;
    const addressStr = typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress);

    if (dryRun) {
        const sId = Array.from(sellerIds)[0];
        return { totalAmountUSD, parentOrder: { id: 'dry-run', sellerId: sId === 'default' ? null : sId, items: orderItemsData }, sellerCount };
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
        let parentOrder = await tx.order.create({
            data: {
                buyerId: userId,
                totalAmount: totalAmountUSD,
                shippingCost,
                taxAmount,
                status: initialStatus,
                paymentStatus: initialStatus === 'PAID' ? 'HELD' : initialStatus === 'AWAITING_TRANSFER' ? 'AWAITING_PROOF' : 'PENDING',
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
            },
            include: { items: true }
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
                        paymentStatus: initialStatus === 'PAID' ? 'HELD' : initialStatus === 'AWAITING_TRANSFER' ? 'AWAITING_PROOF' : 'PENDING',
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
            parentOrder = await tx.order.update({
                where: { id: parentOrder.id },
                data: { sellerId: sId === 'default' ? null : sId },
                include: { items: true }
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

        return { parentOrder, childOrders, totalAmountUSD, updatedUser, sellerCount };
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

/**
 * Atomically cancel a pending order and restore product stock.
 * Handles both parent order and any child orders.
 * Prevents double-incrementing stock if already cancelled or paid.
 * 
 * @param {Object} params
 * @param {string} [params.orderId]
 * @param {string} [params.reference]
 * @param {string} [params.userId]
 * @returns {Promise<{ success: boolean, message: string, orderId?: string, alreadyCancelled?: boolean }>}
 */
exports.cancelAndRestoreOrder = async ({ orderId, reference, userId }) => {
    try {
        const orConditions = [];
        if (orderId && orderId !== 'dry-run') {
            orConditions.push({ id: orderId });
        }
        if (reference) {
            orConditions.push({ stripePaymentId: reference });
            if (reference.startsWith('GX-')) {
                const stripped = reference.replace('GX-', '');
                if (!stripped.startsWith('TEMP-')) {
                    orConditions.push({ id: stripped });
                }
            }
        }

        if (orConditions.length === 0) {
            return { success: false, message: 'No valid order identifier provided.' };
        }

        const whereClause = { OR: orConditions };
        if (userId) {
            whereClause.buyerId = userId;
        }

        const order = await prisma.order.findFirst({
            where: whereClause,
            include: {
                items: true,
                subOrders: { include: { items: true } }
            }
        });

        if (!order) {
            return { success: false, message: 'Order not found.' };
        }

        // Safety check: Never cancel paid, processing, or fulfilled orders
        if (order.paymentStatus === 'PAID' || ['PROCESSING', 'PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
            return { success: false, message: 'Cannot cancel an order that is already paid or processing.' };
        }

        // Already cancelled check to prevent double inventory restoration
        if (order.status === 'CANCELLED' || order.paymentStatus === 'FAILED') {
            return { success: true, message: 'Order is already cancelled.', alreadyCancelled: true, orderId: order.id };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Mark parent order CANCELLED and paymentStatus FAILED
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'FAILED'
                }
            });

            // 2. Cascade cancellation to any child orders
            await tx.order.updateMany({
                where: { parentOrderId: order.id },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'FAILED'
                }
            });

            // 3. Restore product stock for all items
            // Note: Parent order holds all items across all stores in the checkout
            for (const item of order.items) {
                if (item.productId && item.quantity > 0) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }

            // 4. Revert promo code usage if applied
            const promoUsage = await tx.promoCodeUsage.findFirst({
                where: { orderId: order.id }
            });
            if (promoUsage) {
                await tx.promoCode.update({
                    where: { id: promoUsage.promoCodeId },
                    data: { usedCount: { decrement: 1 } }
                }).catch(() => {});
                await tx.promoCodeUsage.delete({
                    where: { id: promoUsage.id }
                }).catch(() => {});
            }
        });

        logger.info(`[CHECKOUT] Order ${order.id} cancelled and stock restored successfully.`);
        return { success: true, message: 'Order cancelled and stock restored.', orderId: order.id };
    } catch (err) {
        logger.error(`[CHECKOUT] cancelAndRestoreOrder error: ${err.message}`);
        throw err;
    }
};
