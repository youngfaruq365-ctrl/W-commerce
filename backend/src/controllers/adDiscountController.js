const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

exports.getMyAdSessions = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const now = new Date();
        const sessions = await prisma.adDiscountSession.findMany({
            where: {
                buyerId,
                currentDiscountPct: { gt: 0 },
                OR: [
                    { expiresAt: { gt: now } },
                    { expiresAt: null }
                ]
            }
        });
        res.json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAdDiscountStatus = async (req, res) => {
    try {
        const { productId } = req.params;
        const buyerId = req.user.id;

        const session = await prisma.adDiscountSession.findUnique({
            where: {
                buyerId_productId: {
                    buyerId,
                    productId
                }
            }
        });

        if (!session) {
            return res.json({ success: true, session: null });
        }

        // Check if expired
        if (session.expiresAt && session.expiresAt < new Date()) {
            return res.json({ success: true, session: { ...session, isExpired: true } });
        }

        res.json({ success: true, session });
    } catch (error) {
        logger.error(`Get Ad Discount Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.claimAdDiscount = async (req, res) => {
    try {
        const { productId } = req.params;
        const buyerId = req.user.id;

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product || !product.isAdBoosted) {
            return res.status(400).json({ success: false, message: 'Product is not eligible for ad discounts' });
        }

        let session = await prisma.adDiscountSession.findUnique({
            where: {
                buyerId_productId: {
                    buyerId,
                    productId
                }
            }
        });

        const now = new Date();

        if (session) {
            if (session.isCompleted) {
                return res.status(400).json({ success: false, message: 'You have already claimed the maximum discount for this product.' });
            }
            if (session.expiresAt && session.expiresAt < now) {
                // Reset if expired
                session = await prisma.adDiscountSession.update({
                    where: { id: session.id },
                    data: {
                        currentStage: 0,
                        currentDiscountPct: 0,
                        nextClaimAvailableAt: null,
                        expiresAt: null,
                        isCompleted: false
                    }
                });
            } else if (session.nextClaimAvailableAt && session.nextClaimAvailableAt > now) {
                return res.status(400).json({ success: false, message: 'Please wait for the timer to finish before claiming the next discount.' });
            }
        } else {
            session = await prisma.adDiscountSession.create({
                data: {
                    buyerId,
                    productId,
                    currentStage: 0,
                    currentDiscountPct: 0
                }
            });
        }

        // Advance to next stage
        let nextStage = session.currentStage + 1;
        let newDiscount = 0;
        let nextAvailableAt = null;
        let isCompleted = false;
        let expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours to use the discount

        if (nextStage === 1) {
            newDiscount = 2; // First claim: 2%
            nextAvailableAt = new Date(now.getTime() + 20 * 60 * 1000); // 20 mins
        } else if (nextStage === 2) {
            newDiscount = 4; // Second claim: +2% (total 4%)
            nextAvailableAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins
        } else if (nextStage >= 3) {
            newDiscount = 5; // Final claim: +1% (total 5%)
            nextAvailableAt = null;
            isCompleted = true;
        }

        const updatedSession = await prisma.adDiscountSession.update({
            where: { id: session.id },
            data: {
                currentStage: nextStage,
                currentDiscountPct: newDiscount,
                nextClaimAvailableAt: nextAvailableAt,
                isCompleted,
                expiresAt
            }
        });

        // Trigger OneSignal Push Notification scheduling (stub)
        if (nextAvailableAt) {
            logger.info(`Scheduling OneSignal notification for buyer ${buyerId} at ${nextAvailableAt}`);
        }

        res.json({
            success: true,
            message: `Successfully claimed ${newDiscount}% discount!`,
            session: updatedSession
        });

    } catch (error) {
        logger.error(`Claim Ad Discount Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
