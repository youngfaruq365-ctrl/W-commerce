const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const sellerController = require('../controllers/sellerController');
const { upload, uploadToCloud } = require('../middleware/uploadMiddleware');
const sellerBanningService = require('../services/sellerBanningService');

/**
 * GET /api/v1/sellers/:sellerId/profile
 * Public — returns seller identity, trust metrics, store reference.
 */
router.get('/:sellerId/profile', sellerController.getSellerProfile);
router.post('/onboarding', protect, upload.single('document'), sellerController.sellerOnboarding);
router.post('/:sellerId/follow', protect, sellerController.followSeller);
router.get('/analytics', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSellerAnalytics);
router.get('/weekly-summary', protect, authorize('SELLER', 'ADMIN'), analyticsController.getWeeklySummary);
router.get('/performance-alerts', protect, authorize('SELLER', 'ADMIN'), analyticsController.getPerformanceAlerts);
router.get('/top-products', protect, authorize('SELLER', 'ADMIN'), analyticsController.getTopProducts);
router.get('/sales-by-period', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSalesByPeriod);
router.get('/customer-insights', protect, authorize('SELLER', 'ADMIN'), analyticsController.getCustomerInsights);
router.get('/analytics/performance', protect, authorize('SELLER', 'ADMIN'), analyticsController.getPerformanceMetrics);
router.get('/insights', protect, authorize('SELLER', 'ADMIN'), analyticsController.generateInsights);
router.post('/update-score', protect, authorize('SELLER', 'ADMIN'), analyticsController.updatePerformanceScore);
router.get('/active-carts', protect, authorize('SELLER', 'ADMIN'), analyticsController.getActiveCarts);
router.post('/integration', protect, authorize('SELLER', 'ADMIN'), sellerController.connectIntegration);

/**
 * POST /api/seller/setup-paystack
 * Sets up Paystack subaccount and transfer recipient for a seller
 */
