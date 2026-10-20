/**
 * Checkout V2 Service — Multi-Seller Order Architecture (Phase 3/4)
 *
 * Creates a MarketplaceOrder + one FulfillmentOrder per seller inside a
 * single Prisma transaction.  Stock is decremented atomically so no race
 * condition can produce an over-sell.
 *
 * Design decisions:
 *  - commissionRate is read from PLATFORM_COMMISSION_RATE at checkout time
 *    and frozen on every FulfillmentOrder row.  It is never re-calculated
 *    later, making the financial record immutable.
 *  - priceAtTime, weightKg, and dimensionsCm are snapshotted from Product
 *    at checkout so historical cost never drifts.
 *  - shippingSnapshot is a full JSON copy of the address so edits by the
 *    buyer after checkout do not affect the delivery record.
 *  - idempotencyKey prevents double-submission from network retries.
 *  - The old Order table is NOT touched.  Legacy routes continue to work.
 */

'use strict';

const Stripe  = require('stripe');
const prisma  = require('../utils/prismaClient');
const logger  = require('../utils/logger');
const inventoryService = require('./inventoryService');
const crypto = require('crypto');

// Initialize Stripe (mock or real based on env variables)
// In a production environment, this should definitely be provided in the env variables
if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_SECRET_KEY) {
    require('../utils/logger').error('[CHECKOUT] STRIPE_SECRET_KEY is missing in production — Stripe checkout will fail.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_unconfigured', {
    apiVersion: '2023-10-16', // Lock the API version for stable integrations
});

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.05');
const BASE_SHIPPING   = parseFloat(process.env.SHIPPING_BASE_RATE        || '750');

// Checkout sessions expire 30 minutes after creation if still PENDING
const CHECKOUT_TTL_MS = 30 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the effective unit price for a product (flash-sale aware).
 */
function resolvePrice(product) {
    // Legacy support
    if (product.isFlashSale && product.flashPrice && new Date() < new Date(product.flashEndsAt)) {
        return Number(product.flashPrice);
    }
    
    // New FlashDeal table support
    if (product.flashDeals && product.flashDeals.length > 0) {
        const activeDeal = product.flashDeals[0];
        const originalPrice = Number(product.price);
        return Number((originalPrice * (1 - (Number(activeDeal.discount || 0) / 100))).toFixed(2));
    }

    return Number(product.price);
}

/**
 * Calculate per-seller shipping cost.
 * Base rate per seller; multi-seller orders do NOT get a consolidated discount
 * at this layer — that's a future pricing policy decision.
 */
function calcShipping(/* sellerCount */ _n) {
    return BASE_SHIPPING;   // flat per fulfillment order; extend with weight tiers later
}

/**
 * Validate and resolve a promo code.
 * Returns { discount, appliedPromo } — discount is 0 if the code is invalid.
 */
async function resolvePromoCode({ promoCodeStr, buyerId, sellerIds, subtotalByCode, items }) {
    if (!promoCodeStr) return { discount: 0, appliedPromo: null };

    const promo = await prisma.promoCode.findUnique({ where: { code: promoCodeStr.toUpperCase() } });
    const now = new Date();

    if (!promo || !promo.isActive || promo.startsAt > now || (promo.expiresAt && promo.expiresAt < now)) {
        return { discount: 0, appliedPromo: null, error: 'Promo code is invalid or expired.' };
    }

    const [totalUsage, userUsage] = await Promise.all([
        prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id } }),
        buyerId ? prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id, userId: buyerId } }) : Promise.resolve(0),
    ]);

    if ((promo.maxUses && totalUsage >= promo.maxUses) || (buyerId && userUsage >= promo.maxUsesPerUser)) {
        return { discount: 0, appliedPromo: null, error: 'Promo code usage limit reached.' };
    }

    // Seller-scoped code: only applies if that seller is in the cart
    if (promo.sellerId && !sellerIds.has(promo.sellerId)) {
        return { discount: 0, appliedPromo: null, error: 'Promo code does not apply to your cart.' };
    }

    // Product-scoped code: only applies if this specific product is in the cart
    let applicableSubtotal = 0;
    if (promo.productId) {
        const matchingItems = (items || []).filter(i => String(i.productId) === String(promo.productId));
        if (matchingItems.length === 0) {
            return { discount: 0, appliedPromo: null, error: 'Promo code is only applicable to its specific product.' };
        }
        applicableSubtotal = matchingItems.reduce((acc, i) => acc + (Number(i.subtotal) || (Number(i.priceAtTime || i.price) * Number(i.quantity))), 0);
    } else if (promo.sellerId) {
        applicableSubtotal = subtotalByCode[promo.sellerId] || 0;
    } else if (typeof subtotalByCode === 'number') {
        applicableSubtotal = subtotalByCode;
    } else {
        applicableSubtotal = Object.values(subtotalByCode || {}).reduce((a, b) => a + b, 0);
    }

    const discount = promo.discountType === 'PERCENTAGE'
        ? applicableSubtotal * (Number(promo.discountValue) / 100)
        : Math.min(Number(promo.discountValue), applicableSubtotal);

    return { discount: Math.round(discount * 100) / 100, appliedPromo: promo };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * processCheckoutV2
 *
 * @param {object} params
 * @param {string}   params.buyerId          - Authenticated buyer's user ID
 * @param {string}   [params.idempotencyKey] - Client-generated UUID to prevent double submission
 * @param {string}   [params.promoCodeStr]   - Optional promo code string
 * @param {string}   [params.paymentMethod]  - e.g. 'PAYSTACK' | 'STRIPE' | 'WALLET' | 'BANK_TRANSFER'
 * @param {string}   [params.paymentReference] - Gateway reference (set after payment completes)
 * @param {object}   [params.addressId]      - ID of a saved Address row
 * @param {object}   [params.addressData]    - Inline address object (if no saved address)
 * @param {string}   [params.notes]          - Buyer-level order notes
 * @param {boolean}  [params.fromCart]       - If true, reads items from the buyer's Cart (default: true)
 * @param {Array}    [params.items]          - Explicit item list (overrides fromCart); [{productId, quantity, variants?}]
 * @returns {Promise<{ marketplaceOrder, fulfillmentOrders, summary }>}
 */
