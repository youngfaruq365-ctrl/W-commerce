const express = require('express');
const router = express.Router();
const prisma = require('../utils/prismaClient');
const { protect, authorize } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const apiClient = require('../utils/apiClient');

/**
 * GET /api/seller-plans
 * List all active seller plans (public)
 */
router.get('/', async (req, res) => {
    try {
        const plans = await prisma.sellerPlan.findMany({
            where: { isActive: true },
            include: {
                benefits: {
                    where: { storeId: null } // Only plan-level benefits (templates)
                }
            },
            orderBy: { visibilityWeight: 'desc' }
        });

        res.json({ success: true, plans });
    } catch (error) {
        logger.error(`Get Seller Plans Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load seller plans' });
    }
});

/**
 * GET /api/seller-plans/:id
 * Get a specific seller plan by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const plan = await prisma.sellerPlan.findUnique({
            where: { id: req.params.id },
            include: {
                benefits: {
                    where: { storeId: null }
                }
            }
        });

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.json({ success: true, plan });
    } catch (error) {
        logger.error(`Get Seller Plan Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load plan details' });
    }
});

/**
 * POST /api/seller-plans/subscribe
 * Subscribe the authenticated seller's store to a plan
 */
router.post('/subscribe', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json({ success: false, message: 'Plan ID is required' });
        }

        // Verify the plan exists and is active
        const plan = await prisma.sellerPlan.findUnique({
            where: { id: planId }
        });

        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
        }

        // Find the seller's store
        const store = await prisma.store.findUnique({
            where: { sellerId: req.user.id }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found. Please create a store first.' });
        }

        // Update store with the new plan
        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: {
                sellerPlanId: planId,
                sellerTier: plan.name.toUpperCase()
            },
            include: {
                sellerPlan: true
            }
        });

        logger.info(`Seller ${req.user.id} subscribed to plan: ${plan.name}`);

        res.json({
            success: true,
            message: `Successfully subscribed to ${plan.displayName}`,
            store: updatedStore
        });
    } catch (error) {
        logger.error(`Subscribe Plan Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to subscribe to plan' });
    }
});

/**
 * GET /api/seller-plans/my-plan
 * Get the current seller's active plan
 */
router.get('/my-plan', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const store = await prisma.store.findUnique({
            where: { sellerId: req.user.id },
            include: {
                sellerPlan: {
                    include: {
                        benefits: {
                            where: { storeId: null }
                        }
                    }
                },
                planBenefits: true
            }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        res.json({
            success: true,
            currentPlan: store.sellerPlan,
            storeTier: store.sellerTier,
            activeBenefits: store.planBenefits
        });
    } catch (error) {
        logger.error(`Get My Plan Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load plan info' });
    }
});

/**
 * POST /api/seller-plans/initiate-payment
 * Initiate subscription payment via Paystack
 */
router.post('/initiate-payment', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { planId, planName, isYearly, callback_url } = req.body;

        if (!planId && !planName) {
            return res.status(400).json({ success: false, message: 'Plan ID or Name is required' });
        }

        let plan = null;
        if (planId) {
            plan = await prisma.sellerPlan.findUnique({ where: { id: planId } });
        }
        
        if (!plan && planName) {
            plan = await prisma.sellerPlan.findFirst({ where: { name: planName } });
        }

        if (!plan && planName) {
            // Auto-create fallback plans if they don't exist in DB
            const basePrice = planName.toLowerCase() === 'ultra' ? 3000 : planName.toLowerCase() === 'pro' ? 1500 : 0;
            plan = await prisma.sellerPlan.create({
                data: {
                    name: planName,
                    displayName: planName,
                    monthlyPriceGong: basePrice,
                    isActive: true,
                }
            });
        }

        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
        }

        let store = await prisma.store.findUnique({
            where: { sellerId: req.user.id }
        });

        if (!store) {
            // Lazy initialize a store if the user is somehow missing one
            store = await prisma.store.create({
                data: {
                    sellerId: req.user.id,
                    storeName: `${req.user.fullName || 'User'}'s Store`,
                    description: 'Global marketplace merchant.',
                    country: 'USA'
                }
            });
        }

        let basePrice = Number(plan.monthlyPriceGong || 0);
        
        // Ensure basePrice is correct if DB was seeded with 0
        const nameLower = plan.name.toLowerCase();
        if (nameLower === 'premium') basePrice = 900;
        else if (nameLower === 'pro') basePrice = 1500;
        else if (nameLower === 'ultra') basePrice = 3000;
        else if (nameLower === 'pro ultra') basePrice = 5000;
        else if (nameLower === 'ultra1pro') basePrice = 7000;
        else if (nameLower === 'ultra2pro') basePrice = 9000;

        let price = basePrice;
        if (isYearly) {
            if (nameLower === 'premium') price = 6000;
            else if (nameLower === 'pro') price = 10000;
            else if (nameLower === 'ultra') price = 20000;
            else if (nameLower === 'pro ultra') price = 35000;
            else if (nameLower === 'ultra1pro') price = 45000;
            else if (nameLower === 'ultra2pro') price = 60000;
            else price = basePrice * 12 * 0.8;
        }

        if (price <= 0) {
            return res.status(400).json({ success: false, message: 'Free plans do not require payment.' });
        }

        const amount = Math.round(price * 100); // converting to kobo/cents

        const callbackUrl = callback_url || 'http://localhost:5173/seller/subscription';

        const response = await apiClient.paystack('/transaction/initialize', 'POST', {
            amount,
            email: req.user.email,
            callback_url: callbackUrl,
            metadata: {
                sellerId: req.user.id,
                storeId: store.id,
                planId: plan.id,
                isYearly: !!isYearly
            }
        });

        res.json({ success: true, authorization_url: response.data.authorization_url });
    } catch (error) {
        logger.error(`Initiate Payment Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
});

/**
 * GET /api/seller-plans/verify-payment/:reference
 * Verify Paystack payment and update subscription
 */
router.get('/verify-payment/:reference', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await apiClient.paystack(`/transaction/verify/${reference}`, 'GET');

        if (response.data && response.data.status === 'success') {
            const store = await prisma.store.findUnique({
                where: { sellerId: req.user.id }
            });

            if (!store) {
                return res.status(404).json({ success: false, message: 'Store not found' });
            }

            const metadata = response.data.metadata || {};
            const planId = metadata.planId;

            if (planId) {
                const plan = await prisma.sellerPlan.findUnique({
                    where: { id: planId }
                });

                if (plan) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            sellerPlanId: plan.id,
                            sellerTier: plan.name.toUpperCase()
                        }
                    });

                    await prisma.user.update({
                        where: { id: req.user.id },
                        data: {
                            subscriptionTier: plan.name.toUpperCase(),
                            hasPaidAccess: true
                        }
                    });
                }
            }

            return res.json({ success: true, message: 'Payment verified successfully.' });
        }

        res.status(400).json({ success: false, message: 'Payment verification failed.' });
    } catch (error) {
        logger.error(`Verify Payment Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error verifying payment' });
    }
});

module.exports = router;

