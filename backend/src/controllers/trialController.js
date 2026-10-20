/**
 * Trial Controller - 6-Month Free Trial Feature
 * Handles trial signup, activation, status checking, expiration, and conversion
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// Trial configuration
const TRIAL_DURATION_DAYS = 180; // 6 months
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate trial end date from start date
 */
function calculateTrialEndDate(startDate = new Date()) {
    return new Date(startDate.getTime() + TRIAL_DURATION_MS);
}

/**
 * Check if trial is still active
 */
function isTrialActive(trialEndDate) {
    if (!trialEndDate) return false;
    return new Date() < new Date(trialEndDate);
}

/**
 * Send trial-related email (placeholder - uses existing email service)
 */
async function sendTrialEmail(to, type, data) {
    const emailService = require('../services/emailService');
    const templates = {
        welcome: {
            subject: 'Welcome to Your 6-Month Free Trial!',
            html: `<h1>Welcome to Your Free Trial!</h1>
                   <p>Dear ${data.fullName},</p>
                   <p>Your 6-month free trial has been activated. Here's what you get:</p>
                   <ul>
                       <li>Full access to all premium features</li>
                       <li>Unlimited product listings</li>
                       <li>Priority customer support</li>
                       <li>Advanced analytics</li>
                   </ul>
                   <p><strong>Trial End Date:</strong> ${data.trialEndDate.toLocaleDateString()}</p>
                   <p>Don't miss out - convert to a paid plan before your trial ends to continue enjoying these benefits!</p>`
        },
        expirationWarning: {
            subject: 'Your Trial Ends Soon - Don\'t Miss Out!',
            html: `<h1>Your Trial Ends Soon!</h1>
                   <p>Dear ${data.fullName},</p>
                   <p>Your 6-month free trial will expire on <strong>${data.trialEndDate.toLocaleDateString()}</strong>.</p>
                   <p>Convert to a paid plan now to continue enjoying:</p>
                   <ul>
                       <li>Unlimited product listings</li>
                       <li>Priority customer support</li>
                       <li>Advanced analytics</li>
                   </ul>
                   <p><a href="${data.convertUrl}">Convert Now</a></p>`
        },
        expired: {
            subject: 'Your Trial Has Expired',
            html: `<h1>Your Trial Has Expired</h1>
                   <p>Dear ${data.fullName},</p>
                   <p>Your 6-month free trial has ended. To continue using premium features, please convert to a paid plan.</p>
                   <p><a href="${data.upgradeUrl}">View Plans</a></p>`
        },
        converted: {
            subject: 'Welcome to Premium - Trial Converted!',
            html: `<h1>Welcome to Premium!</h1>
                   <p>Dear ${data.fullName},</p>
                   <p>Thank you for converting from trial to paid subscription!</p>
                   <p>Your subscription: ${data.plan} (${data.billingCycle})</p>
                   <p>Starting from: ${data.startDate.toLocaleDateString()}</p>`
        }
    };

    const template = templates[type];
    if (template) {
        try {
            await emailService.sendEmail({
                to,
                subject: template.subject,
                html: template.html
            });
            return true;
        } catch (error) {
            logger.error(`Trial email send failed: ${error.message}`);
            return false;
        }
    }
    return false;
}

// ============================================
// API Endpoints
// ============================================

/**
 * POST /api/trial/signup
 * Start a new 6-month free trial
 * Requires authentication
 */