exports.processCheckoutV2 = async ({
    buyerId,
    idempotencyKey,
    promoCodeStr,
    paymentMethod,
    paymentReference,
    addressId,
    addressData,
    notes,
    fromCart = true,
    clearCart = true,
    items: explicitItems,
    isConsolidated = false,
}) => {
    // ── 0. Idempotency guard ────────────────────────────────────────────────
    let finalIdempotencyKey = idempotencyKey;
    if (idempotencyKey) {
        const existing = await prisma.marketplaceOrder.findUnique({
            where: { idempotencyKey },
            include: { fulfillmentOrders: { include: { items: true } } },
        });
        if (existing) {
            if (['CANCELLED', 'FAILED'].includes(existing.status)) {
                finalIdempotencyKey = `${idempotencyKey}_retry_${Date.now()}`;
            } else {
                logger.info(`[CheckoutV2] Idempotent replay for key ${idempotencyKey}`);
                return { marketplaceOrder: existing, fulfillmentOrders: existing.fulfillmentOrders, isReplay: true };
            }
        }
    }

    // ── 1. Resolve items ───────────────────────────────────────────────────
    let rawItems = explicitItems;

    if (fromCart && !rawItems && buyerId) {
        const cart = await prisma.cart.findUnique({
            where: { userId: buyerId },
            include: { items: true },
        });
        if (!cart || cart.items.length === 0) {
            throw Object.assign(new Error('Your cart is empty.'), { statusCode: 400 });
        }
        rawItems = cart.items.map(ci => ({
            productId: ci.productId,
            quantity:  ci.quantity,
            variants:  ci.variants,
        }));
    }

    if (!rawItems || rawItems.length === 0) {
        throw Object.assign(new Error('No items provided for checkout.'), { statusCode: 400 });
    }

    // ── 2. Resolve products and validate stock ─────────────────────────────
    const productIds = [...new Set(rawItems.map(i => String(i.productId)))];
    const products   = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { 
            store: { include: { sellerPlan: true } },
            flashDeals: {
                where: {
                    isActive: true,
                    startDate: { lte: new Date() },
                    endDate: { gt: new Date() }
                }
            }
        },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Fetch ad discount sessions for the buyer and these products
    let adDiscountSessions = [];
    if (buyerId) {
        adDiscountSessions = await prisma.adDiscountSession.findMany({
            where: {
                buyerId,
                productId: { in: productIds },
                currentDiscountPct: { gt: 0 }
            }
        });
    }

    // Group items by seller
    // sellerBuckets: Map<sellerId, { sellerId, storeId, items: [] }>
    const sellerBuckets = new Map();
    // Note: stock decrement now handled by inventoryService.reserve() in step 7C (Phase 13)

    for (const raw of rawItems) {
        const pid     = String(raw.productId);
        const product = productMap.get(pid);

        if (!product || product.isArchived) {
            throw Object.assign(new Error(`Product ${pid} not found or no longer available.`), { statusCode: 404 });
        }

        // Products from stores pending/rejected admin approval cannot be purchased
        if (!product.store || product.store.approvalStatus !== 'APPROVED') {
            throw Object.assign(
                new Error(`"${product.title}" is not currently available for purchase.`),
                { statusCode: 409 }
            );
        }

        const qty = Math.max(1, Number(raw.quantity || 1));

        // Pre-flight stock guard (fast path — avoids DB tx overhead for obviously OOS items)
        // The real atomic check happens in step 7C via inventoryService.reserve()
        if (product.stock < qty) {
            throw Object.assign(
                new Error(`Insufficient stock for "${product.title}". Only ${product.stock} left.`),
                { statusCode: 409 }
            );
        }

        const sellerId = product.store?.sellerId;
        if (!sellerId) {
            throw Object.assign(new Error(`Product "${product.title}" has no associated seller.`), { statusCode: 422 });
        }

        let unitPrice = resolvePrice(product);
        const adSession = adDiscountSessions.find(s => s.productId === product.id);
        if (adSession) {
            unitPrice = Number((unitPrice * (1 - (adSession.currentDiscountPct / 100))).toFixed(2));
        }

        if (!sellerBuckets.has(sellerId)) {
            const sellerCommissionRate = product.store?.sellerPlan?.commissionRate ?? COMMISSION_RATE;
            sellerBuckets.set(sellerId, { sellerId, storeId: product.store.id, items: [], commissionRate: sellerCommissionRate });
        }

        sellerBuckets.get(sellerId).items.push({
            productId:    product.id,
            quantity:     qty,
            priceAtTime:  unitPrice,
            subtotal:     Math.round(unitPrice * qty * 100) / 100,
            variants:     raw.variants ? (typeof raw.variants === 'string' ? raw.variants : JSON.stringify(raw.variants)) : null,
            itemDiscount: 0,
            weightKg:     product.weightKg     ?? null,
            dimensionsCm: null,    // Future: JSON.stringify({ l, w, h }) from product metadata
        });
        // stockDecrements now handled atomically in step 7C via inventoryService.reserve()
    }

    // ── 3. Pricing ─────────────────────────────────────────────────────────
    // Per-seller: subtotal, shipping, commission
    const sellerArr = Array.from(sellerBuckets.values()).map(bucket => {
        const subtotal         = bucket.items.reduce((s, i) => s + i.subtotal, 0);
        const shippingCost     = calcShipping(sellerBuckets.size);
        const commissionAmount = Math.round(subtotal * bucket.commissionRate * 100) / 100;
        const sellerAmount     = Math.round((subtotal - commissionAmount) * 100) / 100;
        const grandTotal       = Math.round((subtotal + shippingCost) * 100) / 100;

        return {
            ...bucket,
            subtotal:         Math.round(subtotal * 100) / 100,
            shippingCost,
            commissionRate:   bucket.commissionRate,
            commissionAmount,
            sellerAmount,
            grandTotal,
        };
    });

    // ── 4. Promo Code ──────────────────────────────────────────────────────
    const subtotalByCode = {};
    for (const s of sellerArr) subtotalByCode[s.sellerId] = s.subtotal;
    const sellerIdSet = new Set(sellerArr.map(s => s.sellerId));

    const allItems = sellerArr.flatMap(s => s.items);
    const { discount: promoDiscount, appliedPromo, error: promoError } = await resolvePromoCode({
        promoCodeStr,
        buyerId,
        sellerIds: sellerIdSet,
        subtotalByCode,
        items: allItems
    });

    if (promoCodeStr && promoError) {
        logger.warn(`[CheckoutV2] Promo "${promoCodeStr}" rejected: ${promoError}`);
        // Non-fatal: checkout proceeds without the promo
    }

    // ── 5. MarketplaceOrder totals ─────────────────────────────────────────
    const marketplaceSubtotal    = sellerArr.reduce((s, o) => s + o.subtotal,  0);
    const marketplaceShipping    = sellerArr.reduce((s, o) => s + o.shippingCost, 0);
    const marketplaceGrandTotal  = Math.round(
        (marketplaceSubtotal + marketplaceShipping - promoDiscount) * 100
    ) / 100;

    // ── 6. Resolve shipping address ────────────────────────────────────────
    let resolvedAddress = null;
    if (addressId) {
        resolvedAddress = await prisma.address.findUnique({ where: { id: addressId } });
        if (!resolvedAddress || resolvedAddress.userId !== buyerId) {
            throw Object.assign(new Error('Shipping address not found.'), { statusCode: 404 });
        }
    }
    const shippingSnapshot = resolvedAddress
        ? JSON.stringify(resolvedAddress)
        : (addressData ? JSON.stringify(addressData) : null);

    // ── 7. Atomic transaction ──────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
        let activeHubId = null;
        let consolidatedPackageId = null;

        if (isConsolidated) {
            const hub = await tx.hub.findFirst({ where: { isActive: true } });
            if (hub) {
                activeHubId = hub.id;
                const pkg = await tx.consolidatedPackage.create({
                    data: { buyerId, hubId: activeHubId, status: 'AWAITING_ITEMS' }
                });
                consolidatedPackageId = pkg.id;
            }
        }

        // 7A. Create MarketplaceOrder
        const marketplaceOrder = await tx.marketplaceOrder.create({
            data: {
                buyerId:          buyerId || 'guest_user',
                subtotal:         Math.round(marketplaceSubtotal  * 100) / 100,
                shippingCost:     Math.round(marketplaceShipping   * 100) / 100,
                discountTotal:    promoDiscount,
                grandTotal:       marketplaceGrandTotal,
                currency:         'NGN',
                promoCodeId:      appliedPromo?.id ?? null,
                promoDiscount,
                shippingAddressId: resolvedAddress?.id ?? null,
                shippingSnapshot,
                paymentMethod:    paymentMethod ?? null,
                paymentReference: paymentReference ?? null,
                paymentStatus:    paymentReference ? 'PAID' : 'PENDING',
                paidAt:           paymentReference ? new Date() : null,
                status:           'PENDING',
                idempotencyKey:   finalIdempotencyKey ?? null,
                notes:            notes ?? null,
                expiresAt:        new Date(Date.now() + CHECKOUT_TTL_MS),
            },
        });

        // 7B. Create one FulfillmentOrder per seller + items
        const fulfillmentOrders = [];
        for (const s of sellerArr) {
            const fo = await tx.fulfillmentOrder.create({
                data: {
                    marketplaceOrderId: marketplaceOrder.id,
                    buyerId:          buyerId || 'guest_user',
                    sellerId:         s.sellerId,
                    subtotal:         s.subtotal,
                    shippingCost:     s.shippingCost,
                    discountAmount:   0,            // seller-level discounts extend here later
                    grandTotal:       s.grandTotal,
                    currency:         'NGN',
                    commissionRate:   s.commissionRate,
                    commissionAmount: s.commissionAmount,
                    sellerAmount:     s.sellerAmount,
                    status:           'PENDING',
                    paymentStatus:    paymentReference ? 'HELD' : 'PENDING',
                    isConsolidated:   isConsolidated && !!activeHubId,
                    hubLocation:      activeHubId ? 'Lagos Central Hub' : null, // Fallback location name
                    consolidatedPackageId: consolidatedPackageId,
                    // Escrow: release funds 48 h after delivery (configured by cron in Phase 6)
                    items: {
                        create: s.items,
                    },
                },
                include: { items: true },
            });
            fulfillmentOrders.push(fo);
        }

        // 7C. Atomic inventory reservation (Phase 13)
        // inventoryService.reserve() uses a conditional UPDATE (stock >= qty)
        // so two concurrent buyers racing for the last unit will get a 409 on one of them.
        const reservationIds = [];
        for (const fo of fulfillmentOrders) {
            for (const item of fo.items) {
                const reservation = await inventoryService.reserve(
                    tx,
                    item.productId,
                    item.quantity,
                    fo.id,
                );
                reservationIds.push(reservation.id);
            }
        }

        // 7D. Record promo usage
        if (appliedPromo) {
            await tx.promoCodeUsage.create({
                data: {
                    promoCodeId:     appliedPromo.id,
                    userId:          buyerId,
                    // PromoCodeUsage.orderId still references legacy Order — nullable migration pending
                    // We cannot store marketplaceOrder.id here as it causes an FK constraint failure.
                    orderId:         null,
                    discountApplied: promoDiscount,
                },
            });
            await tx.promoCode.update({
                where: { id: appliedPromo.id },
                data:  { usedCount: { increment: 1 } },
            });
        }

        // 7E. Clear the buyer's cart
        // Online gateway payments (Paystack/Stripe/Flutterwave/Monnify/Card) only clear the cart
        // once the payment is confirmed (see paymentV2Service.onChargeSuccess). Orders that are
        // already paid (paymentReference) or use offline methods clear immediately.
        const OFFLINE_METHODS = ['WALLET', 'COD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER', 'DIRECT_BANK', 'FREE'];
        const shouldClearNow = !!paymentReference || OFFLINE_METHODS.includes(String(paymentMethod || '').toUpperCase());
        if (clearCart && buyerId && shouldClearNow) {
            const cart = await tx.cart.findUnique({ where: { userId: buyerId } });
            // BUG-CHECKOUT-01: Was referencing `items` (undefined in this scope) — cart never cleared.
            // Fixed: use `rawItems` which holds the resolved item list.
            if (cart && rawItems && rawItems.length > 0) {
                const purchasedProductIds = rawItems.map(i => String(i.productId));
                await tx.cartItem.deleteMany({
                    where: {
                        cartId: cart.id,
                        productId: { in: purchasedProductIds }
                    }
                });
            }
        }

        return { marketplaceOrder, fulfillmentOrders };
    });

    // ── 8. Payment Intent Initialization (Stripe) ──────────────────────────
    let clientSecret = null;
    if (paymentMethod === 'STRIPE' && !paymentReference) {
        try {
            // Amount must be in the smallest currency unit (e.g., kobo for NGN, cents for USD)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(marketplaceGrandTotal * 100),
                currency: 'ngn',
                metadata: {
                    marketplaceOrderId: result.marketplaceOrder.id,
                    buyerId: buyerId,
                },
                // Automatic payment methods provide better conversion rates
                automatic_payment_methods: { enabled: true },
            });

            clientSecret = paymentIntent.client_secret;

            // Save the newly created intent ID as a temporary reference
            await prisma.marketplaceOrder.update({
                where: { id: result.marketplaceOrder.id },
                data: { paymentReference: paymentIntent.id },
            });
            result.marketplaceOrder.paymentReference = paymentIntent.id;
            
            logger.info(`[CheckoutV2] Initialized Stripe PaymentIntent for order ${result.marketplaceOrder.id}`);
        } catch (error) {
            logger.error(`[CheckoutV2] Stripe PaymentIntent creation failed: ${error.message}`);
            throw Object.assign(new Error('Failed to initialize payment gateway.'), { statusCode: 502 });
        }
    }

    logger.info(
        `[CheckoutV2] Created MarketplaceOrder ${result.marketplaceOrder.id} ` +
        `with ${result.fulfillmentOrders.length} fulfillment orders ` +
        `(buyers: ${buyerId}, total: ₦${marketplaceGrandTotal})`
    );

    return {
        marketplaceOrder: result.marketplaceOrder,
        fulfillmentOrders: result.fulfillmentOrders,
        clientSecret, // The frontend will use this to confirm the payment
        summary: {
            sellerCount:      sellerArr.length,
            subtotal:         marketplaceSubtotal,
            shippingTotal:    marketplaceShipping,
            promoDiscount,
            promoCode:        appliedPromo?.code ?? null,
            promoError:       promoError ?? null,
            grandTotal:       marketplaceGrandTotal,
            currency:         'NGN',
            commissionRate:   COMMISSION_RATE,
        },
    };
};

