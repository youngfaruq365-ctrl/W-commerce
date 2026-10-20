const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const redisManager = require('../utils/redisManager');
const { getJwtSecret } = require('../utils/jwtSecret');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    // 1. Check Authorization Header (Priority for explicit API clients)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Check Cookies (Fallback for web navigations)
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            // Verify token
            const decoded = jwt.verify(token, getJwtSecret());

            // Check if token exists and is active in userSession
            let session = await prisma.userSession.findFirst({
                where: { token, isActive: true, expiresAt: { gt: new Date() } }
            });
            if (!session && decoded && decoded.id) {
                // Auto-heal session for cryptographically valid token if user exists in DB
                try {
                    const existingUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true } });
                    if (existingUser) {
                        session = await prisma.userSession.create({
                            data: {
                                userId: existingUser.id,
                                token,
                                userAgent: req.headers['user-agent'] || 'Browser',
                                ipAddress: req.ip || '127.0.0.1',
                                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                isActive: true
                            }
                        }).catch(() => null);
                    }
                } catch (e) {
                    // ignore
                }
            }
            if (!session) {
                return res.status(401).json({ success: false, message: 'Session expired or revoked' });
            }

            // Get user fresh from DB (ensures instant reflection of tier upgrades & role changes)
            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { 
                    id: true, 
                    fullName: true, 
                    email: true,
                    phone: true,
                    avatarUrl: true,
                    role: true, 
                    hasPaidAccess: true, 
                    subscriptionTier: true, 
                    accessExpiry: true,
                    trialStartDate: true,
                    trialEndDate: true,
                    trialStatus: true,
                    isTrialActive: true,
                    isVerified: true,
                    kycTier: true,
                    isFlagged: true
                }
            });

            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User no longer exists' });
            }

            if (req.user.isFlagged) {
                return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
            }

            // Check Trial Expiration (async - don't block request)
            if (req.user.isTrialActive && req.user.trialStatus === 'ACTIVE' && req.user.trialEndDate) {
                const now = new Date();
                const trialEnd = new Date(req.user.trialEndDate);
                
                if (now > trialEnd) {
                    // Trial expired - update asynchronously in background
                    prisma.user.update({
                        where: { id: req.user.id },
                        data: { 
                            trialStatus: 'EXPIRED',
                            isTrialActive: false,
                            hasPaidAccess: false,
                            subscriptionTier: 'NONE'
                        }
                    }).catch(err => logger.error('[Trial Expiration] DB update failed:', err));
                    
                    req.user.isTrialActive = false;
                    req.user.trialStatus = 'EXPIRED';
                    req.user.hasPaidAccess = false;
                    req.user.subscriptionTier = 'NONE';
                }
            }

            // Check Access Expiry (for paid subscriptions) - async
            if (req.user.hasPaidAccess && req.user.accessExpiry && new Date() > new Date(req.user.accessExpiry)) {
                prisma.user.update({
                    where: { id: req.user.id },
                    data: { hasPaidAccess: false, subscriptionTier: 'NONE' }
                }).catch(err => logger.error('[Access Expiry] DB update failed:', err));
                
                req.user.hasPaidAccess = false;
                req.user.subscriptionTier = 'NONE';
            }

            next();
        } catch (error) {
            logger.error('Auth Error: ' + error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Session expired, please login again',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
    } else {
        logger.debug(`No Token for ${req.originalUrl}`);
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const requireTier = (requiredTier) => {
    return (req, res, next) => {
        // Admins bypass
        if (req.user.role === 'ADMIN') return next();

        // Trial users have limited tier access - treat as TRIAL tier
        const tiers = { 'NONE': 0, 'TRIAL': 1, 'MONTHLY': 2, 'YEARLY': 3 };
        
        // For TRIAL tier requirement, check if user has active trial
        if (requiredTier === 'TRIAL') {
            if (req.user.isTrialActive && req.user.trialStatus === 'ACTIVE') {
                return next();
            }
            // Also allow paid users
            if (req.user.hasPaidAccess && req.user.subscriptionTier !== 'TRIAL') {
                return next();
            }
        }
        
        // For higher tiers (MONTHLY, YEARLY), trial doesn't qualify
        const userTierValue = tiers[req.user.subscriptionTier] || 0;
        const requiredTierValue = tiers[requiredTier] || 0;

        if (userTierValue < requiredTierValue) {
            return res.status(402).json({
                success: false,
                message: `Premium access required (${requiredTier} Tier).`,
                requiresPayment: true,
                requiredTier: requiredTier,
                currentTier: req.user.subscriptionTier,
                isTrial: req.user.trialStatus === 'ACTIVE'
            });
        }
        next();
    };
};


const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

const requirePaidAccess = async (req, res, next) => {
    // Allows admins to bypass
    if (req.user.role === 'ADMIN') return next();

    // Trial users have access too
    if (req.user.isTrialActive && req.user.trialStatus === 'ACTIVE') {
        return next();
    }

    if (!req.user.hasPaidAccess) {
        return res.status(402).json({
            success: false,
            message: 'Platform access fee required or trial expired.',
            requiresPayment: true,
            amount: 2.50,
            currency: 'USD',
            isTrial: req.user.trialStatus === 'EXPIRED',
            trialExpired: req.user.trialStatus === 'EXPIRED'
        });
    }
    next();
};

// Middleware to require active trial (for trial-only features)
const requireTrialAccess = async (req, res, next) => {
    // Allows admins to bypass
    if (req.user.role === 'ADMIN') return next();

    // Check if user has active trial
    if (!req.user.isTrialActive || req.user.trialStatus !== 'ACTIVE') {
        return res.status(402).json({
            success: false,
            message: 'Active trial subscription required.',
            requiresTrial: true,
            trialStatus: req.user.trialStatus || 'NONE',
            hasHadTrial: req.user.trialStatus && req.user.trialStatus !== 'NONE'
        });
    }
    next();
};

// Check if user is a trial user (informational)
const isTrialUser = (req, res, next) => {
    req.user.isTrialUser = req.user.isTrialActive && req.user.trialStatus === 'ACTIVE';
    next();
};

const optionalProtect = async (req, res, next) => {
    // BUG-AUTH-07: Use req.cookies (populated by cookie-parser) instead of manual string parsing
    // Manual split('=') breaks on cookie values that contain '=' (e.g. base64 tokens)
    let token;
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, getJwtSecret());
            const session = await prisma.userSession.findFirst({
                where: { token, isActive: true, expiresAt: { gt: new Date() } }
            });
            if (session) {
                req.user = await prisma.user.findUnique({
                    where: { id: decoded.id },
                    select: { 
                        id: true, 
                        fullName: true, 
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        role: true, 
                        hasPaidAccess: true, 
                        subscriptionTier: true, 
                        accessExpiry: true,
                        trialStartDate: true,
                        trialEndDate: true,
                        trialStatus: true,
                        isTrialActive: true
                    }
                });
            }
        } catch (error) {
            // Ignore token error for optional protect
        }
    }
    next();
};

module.exports = { protect, authorize, requirePaidAccess, optionalProtect, requireTier, requireTrialAccess, isTrialUser };