exports.startTrial = async (req, res) => {
    try {
        const userId = req.user.id;
        const { promoCode } = req.body;

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has an active trial
        if (user.isTrialActive && user.trialStatus === 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: 'You already have an active trial',
                trialEndDate: user.trialEndDate
            });
        }

        // Check if user has ever had a trial before (one trial per user)
        if (user.trialStatus && user.trialStatus !== 'NONE') {
            return res.status(400).json({
                success: false,
                message: 'You have already used your free trial',
                trialStatus: user.trialStatus
            });
        }

        // Check if user already has paid access
        if (user.hasPaidAccess) {
            return res.status(400).json({
                success: false,
                message: 'You already have a paid subscription'
            });
        }

        // Start the trial
        const trialStartDate = new Date();
        const trialEndDate = calculateTrialEndDate(trialStartDate);

        // Update user with trial info
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                trialStartDate,
                trialEndDate,
                trialStatus: 'ACTIVE',
                isTrialActive: true,
                hasPaidAccess: true, // Trial users get full access
                subscriptionTier: 'TRIAL',
                accessExpiry: trialEndDate,
                trialPromoCode: promoCode || null
            }
        });

        // Send welcome email
        sendTrialEmail(user.email, 'welcome', {
            fullName: user.fullName,
            trialEndDate
        }).catch(() => {});

        logger.info(`Trial started for user ${user.email}, ends ${trialEndDate}`);

        res.status(200).json({
            success: true,
            message: '6-month free trial activated!',
            trial: {
                startDate: trialStartDate,
                endDate: trialEndDate,
                status: 'ACTIVE',
                daysRemaining: TRIAL_DURATION_DAYS
            },
            access: {
                hasPaidAccess: true,
                subscriptionTier: 'TRIAL'
            }
        });

    } catch (error) {
        logger.error(`Trial signup error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to start trial'
        });
    }
};

/**
 * GET /api/trial/status
 * Get current trial status
 * Requires authentication
 */
exports.getTrialStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                trialStartDate: true,
                trialEndDate: true,
                trialStatus: true,
                isTrialActive: true,
                hasPaidAccess: true,
                subscriptionTier: true,
                accessExpiry: true,
                trialConversionDate: true,
                trialPlan: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate days remaining
        let daysRemaining = 0;
        if (user.trialEndDate && user.isTrialActive) {
            const now = new Date();
            const end = new Date(user.trialEndDate);
            daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        }

        // Check if trial just expired
        if (user.trialStatus === 'ACTIVE' && user.trialEndDate && new Date() > user.trialEndDate) {
            // Auto-update expired trial
            await prisma.user.update({
                where: { id: userId },
                data: {
                    trialStatus: 'EXPIRED',
                    isTrialActive: false,
                    hasPaidAccess: false,
                    subscriptionTier: 'NONE'
                }
            });

            user.trialStatus = 'EXPIRED';
            user.isTrialActive = false;
            user.hasPaidAccess = false;
            user.subscriptionTier = 'NONE';
            daysRemaining = 0;
        }

        res.status(200).json({
            success: true,
            trial: {
                hasTrial: user.trialStatus !== 'NONE' && user.trialStatus !== null,
                status: user.trialStatus || 'NONE',
                startDate: user.trialStartDate,
                endDate: user.trialEndDate,
                daysRemaining,
                isActive: user.isTrialActive,
                convertedToPaid: user.trialStatus === 'CONVERTED',
                conversionDate: user.trialConversionDate,
                planDuringTrial: user.trialPlan
            },
            access: {
                hasPaidAccess: user.hasPaidAccess,
                subscriptionTier: user.subscriptionTier,
                accessExpiry: user.accessExpiry
            }
        });

    } catch (error) {
        logger.error(`Get trial status error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get trial status'
        });
    }
};

/**
 * POST /api/trial/convert
 * Convert trial to paid subscription
 * Requires authentication
 */
