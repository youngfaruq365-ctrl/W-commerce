const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// Create a new promo code (Seller only)
exports.createPromoCode = async (req, res) => {
    try {
        const { 
            code, 
            description, 
            discountType, 
            discountValue, 
            productId,
            maxUses, 
            maxUsesPerUser,
            expiresAt 
        } = req.body;

        if (!code || !discountType || !discountValue) {
            return res.status(400).json({ success: false, message: 'Code, discount type, and discount value are required' });
        }

        if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
            return res.status(400).json({ success: false, message: 'Discount type must be PERCENTAGE or FIXED' });
        }

        const value = parseFloat(discountValue);
        if (isNaN(value) || value <= 0) {
            return res.status(400).json({ success: false, message: 'Discount value must be a positive number' });
        }

        if (discountType === 'PERCENTAGE' && value > 100) {
            return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' });
        }

        const store = await prisma.store.findUnique({ where: { sellerId: req.user.id } });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found. Please create a store first.' });
        }

        const existingCode = await prisma.promoCode.findFirst({ where: { code: code.toUpperCase() } });
        if (existingCode) {
            return res.status(400).json({ success: false, message: 'This promo code already exists' });
        }

        if (productId) {
            const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
            if (!product) {
                return res.status(400).json({ success: false, message: 'Product not found or does not belong to your store' });
            }
        }

        const promoCode = await prisma.promoCode.create({
            data: {
                code: code.toUpperCase(),
                description,
                sellerId: req.user.id,
                discountType,
                discountValue: value,
                productId: productId || null,
                maxUses: maxUses ? parseInt(maxUses) : null,
                maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : 1,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: true
            }
        });

        logger.info(`[PROMO] Seller ${req.user.id} created promo code: ${promoCode.code}`);

        res.status(201).json({
            success: true,
            message: 'Promo code created successfully',
            promoCode: {
                id: promoCode.id,
                code: promoCode.code,
                discountType: promoCode.discountType,
                discountValue: promoCode.discountValue,
                productId: promoCode.productId,
                maxUses: promoCode.maxUses,
                usedCount: promoCode.usedCount,
                maxUsesPerUser: promoCode.maxUsesPerUser,
                expiresAt: promoCode.expiresAt,
                isActive: promoCode.isActive
            }
        });
    } catch (error) {
        logger.error(`Create Promo Code Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all promo codes for seller store
exports.getSellerPromoCodes = async (req, res) => {
    try {
        const store = await prisma.store.findUnique({ where: { sellerId: req.user.id } });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const promoCodes = await prisma.promoCode.findMany({
            where: { sellerId: req.user.id },
            include: { product: { select: { id: true, title: true, price: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, promoCodes });
    } catch (error) {
        logger.error(`Get Promo Codes Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update a promo code
exports.updatePromoCode = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, discountType, discountValue, productId, maxUses, maxUsesPerUser, expiresAt, isActive } = req.body;

        const promoCode = await prisma.promoCode.findFirst({ where: { id, sellerId: req.user.id } });
        if (!promoCode) {
            return res.status(404).json({ success: false, message: 'Promo code not found' });
        }

        let value = discountValue ? parseFloat(discountValue) : undefined;
        if (value !== undefined && (isNaN(value) || value <= 0)) {
            return res.status(400).json({ success: false, message: 'Discount value must be a positive number' });
        }

        if (discountType === 'PERCENTAGE' && value > 100) {
            return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' });
        }

        if (productId !== undefined && productId) {
            const store = await prisma.store.findUnique({ where: { sellerId: req.user.id } });
            const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
            if (!product) {
                return res.status(400).json({ success: false, message: 'Product not found or does not belong to your store' });
            }
        }

        const updatedPromoCode = await prisma.promoCode.update({
            where: { id },
            data: {
                ...(description !== undefined && { description }),
                ...(discountType !== undefined && { discountType }),
                ...(value !== undefined && { discountValue: value }),
                ...(productId !== undefined && { productId: productId || null }),
                ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
                ...(maxUsesPerUser !== undefined && { maxUsesPerUser: parseInt(maxUsesPerUser) }),
                ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
                ...(isActive !== undefined && { isActive })
            }
        });

        logger.info(`[PROMO] Seller ${req.user.id} updated promo code: ${updatedPromoCode.code}`);
        res.json({ success: true, message: 'Promo code updated successfully', promoCode: updatedPromoCode });
    } catch (error) {
        logger.error(`Update Promo Code Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a promo code
exports.deletePromoCode = async (req, res) => {
    try {
        const { id } = req.params;
        const promoCode = await prisma.promoCode.findFirst({ where: { id, sellerId: req.user.id } });
        if (!promoCode) {
            return res.status(404).json({ success: false, message: 'Promo code not found' });
        }
        await prisma.promoCode.delete({ where: { id } });
        logger.info(`[PROMO] Seller ${req.user.id} deleted promo code: ${promoCode.code}`);
        res.json({ success: true, message: 'Promo code deleted successfully' });
    } catch (error) {
        logger.error(`Delete Promo Code Error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Validate and apply promo code (Customer checkout)
exports.validatePromoCode = async (req, res) => {
    try {
        const { code, productId, productIds, orderTotal } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Promo code is required' });
        }

        const promoCode = await prisma.promoCode.findFirst({ where: { code: code.toUpperCase() } });

        if (!promoCode) {
            return res.status(400).json({ success: false, message: 'Invalid promo code' });
        }

        if (!promoCode.isActive) {
            return res.status(400).json({ success: false, message: 'This promo code is no longer active' });
        }

        if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'This promo code has expired' });
        }

        if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
            return res.status(400).json({ success: false, message: 'This promo code has reached its maximum usage limit' });
        }

        // Support single productId or array of productIds in cart
        const cartProductIds = Array.isArray(productIds) ? productIds.map(String) : (productId ? [String(productId)] : []);
        if (promoCode.productId && cartProductIds.length > 0 && !cartProductIds.includes(String(promoCode.productId))) {
            return res.status(400).json({ success: false, message: 'This promo code is only valid for its specific negotiated product' });
        }

        if (req.user && promoCode.maxUsesPerUser) {
            const userUsage = await prisma.promoCodeUsage.count({
                where: { promoCodeId: promoCode.id, userId: req.user.id }
            });
            if (userUsage >= promoCode.maxUsesPerUser) {
                return res.status(400).json({ success: false, message: 'You have already used this promo code' });
            }
        }

        let discount = 0;
        const total = parseFloat(orderTotal) || 0;

        if (promoCode.discountType === 'PERCENTAGE') {
            discount = (total * parseFloat(promoCode.discountValue)) / 100;
        } else {
            discount = Math.min(parseFloat(promoCode.discountValue), total);
        }

        res.json({
            success: true,
            message: 'Promo code applied successfully',
            discount: discount.toFixed(2),
            promoCode: {
                id: promoCode.id,
                code: promoCode.code,
                description: promoCode.description,
                productId: promoCode.productId,
                sellerId: promoCode.sellerId,
                discountType: promoCode.discountType,
                discountValue: parseFloat(promoCode.discountValue),
                expiresAt: promoCode.expiresAt
            }
        });
    } catch (error) {
        logger.error(`Validate Promo Code Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Record promo code usage (after order completion)
exports.usePromoCode = async (req, res) => {
    try {
        const { promoCodeId, userId, orderId, discountApplied } = req.body;

        if (!promoCodeId || !userId || !orderId) {
            return res.status(400).json({ success: false, message: 'Promo code ID, user ID, and order ID are required' });
        }

        const promoCode = await prisma.promoCode.findUnique({ where: { id: promoCodeId } });
        if (!promoCode) {
            return res.status(404).json({ success: false, message: 'Promo code not found' });
        }

        await prisma.promoCodeUsage.create({
            data: { promoCodeId, userId, orderId, discountApplied: parseFloat(discountApplied) || 0 }
        });

        await prisma.promoCode.update({
            where: { id: promoCodeId },
            data: { usedCount: { increment: 1 } }
        });

        logger.info(`[PROMO] Promo code ${promoCode.code} used by user ${userId} for order ${orderId}`);
        res.json({ success: true, message: 'Promo code usage recorded' });
    } catch (error) {
        logger.error(`Use Promo Code Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get promo code usage stats for seller
exports.getPromoCodeStats = async (req, res) => {
    try {
        const { id } = req.params;

        const promoCode = await prisma.promoCode.findFirst({
            where: { id, sellerId: req.user.id },
            include: {
                usages: {
                    include: { user: { select: { id: true, fullName: true, email: true } } },
                    orderBy: { usedAt: 'desc' },
                    take: 50
                }
            }
        });

        if (!promoCode) {
            return res.status(404).json({ success: false, message: 'Promo code not found' });
        }

        const totalDiscountGiven = promoCode.usages.reduce((sum, u) => sum + parseFloat(u.discountApplied), 0);
        const uniqueUsers = new Set(promoCode.usages.map(u => u.userId)).size;

        res.json({
            success: true,
            stats: {
                code: promoCode.code,
                isActive: promoCode.isActive,
                usedCount: promoCode.usedCount,
                maxUses: promoCode.maxUses,
                uniqueUsers,
                totalDiscountGiven: totalDiscountGiven.toFixed(2),
                expiresAt: promoCode.expiresAt,
                recentUsages: promoCode.usages
            }
        });
    } catch (error) {
        logger.error(`Get Promo Code Stats Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Public: Get active promo codes for a seller
const getPublicPromoCodes = async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const now = new Date();
        const promos = await prisma.promoCode.findMany({
            where: {
                sellerId: sellerId,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: now } }
                ]
            },
            select: { id: true, code: true, discountType: true, discountValue: true, expiresAt: true }
        });
        res.json({ success: true, data: promos });
    } catch (error) {
        logger.error(`getPublicPromoCodes error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports.getPublicPromoCodes = getPublicPromoCodes;
