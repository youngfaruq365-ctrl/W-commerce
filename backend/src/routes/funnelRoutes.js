const express = require('express');
const router = express.Router();
const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// POST /api/v1/funnel/signup-and-checkout
router.post('/signup-and-checkout', async (req, res) => {
    try {
        const { fullName, email, password, plan } = req.body;
        
        if (!fullName || !email || !password || !plan) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // 2. Hash password and create user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Auto-verify for funnel smoothness (we assume intent since they are about to pay)
        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                role: 'SELLER',
                isVerified: true, 
            }
        });

        // 3. Create Store shell
        await prisma.store.create({
            data: {
                sellerId: user.id,
                storeName: `${user.fullName}'s Shop`,
                description: 'Global marketplace merchant.',
                country: 'USA',
                isVerified: false,
                portfolioConfig: JSON.stringify({})
            }
        });

        // 4. Generate RevenueCat Web Billing checkout URL (only for paid plans)
        let checkoutUrl = null;
        if (plan !== 'Free') {
            const baseCheckoutUrl = process.env.REVENUECAT_WEB_CHECKOUT_URL;
            if (!baseCheckoutUrl) {
                logger.warn('REVENUECAT_WEB_CHECKOUT_URL not configured — paid plan checkout unavailable.');
                // Don't crash — let frontend handle the missing URL gracefully
            } else {
                // Note: RevenueCat appends the `app_user_id` to the end of the URL path to bind the purchase.
                // Format: https://pay.rev.cat/<paywall_ID>/<app_user_id>
                const cleanBaseUrl = baseCheckoutUrl.endsWith('/') ? baseCheckoutUrl.slice(0, -1) : baseCheckoutUrl;
                checkoutUrl = `${cleanBaseUrl}/${user.id}`;
            }
        }

        logger.info(`Funnel signup successful for ${email}. Plan: ${plan}. Has checkoutUrl: ${!!checkoutUrl}`);

        res.status(201).json({
            success: true,
            checkoutUrl,
            message: checkoutUrl ? 'Account created. Redirecting to payment...' : 'Account created successfully.'
        });

    } catch (error) {
        logger.error(`Funnel Signup Error: ${error.message}`);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error during funnel signup' });
    }
});

module.exports = router;