exports.convertToPaid = async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan, billingCycle } = req.body; // MONTHLY or YEARLY

        // Validate plan
        if (!plan || !['MONTHLY', 'YEARLY'].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan. Use MONTHLY or YEARLY'
            });
        }

        if (!billingCycle || !['MONTHLY', 'YEARLY'].includes(billingCycle)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid billing cycle. Use MONTHLY or YEARLY'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user has an active trial
        if (!user.isTrialActive || user.trialStatus !== 'ACTIVE') {
            // Allow conversion even if trial expired (for reactivation)
            if (user.trialStatus === 'EXPIRED' || user.trialStatus === 'NONE') {
                // Create new subscription - but this is handled by payment flow
                return res.status(400).json({
                    success: false,
                    message: 'No active trial to convert. Please subscribe directly.',
                    requiresPayment: true
                });
            }
        }

        // === PAYMENT VERIFICATION REQUIRED ===
        // Trial conversion must be backed by a real payment transaction
        const { paymentRef } = req.body;
        if (!paymentRef) {
            return res.status(400).json({
                success: false,
                message: 'Payment reference is required to convert trial to paid subscription.',
                requiresPayment: true
            });
        }

        // Verify the payment is real via Paystack
        const apiClient = require('../utils/apiClient');
        let paymentVerified = false;
        let paidAmount = 0;
        try {
            const verification = await apiClient.paystack(`/transaction/verify/${paymentRef}`, 'GET');
            if (verification.data && verification.data.status === 'success') {
                paymentVerified = true;
                paidAmount = verification.data.amount / 100; // kobo to naira
            }
        } catch (verifyErr) {
            logger.error(`Trial conversion payment verification failed: ${verifyErr.message}`);
        }

        if (!paymentVerified) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Please complete payment first.',
                requiresPayment: true
            });
        }

        // Calculate subscription period
        const startDate = new Date();
        let endDate;
        
        if (billingCycle === 'MONTHLY') {
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // Update user to paid subscription (payment verified above)
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                hasPaidAccess: true,
                subscriptionTier: plan,
                accessExpiry: endDate,
                // Update trial status
                trialStatus: 'CONVERTED',
                trialConversionDate: new Date(),
                trialPlan: plan,
                isTrialActive: false
            }
        });

        // Send conversion confirmation email
        sendTrialEmail(user.email, 'converted', {
            fullName: user.fullName,
            plan,
            billingCycle,
            startDate
        }).catch(() => {});

        logger.info(`Trial converted to paid for user ${user.email}, plan: ${plan}`);

        res.status(200).json({
            success: true,
            message: 'Successfully converted to paid subscription!',
            subscription: {
                plan,
                billingCycle,
                startDate,
                endDate,
                hasPaidAccess: true
            }
        });

    } catch (error) {
        logger.error(`Trial convert error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to convert trial'
        });
    }
};

/**
 * POST /api/trial/cancel
 * Cancel the trial (user chooses to not continue)
 * Requires authentication
 */
exports.cancelTrial = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isTrialActive || user.trialStatus !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: 'No active trial to cancel'
            });
        }

        // Cancel the trial - but keep access until end date
        await prisma.user.update({
            where: { id: userId },
            data: {
                trialStatus: 'CANCELLED'
            }
        });

        logger.info(`Trial cancelled for user ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'Trial cancelled. You will retain access until ' + user.trialEndDate.toLocaleDateString(),
            trialEndDate: user.trialEndDate
        });

    } catch (error) {
        logger.error(`Trial cancel error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel trial'
        });
    }
};

/**
 * POST /api/trial/check-expiration
 * Admin endpoint to check and process expired trials
 * Called by cron job
 */
exports.checkTrialExpiration = async (req, res) => {
    try {
        const now = new Date();

        // Find all active trials that have expired
        const expiredTrials = await prisma.user.findMany({
            where: {
                trialStatus: 'ACTIVE',
                isTrialActive: true,
                trialEndDate: {
                    lt: now
                }
            }
        });

        if (expiredTrials.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No expired trials found',
                processed: 0
            });
        }

        // Process each expired trial
        const processed = [];
        for (const user of expiredTrials) {
            // Check if user has already converted to paid
            const currentUser = await prisma.user.findUnique({
                where: { id: user.id }
            });

            if (currentUser.hasPaidAccess && currentUser.subscriptionTier !== 'TRIAL') {
                // User already has paid access, just update trial status
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        trialStatus: 'CONVERTED',
                        isTrialActive: false
                    }
                });
            } else {
                // User doesn't have paid access, expire their trial
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        trialStatus: 'EXPIRED',
                        isTrialActive: false,
                        hasPaidAccess: false,
                        subscriptionTier: 'NONE'
                    }
                });

                // Send expiration email
                sendTrialEmail(user.email, 'expired', {
                    fullName: user.fullName,
                    upgradeUrl: process.env.FRONTEND_URL + '/access-fee.html'
                }).catch(() => {});

                processed.push(user.email);
            }
        }

        logger.info(`Processed ${expiredTrials.length} expired trials`);

        res.status(200).json({
            success: true,
            message: `Processed ${expiredTrials.length} expired trials`,
            processed: expiredTrials.length,
            expiredUsers: processed
        });

    } catch (error) {
        logger.error(`Check trial expiration error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to check trial expiration'
        });
    }
};

/**
 * GET /api/trial/warning-notifications
 * Send warning emails to users whose trial ends in X days
 * Called by cron job (e.g., 7 days before expiration)
 */