// ─── Phase 11: Checkout Preview (no DB write) ─────────────────────────────────

/**
 * previewCheckout
 *
 * Runs the full cart resolution + price calculation + seller grouping
 * WITHOUT committing anything to the database.
 *
 * Returns a CheckoutSession that is:
 *   1. Stored in Redis (or in-memory) for CHECKOUT_TTL_MS (30 min)
 *   2. Identified by a session token passed back to the frontend
 *   3. Used by confirmCheckout() to commit the actual DB records
 *
 * @param {object} params — same shape as processCheckoutV2
 * @returns {Promise<{ sessionToken, expiresAt, session }>}
 */
exports.previewCheckout = async ({
    buyerId,
    promoCodeStr,
    paymentMethod = 'PAYSTACK',
    addressId,
    addressData,
    notes,
    fromCart = true,
    items: explicitItems,
    isConsolidated = false,
}) => {
    // ── 1. Resolve items ───────────────────────────────────────────────────────
    let rawItems = explicitItems;

    if (fromCart && !rawItems) {
        const cart = await prisma.cart.findUnique({
            where:   { userId: buyerId },
            include: { items: true },
        });
        if (!cart || cart.items.length === 0) {
            throw Object.assign(new Error('Your cart is empty.'), { statusCode: 400 });
        }
        rawItems = cart.items.map(ci => ({
            productId: ci.productId,
            quantity:  ci.quantity,
            variants:  ci.variants,
        }));
    }

    if (!rawItems || rawItems.length === 0) {
        throw Object.assign(new Error('No items provided for checkout.'), { statusCode: 400 });
    }

    // ── 2. Resolve products (reuse product query from processCheckoutV2) ───────
    const productIds = [...new Set(rawItems.map(i => String(i.productId)))];
    const products   = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
            store: { select: { id: true, storeName: true, sellerId: true, portfolioConfig: true, sellerPlan: { select: { commissionRate: true } } } },
            images: { take: 1, select: { url: true } },
        },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // ── 3. Group by seller and build seller bundles ────────────────────────────
    const sellerMap = new Map(); // sellerId → { sellerId, storeName, items[], subtotal, shipping }
    let   validationError = null;

    for (const ri of rawItems) {
        const product = productMap.get(String(ri.productId));
        if (!product) { validationError = `Product ${ri.productId} not found.`; break; }
        if (product.isArchived) { validationError = `"${product.title}" is no longer available.`; break; }
        if (product.stock < ri.quantity) { validationError = `Insufficient stock for "${product.title}" (${product.stock} available).`; break; }

        const unitPrice = resolvePrice(product);
        const sellerId  = product.store?.sellerId || 'unknown';
        const storeName = product.store?.storeName || 'Unknown Store';

        if (!sellerMap.has(sellerId)) {
            const sellerCommissionRate = product.store?.sellerPlan?.commissionRate ?? COMMISSION_RATE;
            sellerMap.set(sellerId, {
                sellerId,
                storeId:   product.store?.id,
                storeName,
                items:     [],
                subtotal:  0,
                shipping:  calcShipping(1),
                commissionRate: sellerCommissionRate,
            });
        }

        const bundle = sellerMap.get(sellerId);
        bundle.items.push({
            productId:  product.id,
            title:      product.title,
            imageUrl:   product.images?.[0]?.url || null,
            quantity:   ri.quantity,
            unitPrice,
            lineTotal:  unitPrice * ri.quantity,
            variants:   ri.variants || null,
        });
        bundle.subtotal += unitPrice * ri.quantity;
    }

    if (validationError) {
        throw Object.assign(new Error(validationError), { statusCode: 409 });
    }

    // ── 4. Resolve promo code ──────────────────────────────────────────────────
    const sellerIds = new Set([...sellerMap.keys()]);
    const totalSubtotal = [...sellerMap.values()].reduce((s, b) => s + b.subtotal, 0);
    const allItems = [...sellerMap.values()].flatMap(b => b.items);
    const { discount: promoDiscount, appliedPromo, error: promoError } =
        await resolvePromoCode({ promoCodeStr, buyerId, sellerIds, subtotalByCode: totalSubtotal, items: allItems });

    // ── 5. Compute totals ──────────────────────────────────────────────────────
    const sellerBundles     = [...sellerMap.values()];
    const totalShipping     = sellerBundles.reduce((s, b) => s + b.shipping, 0);
    const grandTotal        = Math.max(0, totalSubtotal + totalShipping - promoDiscount);

    // ── 6. Build session payload ───────────────────────────────────────────────
    const sessionToken = `cksn-${buyerId.substring(0, 8)}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const expiresAt    = new Date(Date.now() + CHECKOUT_TTL_MS);

    const session = {
        sessionToken,
        buyerId,
        paymentMethod,
        addressId:   addressId || null,
        addressData: addressData || null,
        notes:       notes || null,
        isConsolidated,
        promoCode:   appliedPromo?.code || null,
        sellers:     sellerBundles,
        summary: {
            sellerCount:   sellerBundles.length,
            subtotal:      totalSubtotal,
            shippingTotal: totalShipping,
            promoDiscount,
            promoError:    promoError || null,
            grandTotal,
            currency:      'NGN',
        },
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
    };

    // Store session for confirmation step (Redis if available, in-memory fallback)
    await _storeCheckoutSession(sessionToken, session, CHECKOUT_TTL_MS);

    logger.info(
        `[CheckoutV2] Preview session ${sessionToken}: ${sellerBundles.length} sellers, ₦${grandTotal} total`
    );

    return { sessionToken, expiresAt, session };
};

/**
 * confirmCheckout
 *
 * Retrieves a preview session by token and calls processCheckoutV2 to commit
 * the MarketplaceOrder + FulfillmentOrders to the database.
 *
 * @param {string} sessionToken  — token returned by previewCheckout
 * @param {string} idempotencyKey — client-generated UUID
 * @returns {Promise<{ marketplaceOrder, fulfillmentOrders, summary }>}
 */
exports.confirmCheckout = async (sessionToken, idempotencyKey) => {
    const session = await _getCheckoutSession(sessionToken);
    if (!session) {
        throw Object.assign(
            new Error('Checkout session not found or expired. Please restart checkout.'),
            { statusCode: 410 }
        );
    }

    // Invalidate session immediately (one-time use)
    await _deleteCheckoutSession(sessionToken);

    // Delegate to existing processCheckoutV2 with the session's resolved data
    return exports.processCheckoutV2({
        buyerId:         session.buyerId,
        idempotencyKey,
        promoCodeStr:    session.promoCode,
        paymentMethod:   session.paymentMethod,
        addressId:       session.addressId,
        addressData:     session.addressData,
        notes:           session.notes,
        isConsolidated:  session.isConsolidated,
        fromCart:        false,               // items already resolved in preview
        clearCart:       true,
        items:           session.sellers.flatMap(b => b.items.map(i => ({
            productId: i.productId,
            quantity:  i.quantity,
            variants:  i.variants,
        }))),
    });
};

// ─── Session cache (Redis / in-memory fallback) ───────────────────────────────

const _memorySessionCache = new Map();

async function _storeCheckoutSession(token, session, ttlMs) {
    try {
        const redisManager = require('../utils/redisManager');
        if (redisManager.isConnected && redisManager.client) {
            await redisManager.client.set(
                `checkout:session:${token}`,
                JSON.stringify(session),
                { PX: ttlMs }
            );
            return;
        }
    } catch { /* fall through */ }
    // In-memory fallback
    _memorySessionCache.set(token, { session, expiresAt: Date.now() + ttlMs });
}

async function _getCheckoutSession(token) {
    try {
        const redisManager = require('../utils/redisManager');
        if (redisManager.isConnected && redisManager.client) {
            const raw = await redisManager.client.get(`checkout:session:${token}`);
            return raw ? JSON.parse(raw) : null;
        }
    } catch { /* fall through */ }
    const entry = _memorySessionCache.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { _memorySessionCache.delete(token); return null; }
    return entry.session;
}

async function _deleteCheckoutSession(token) {
    try {
        const redisManager = require('../utils/redisManager');
        if (redisManager.isConnected && redisManager.client) {
            await redisManager.client.del(`checkout:session:${token}`);
            return;
        }
    } catch { /* fall through */ }
    _memorySessionCache.delete(token);
}

// ─── Phase 14: Stripe Webhook Processing ─────────────────────────────────────

/**
 * handleStripeWebhook
 *
 * Processes asynchronous events directly from Stripe (e.g. successful payment, failure)
 * to securely update the MarketplaceOrder and FulfillmentOrder records.
 *
 * @param {object} event — The parsed Stripe webhook event
 */
exports.handleStripeWebhook = async (event) => {
    const paymentIntent = event.data.object;
    const marketplaceOrderId = paymentIntent.metadata?.marketplaceOrderId;

    if (!marketplaceOrderId) {
        logger.warn(`[CheckoutV2] Stripe Webhook received for intent ${paymentIntent.id} with no marketplaceOrderId in metadata.`);
        return { status: 'ignored', reason: 'missing_metadata' };
    }

    if (event.type === 'payment_intent.succeeded') {
        await prisma.$transaction(async (tx) => {
            const order = await tx.marketplaceOrder.update({
                where: { id: marketplaceOrderId },
                data: {
                    paymentStatus: 'PAID',
                    paidAt: new Date(),
                    paymentReference: paymentIntent.id,
                },
            });

            await tx.fulfillmentOrder.updateMany({
                where: { marketplaceOrderId: marketplaceOrderId },
                data: {
                    paymentStatus: 'HELD', // Funds held in escrow per marketplace logic
                },
            });
        });

        logger.info(`[CheckoutV2] Order ${marketplaceOrderId} successfully paid via Stripe.`);
        return { status: 'processed', action: 'marked_paid' };

    } else if (event.type === 'payment_intent.payment_failed') {
        await prisma.marketplaceOrder.update({
            where: { id: marketplaceOrderId },
            data: {
                paymentStatus: 'FAILED',
            },
        });

        logger.warn(`[CheckoutV2] Order ${marketplaceOrderId} payment failed via Stripe.`);
        return { status: 'processed', action: 'marked_failed' };
    }

    return { status: 'ignored', reason: 'unhandled_event_type' };
};