router.post('/setup-paystack', protect, authorize('SELLER'), async (req, res) => {
    try {
        const paystackService = require('../services/paystackSubaccountService');

        const store = await prisma.store.findFirst({
            where: { sellerId: req.user.id },
            include: { user: { select: { email: true, fullName: true } } }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        if (!store.accountNumber || !store.bankName) {
            return res.status(400).json({
                success: false,
                message: 'Please add your bank details (bank name and account number) to your store profile first.'
            });
        }

        const results = { subaccount: null, recipient: null };

        // 1. Create subaccount if not exists
        if (!store.paystackSubaccount) {
            const subaccount = await paystackService.createSubaccount(store);
            await prisma.store.update({
                where: { id: store.id },
                data: { paystackSubaccount: subaccount.subaccount_code }
            });
            results.subaccount = subaccount.subaccount_code;
        } else {
            results.subaccount = store.paystackSubaccount;
        }

        // 2. Create transfer recipient if not exists
        if (!store.paystackRecipientCode) {
            const recipient = await paystackService.createTransferRecipient(store);
            await prisma.store.update({
                where: { id: store.id },
                data: { paystackRecipientCode: recipient.recipient_code }
            });
            results.recipient = recipient.recipient_code;
        } else {
            results.recipient = store.paystackRecipientCode;
        }

        logger.info(`[SELLER] Paystack setup completed for store: ${store.storeName}`);

        res.json({
            success: true,
            message: 'Paystack payment setup complete! You can now receive split payments and payouts.',
            data: {
                subaccountCode: results.subaccount,
                recipientCode: results.recipient,
                storeName: store.storeName
            }
        });

    } catch (error) {
        logger.error(`Paystack Setup Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to setup Paystack. Please try again.' });
    }
});

/**
 * GET /api/seller/paystack-status
 * Check if Paystack is set up for the seller
 */
router.get('/paystack-status', protect, authorize('SELLER'), async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { sellerId: req.user.id },
            select: {
                paystackSubaccount: true,
                paystackRecipientCode: true,
                storeName: true,
                bankName: true,
                accountNumber: true
            }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        res.json({
            success: true,
            data: {
                storeName: store.storeName,
                hasBankDetails: !!(store.bankName && store.accountNumber),
                hasSubaccount: !!store.paystackSubaccount,
                hasRecipient: !!store.paystackRecipientCode,
                isFullySetup: !!(store.paystackSubaccount && store.paystackRecipientCode)
            }
        });

    } catch (error) {
        logger.error(`Paystack Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * POST /api/v1/seller/offers/send-discount-broadcast
 * 1. Auto-creates a 24hr promo code for the product(s)
 * 2. Sends a personal offer DM to the specific buyer
 * 3. Optionally broadcasts an in-app notification to other buyers
 *    who have the same products in their cart or wishlist
 */
router.post('/offers/send-discount-broadcast', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { buyerId, productIds, discount, note, broadcast = true } = req.body;

        if (!buyerId || !discount) {
            return res.status(400).json({ success: false, message: 'buyerId and discount are required' });
        }

        const notificationV2 = require('../services/notificationV2Service');
        const messagingService = require('../services/messagingService');

        // 1. Get seller's store
        const store = await prisma.store.findFirst({
            where: { sellerId: req.user.id },
            include: { user: { select: { fullName: true } } }
        });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        // 2. Get products being discounted
        const products = productIds && productIds.length > 0
            ? await prisma.product.findMany({ where: { id: { in: productIds }, storeId: store.id } })
            : await prisma.cartItem.findMany({
                where: { cart: { userId: buyerId }, product: { storeId: store.id } },
                include: { product: true }
              }).then(items => items.map(i => i.product));

        const uniqueProducts = [...new Map(products.map(p => [p.id, p])).values()];
        const productNames = uniqueProducts.map(p => p.title).join(', ');

        // 3. Generate a unique promo code
        const codeBase = `${store.storeName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}${discount}OFF`;
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const promoCode = `${codeBase}-${suffix}`;

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hrs from now

        // Create promo codes for each product (or one generic if no specific products)
        const createdCodes = [];
        if (uniqueProducts.length > 0) {
            for (const product of uniqueProducts) {
                const created = await prisma.promoCode.create({
                    data: {
                        code: uniqueProducts.length === 1 ? promoCode : `${codeBase}${product.title.replace(/\s+/g,'').toUpperCase().slice(0,4)}-${suffix}`,
                        description: `${discount}% off ${product.title} — 24hr flash deal from ${store.storeName}`,
                        sellerId: req.user.id,
                        discountType: 'PERCENTAGE',
                        discountValue: parseFloat(discount),
                        productId: product.id,
                        maxUses: null,
                        maxUsesPerUser: 1,
                        expiresAt,
                        isActive: true
                    }
                });
                createdCodes.push({ code: created.code, productTitle: product.title, productId: product.id });
            }
        } else {
            const created = await prisma.promoCode.create({
                data: {
                    code: promoCode,
                    description: `${discount}% discount from ${store.storeName} — 24hr flash deal`,
                    sellerId: req.user.id,
                    discountType: 'PERCENTAGE',
                    discountValue: parseFloat(discount),
                    maxUses: null,
                    maxUsesPerUser: 1,
                    expiresAt,
                    isActive: true
                }
            });
            createdCodes.push({ code: created.code, productTitle: 'all items', productId: null });
        }

        // 4. Send personal DM to the specific buyer
        const buyerUser = await prisma.user.findUnique({ where: { id: buyerId }, select: { fullName: true } });
        const firstName = buyerUser?.fullName?.split(' ')[0] || 'there';
        const codeDisplay = createdCodes.map(c => `• ${c.productTitle}: **${c.code}**`).join('\n');
        const offerText = `🎁 *Special Offer Just for You, ${firstName}!*\n\nI noticed you have items in your cart. Here's a *${discount}% discount* just for you:\n\n${codeDisplay}\n\n${note ? `📝 ${note}\n\n` : ''}⏰ Valid for **24 hours only**. Apply the code at checkout!\n\n🛒 Use it now: ${createdCodes[0]?.code}`;

        await messagingService.sendMessage({
            senderId: req.user.id,
            receiverId: buyerId,
            content: offerText
        });

        // 5. Broadcast to OTHER interested buyers if requested
        let broadcastCount = 0;
        if (broadcast && uniqueProducts.length > 0) {
            const productIdList = uniqueProducts.map(p => p.id);

            // Find all OTHER buyers who have these products in their cart
            const cartBuyers = await prisma.cartItem.findMany({
                where: {
                    productId: { in: productIdList },
                    cart: { userId: { not: buyerId } },
                    product: { storeId: store.id }
                },
                select: { cartId: true, cart: { select: { userId: true } } },
                distinct: ['cartId']
            });

            // Find all OTHER buyers who have these products in their wishlist
            let wishlistBuyers = [];
            if (prisma.wishlist) {
                wishlistBuyers = await prisma.wishlist.findMany({
                    where: {
                        productId: { in: productIdList },
                        buyerId: { not: buyerId }
                    },
                    select: { buyerId: true },
                    distinct: ['buyerId']
                }).catch(() => []);
            }

            const cartUserIds = cartBuyers.map(ci => ci.cart?.userId).filter(Boolean);
            const wishlistUserIds = wishlistBuyers.map(wi => wi.buyerId).filter(Boolean);
            const allOtherBuyerIds = [...new Set([...cartUserIds, ...wishlistUserIds])];

            if (allOtherBuyerIds.length > 0) {
                broadcastCount = allOtherBuyerIds.length;
                const broadcastProductName = uniqueProducts.length === 1
                    ? uniqueProducts[0].title
                    : productNames;

                // Notify each buyer
                await notificationV2.notifyMany(allOtherBuyerIds, {
                    type: 'FLASH_DEAL_ALERT',
                    title: `🔥 Flash Deal: ${discount}% Off on ${broadcastProductName}`,
                    body: `${store.storeName} is offering a limited ${discount}% discount on "${broadcastProductName}"! Use promo code **${createdCodes[0].code}** — valid for 24 hours only. Shop now!`,
                    linkUrl: `/shop`,
                    expiresAt,
                    metadata: {
                        storeId: store.id,
                        storeName: store.storeName,
                        discount,
                        promoCode: createdCodes[0].code,
                        productIds: productIdList,
                        expiresAt: expiresAt.toISOString()
                    }
                });
            }
        }

        logger.info(`[OFFER-BROADCAST] Seller ${req.user.id} sent ${discount}% offer to buyer ${buyerId}, broadcast to ${broadcastCount} others`);

        res.json({
            success: true,
            message: `Offer sent! Promo code created and ${broadcast ? `broadcast to ${broadcastCount} other interested buyers` : 'no broadcast'}.`,
            data: {
                promoCodes: createdCodes,
                expiresAt: expiresAt.toISOString(),
                broadcastCount
            }
        });

    } catch (error) {
        logger.error(`[OFFER-BROADCAST] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to send offer. Please try again.' });
    }
});

/**
 * GET /api/v1/seller/banning-status
 * Returns current store banning rate, risk tier, penalty incidents list, and cure suggestions
 */
router.get('/banning-status', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const sellerId = req.user.id;
        const status = await sellerBanningService.getBanningStatus(sellerId);
        res.json({ success: true, ...status });
    } catch (error) {
        logger.error(`[SELLER BANNING] Status error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

/**
 * GET /api/v1/seller/banning/causes
 * Returns official penalty cause matrix & recovery rules
 */
router.get('/banning/causes', (req, res) => {
    try {
        res.json({ success: true, causes: sellerBanningService.constructor ? require('../services/sellerBanningService').PENALTY_CAUSES || {} : {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/v1/seller/banning/cure
 * Verifies and cures eligible penalties when orders are packed or shipped
 */
router.post('/banning/cure', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { incidentId, orderId } = req.body;

        const result = await sellerBanningService.curePenalty({
            sellerId,
            incidentId,
            orderId
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error(`[SELLER BANNING] Cure error: ${error.message}`);
        res.status(400).json({ success: false, message: error.message || 'Could not cure penalty' });
    }
});

module.exports = router;