exports.sendExpirationWarnings = async (req, res) => {
    try {
        const { daysBeforeExpiration = 7 } = req.query;
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + parseInt(daysBeforeExpiration));

        // Find trials ending within the warning window
        const usersToWarn = await prisma.user.findMany({
            where: {
                trialStatus: 'ACTIVE',
                isTrialActive: true,
                trialEndDate: {
                    gte: new Date(),
                    lte: warningDate
                }
            }
        });

        if (usersToWarn.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No users to warn',
                warned: 0
            });
        }

        // Send warning emails
        const warned = [];
        for (const user of usersToWarn) {
            const daysRemaining = Math.ceil((new Date(user.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            await sendTrialEmail(user.email, 'expirationWarning', {
                fullName: user.fullName,
                trialEndDate: new Date(user.trialEndDate),
                convertUrl: process.env.FRONTEND_URL + '/access-fee.html?convert=true'
            });

            warned.push(user.email);
        }

        logger.info(`Sent ${warned.length} trial expiration warnings`);

        res.status(200).json({
            success: true,
            message: `Sent ${warned.length} expiration warnings`,
            warned: warned.length,
            users: warned
        });

    } catch (error) {
        logger.error(`Send expiration warnings error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to send expiration warnings'
        });
    }
};

/**
 * GET /api/trial/admin/stats
 * Get trial statistics (admin only)
 */
exports.getTrialStats = async (req, res) => {
    try {
        // Count trials by status
        const [active, expired, converted, cancelled, neverUsed] = await Promise.all([
            prisma.user.count({
                where: { trialStatus: 'ACTIVE' }
            }),
            prisma.user.count({
                where: { trialStatus: 'EXPIRED' }
            }),
            prisma.user.count({
                where: { trialStatus: 'CONVERTED' }
            }),
            prisma.user.count({
                where: { trialStatus: 'CANCELLED' }
            }),
            prisma.user.count({
                where: {
                    OR: [
                        { trialStatus: null },
                        { trialStatus: 'NONE' }
                    ]
                }
            })
        ]);

        // Get users currently on trial with access
        const trialUsersWithAccess = await prisma.user.findMany({
            where: {
                trialStatus: 'ACTIVE',
                isTrialActive: true
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                trialStartDate: true,
                trialEndDate: true
            }
        });

        // Calculate average trial duration for converted users
        const convertedUsers = await prisma.user.findMany({
            where: {
                trialStatus: 'CONVERTED',
                trialStartDate: { not: null },
                trialConversionDate: { not: null }
            },
            select: {
                trialStartDate: true,
                trialConversionDate: true
            }
        });

        let avgDuration = 0;
        if (convertedUsers.length > 0) {
            const totalDays = convertedUsers.reduce((sum, u) => {
                const start = new Date(u.trialStartDate);
                const end = new Date(u.trialConversionDate);
                return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }, 0);
            avgDuration = Math.round(totalDays / convertedUsers.length);
        }

        res.status(200).json({
            success: true,
            stats: {
                active,
                expired,
                converted,
                cancelled,
                neverUsed,
                total: active + expired + converted + cancelled,
                conversionRate: converted / (converted + expired) * 100 || 0,
                averageTrialDuration: avgDuration
            },
            activeTrials: trialUsersWithAccess
        });

    } catch (error) {
        logger.error(`Get trial stats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get trial statistics'
        });
    }
};

// ============================================
// Trial-specific Middleware/Utilities
// ============================================

/**
 * Check if user has trial access (used by auth middleware)
 */
exports.hasTrialAccess = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                isTrialActive: true,
                trialStatus: true,
                trialEndDate: true,
                hasPaidAccess: true,
                subscriptionTier: true
            }
        });

        if (!user) return { hasAccess: false, reason: 'user_not_found' };

        // Check if trial is active
        if (user.isTrialActive && user.trialStatus === 'ACTIVE' && user.trialEndDate) {
            if (new Date() < new Date(user.trialEndDate)) {
                return { 
                    hasAccess: true, 
                    accessType: 'trial',
                    tier: user.subscriptionTier 
                };
            }
        }

        // Check if user has paid access
        if (user.hasPaidAccess && user.subscriptionTier !== 'TRIAL') {
            return { 
                hasAccess: true, 
                accessType: 'paid',
                tier: user.subscriptionTier 
            };
        }

        return { 
            hasAccess: false, 
            reason: user.trialStatus === 'EXPIRED' ? 'trial_expired' : 'no_access' 
        };
    } catch (error) {
        logger.error(`hasTrialAccess Error: ${error.message}`);
        return { hasAccess: false, reason: 'error_occurred' };
    }
};

module.exports = exports;
