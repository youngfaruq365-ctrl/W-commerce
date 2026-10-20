const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../utils/jwtSecret');
const kycService = require('../services/kycService');

const prisma = require('../utils/prismaClient');

const isUsingPlaceholderKeys = () => {
    const twilioSid = process.env.TWILIO_VERIFY_SID || '';
    const termiiKey = process.env.TERMII_API_KEY || '';
    return (
        process.env.NODE_ENV !== 'production' ||
        twilioSid.includes('REPLACE') ||
        termiiKey.includes('tlv_Fzu4b2A') ||
        (!process.env.TWILIO_ACCOUNT_SID && !process.env.TERMII_API_KEY)
    );
};

exports.signup = async (req, res) => {
    try {
        const { fullName, email, password, role, phone, layout } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create User
        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                phone,
                role: role ? role.toUpperCase() : 'BUYER'
            }
        });

        // If user is a SELLER, create a default store shell
        if (user.role === 'SELLER') {
            await prisma.store.create({
                data: {
                    sellerId: user.id,
                    storeName: `${user.fullName}'s Shop`,
                    description: 'Global marketplace merchant.',
                    country: 'USA',
                    isVerified: false,
                    portfolioConfig: JSON.stringify(layout ? { storeConfig: { productLayout: layout } } : {}),
                    approvalStatus: 'PENDING'
                }
            });

            try {
                const notificationV2Service = require('../services/notificationV2Service');
                const socketService = require('../services/socketService');
                await notificationV2Service.notifyAdmins({
                    type: 'STORE_APPROVAL_REQUIRED',
                    title: 'New Store Pending Approval',
                    body: `A new seller "${user.fullName}" has signed up. Their store requires admin approval.`,
                    linkUrl: '/admin/sellers'
                });
                const io = socketService.getIO();
                if (io) io.to('role:ADMIN').emit('admin_dashboard_update');
            } catch (err) {}
        }

        // Generate 6-Digit Verification Code
        const verificationCode = crypto.randomInt(100000, 1000000).toString();
        const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Update User with Code
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpires
            }
        });

        // Send Email with Code
        await emailService.sendVerificationCode(email, fullName, verificationCode);

        // Send SMS with Code (if phone provided)
        if (phone) {
            await smsService.sendVerificationCode(phone, verificationCode);
        }

        logger.info(`New user registered: ${email} (${user.role})`);

        res.status(201).json({
            success: true,
            message: 'User created! Please check your email to verify your account. (Check server console for link)',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isVerified: false
            },
            ...(isUsingPlaceholderKeys() && { _devCode: verificationCode })
        });



    } catch (error) {
        logger.error(`Signup Error: ${error.message}`);
        // BUG-AUTH-05: Handle unique constraint race condition gracefully
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Log failed login attempt (don't log password)
            logger.warn(`Failed login attempt for: ${email} (User not found)`);
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // 1. Check if Locked
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
            const waitSeconds = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 1000);
            return res.status(423).json({
                success: false,
                message: `Account locked. Too many failed attempts. Try again in ${Math.ceil(waitSeconds / 60)} minutes.`
            });
        }

        // CHECK IF VERIFIED (Prevents timing attacks/enumeration on unverified accounts)
        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
        }

        // Validate Password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {

            // Increment Failed Attempts
            const newAttempts = (user.failedLoginAttempts || 0) + 1;
            let lockoutUntil = null;
            let msg = 'Invalid credentials'; // Generic message for security

            // Lockout Strategy
            if (newAttempts >= 5) {
                // Lock for 15 minutes
                lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
                msg = 'Account locked due to 5 failed attempts. Please wait 15 minutes.';
            } else if (newAttempts >= 3) {
                // Optional: Warn user? Or keep silent security
                // msg = `Invalid password. ${5 - newAttempts} attempts remaining before lockout.`;
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newAttempts,
                    lockoutUntil: lockoutUntil
                }
            });

            logger.warn(`Failed login attempt for: ${email} (Invalid password) - Attempt ${newAttempts}`);
            return res.status(401).json({ success: false, message: msg });
        }

        // 3. Successful Login - Reset Lockout
        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockoutUntil: null }
            });
        }


        // Generate Token — BUG-AUTH-06: standardised to 30d across all auth flows
        const token = jwt.sign(
            { id: user.id, role: user.role },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        // Record session
        await prisma.userSession.create({
            data: {
                userId: user.id,
                token: token,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.connection?.remoteAddress || null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        // Set httpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.hostname.includes('localhost') && !req.hostname.includes('127.0.0.1'),
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        logger.info(`User logged in: ${email}`);

        res.status(200).json({
            success: true,
            token, // Required for mobile Capacitor and certain frontend Socket.io plugins
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                phone: user.phone,
                isVerified: user.isVerified,
                avatarUrl: user.avatarUrl,
                subscriptionTier: user.subscriptionTier,
                hasPaidAccess: user.hasPaidAccess,
                accessExpiry: user.accessExpiry
            }
        });


    } catch (error) {
        logger.error(`Login Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error during login', error: error.message, stack: error.stack });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // SECURITY: Prevent user enumeration
            return res.json({ success: true, message: 'Password reset code has been sent to your email (and phone if registered).' });
        }

        // Generate 6-Digit Reset Code (valid 15 mins)
        const resetCode = crypto.randomInt(100000, 1000000).toString();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: resetCode,
                verificationCodeExpires: resetExpires
            }
        });

        // Send OTP via Email & SMS
        await emailService.sendPasswordResetOTP(email, resetCode);
        if (user.phone) {
            await smsService.sendVerificationCode(user.phone, resetCode);
        }

        res.json({ success: true, message: 'Password reset code has been sent to your email (and phone if registered).', ...(isUsingPlaceholderKeys() && { _devCode: resetCode }) });

    } catch (error) {
        logger.error(`Forgot Password Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error processing password reset.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.verificationCode !== code) {
            return res.status(400).json({ success: false, message: 'Invalid reset code.' });
        }

        if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
            return res.status(400).json({ success: false, message: 'Reset code has expired.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                verificationCode: null,
                verificationCodeExpires: null
            }
        });

        // BUG-AUTH-04: Invalidate all existing sessions after password reset
        await prisma.userSession.updateMany({
            where: { userId: user.id },
            data: { isActive: false }
        });

        logger.info(`Password reset successfully for: ${email}`);
        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        logger.error(`Reset Password Error: ${error.message}`);
        res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }
};

exports.logout = async (req, res) => {
    try {
        // Only log if we have a user in the request (from middleware)
        if (req.user) {
            logger.info(`User logged out: ${req.user.email}`);
            const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
            if (token) {
                 await prisma.userSession.updateMany({
                     where: { token },
                     data: { isActive: false }
                 });
            }
        }

        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        logger.error(`Logout Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};

/**
 * Verify OTP Code
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Invalid verification code.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Account is already verified.' });
        }

        // Validate Code
        if (user.verificationCode !== code) {
            logger.warn(`Invalid OTP attempt for: ${email}`);
            return res.status(400).json({ success: false, message: 'Invalid verification code.' });
        }

        // Check Expiry
        if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        // MARK AS VERIFIED
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationCodeExpires: null
            }
        });

        logger.info(`User verified via OTP: ${email}`);

        res.json({
            success: true,
            message: 'Email successfully verified! You can now log in.'
        });

    } catch (err) {
        logger.error(`OTP Verification Error: ${err.message}`);
        // BUG-AUTH-01: Was returning HTML — JSON API must always return JSON
        res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }
};

/**
 * Resend Verification Email
 * Allows users to request a new verification email
 */
exports.resendVerification = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Don't reveal if user exists for security
            return res.json({ success: true, message: 'If an account exists with this email, a verification link has been sent.' });
        }

        // Already verified
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'This email is already verified. You can log in.' });
        }

        // Generate new verification code (24h valid)
        const verificationCode = crypto.randomInt(100000, 1000000).toString();
        const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpires
            }
        });

        // Send verification email
        await emailService.sendVerificationCode(email, user.fullName, verificationCode);

        // Send SMS with Code (if phone provided)
        const targetPhone = phone || user.phone;
        if (targetPhone) {
            await smsService.sendVerificationCode(targetPhone, verificationCode);
        }

        res.json({ success: true, message: 'Verification link resent to your email and phone.', ...(isUsingPlaceholderKeys() && { _devCode: verificationCode }) });

    } catch (error) {
        logger.error(`Resend Verification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error processing resend.' });
    }
};

exports.getSessions = async (req, res) => {
    try {
        const sessions = await prisma.userSession.findMany({
            where: { 
                userId: req.user.id, 
                isActive: true, 
                expiresAt: { gt: new Date() } 
            },
            orderBy: { createdAt: 'desc' }
        });
        // omit token from response
        const safeSessions = sessions.map(s => ({
            id: s.id,
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            isCurrent: s.token === (req.cookies.token || req.headers.authorization?.split(' ')[1])
        }));
        res.json({ success: true, sessions: safeSessions });
    } catch(err) {
        logger.error(`getSessions error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.revokeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        await prisma.userSession.updateMany({
            where: { id: sessionId, userId: req.user.id },
            data: { isActive: false }
        });
        res.json({ success: true, message: 'Session revoked successfully' });
    } catch(err) {
        logger.error(`revokeSession error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


/**
 * Set user role (For Google OAuth or manual role selection)
 * Allows a user with PENDING role to choose between BUYER and SELLER
 */
exports.setRole = async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!['BUYER', 'SELLER', 'COURIER'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role selected.' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.role && user.role !== 'PENDING') {
            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email },
                getJwtSecret(),
                { expiresIn: '30d' }
            );

            // Invalidate old session
            const oldToken = req.cookies.token || req.headers.authorization?.split(' ')[1];
            if (oldToken) {
                 await prisma.userSession.updateMany({
                     where: { token: oldToken },
                     data: { isActive: false }
                 });
            }

            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    token: token,
                    userAgent: req.headers['user-agent'] || null,
                    ipAddress: req.ip || req.connection?.remoteAddress || null,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' && !req.hostname.includes('localhost') && !req.hostname.includes('127.0.0.1'),
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            return res.status(200).json({
                success: true,
                message: 'Role has already been set.',
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    hasPaidAccess: user.hasPaidAccess,
                    accessExpiry: user.accessExpiry
                }
            });
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                hasPaidAccess: true,
                accessExpiry: true
            }
        });

        const token = jwt.sign(
            { id: updatedUser.id, role: updatedUser.role, email: updatedUser.email },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        // Invalidate old session
        const oldToken = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (oldToken) {
             await prisma.userSession.updateMany({
                 where: { token: oldToken },
                 data: { isActive: false }
             });
        }

        await prisma.userSession.create({
            data: {
                userId: updatedUser.id,
                token: token,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.connection?.remoteAddress || null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.hostname.includes('localhost') && !req.hostname.includes('127.0.0.1'),
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.json({
            success: true,
            message: 'Role updated successfully',
            token,
            user: updatedUser
        });
    } catch (error) {
        logger.error(`Set Role Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to set role. Please try again.' });
    }
};

// ============================================
// Social Login
// ============================================

exports.socialLogin = async (req, res) => {
    try {
        const { provider, token } = req.body;

        if (!provider || !token) {
            return res.status(400).json({ success: false, message: 'Provider and token are required' });
        }

        let email, fullName, providerId, avatarUrl;

        if (provider === 'GOOGLE') {
            // Verify Google Token via REST endpoint
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            const googleData = await googleRes.json();

            if (googleData.error_description) {
                return res.status(401).json({ success: false, message: 'Invalid Google Token' });
            }

            // Verify audience matches our client ID
            if (process.env.GOOGLE_CLIENT_ID && googleData.aud !== process.env.GOOGLE_CLIENT_ID) {
                return res.status(401).json({ success: false, message: 'Token audience mismatch' });
            }

            email = googleData.email;
            fullName = googleData.name;
            providerId = googleData.sub;
            avatarUrl = googleData.picture;

        } else if (provider === 'APPLE') {
            // Apple tokens are verified in the appleLogin handler
            return res.status(400).json({ success: false, message: 'Use /auth/apple endpoint for Apple Sign-In' });
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported provider. Use GOOGLE or APPLE.' });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: 'Could not retrieve email from provider' });
        }

        // Find existing user by provider ID or email
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { googleId: providerId },
                    { email: email }
                ]
            }
        });

        if (user) {
            // Link Google ID if not already set
            if (!user.googleId && providerId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId: providerId, authProvider: 'GOOGLE' }
                });
            }
        } else {
            // Create new user from social profile
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const passwordHash = await bcrypt.hash(randomPassword, 10);

            user = await prisma.user.create({
                data: {
                    email,
                    fullName: fullName || email.split('@')[0],
                    passwordHash,
                    googleId: providerId,
                    authProvider: 'GOOGLE',
                    isVerified: true, // Social login implies email verification
                    avatarUrl: avatarUrl || null,
                    role: 'PENDING'
                }
            });
            logger.info(`New user created via Google Social Login: ${email}`);
        }

        // Generate Session Token
        const authToken = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        await prisma.userSession.create({
            data: {
                userId: user.id,
                token: authToken,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.connection?.remoteAddress || null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        res.cookie('token', authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.hostname.includes('localhost') && !req.hostname.includes('127.0.0.1'),
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        // Return token so Capacitor/local storage scripts can persist it
        res.json({
            success: true,
            token: authToken,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl }
        });
    } catch (error) {
        logger.error(`Google Login Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Google login failed' });
    }
};
exports.appleLogin = async (req, res) => {
    try {
        const { identityToken, user: appleUser, authorizationCode } = req.body;

        if (!identityToken) {
            return res.status(400).json({ success: false, message: 'Apple identity token is required' });
        }

        // 1. Decode the Apple JWT (without verification first to get header)
        const tokenParts = identityToken.split('.');
        if (tokenParts.length !== 3) {
            return res.status(400).json({ success: false, message: 'Invalid Apple identity token format' });
        }

        // Decode payload
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());

        // 2. Verify issuer and audience
        if (payload.iss !== 'https://appleid.apple.com') {
            return res.status(401).json({ success: false, message: 'Invalid Apple token issuer' });
        }

        if (process.env.APPLE_CLIENT_ID && payload.aud !== process.env.APPLE_CLIENT_ID) {
            return res.status(401).json({ success: false, message: 'Apple token audience mismatch' });
        }

        // 3. Check token expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return res.status(401).json({ success: false, message: 'Apple token has expired' });
        }

        // 4. Extract user info
        const appleId = payload.sub; // Unique Apple user ID
        const email = payload.email || appleUser?.email;
        const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;

        // Apple only sends the user's name on the FIRST authorization
        const firstName = appleUser?.name?.firstName || '';
        const lastName = appleUser?.name?.lastName || '';
        const fullName = (firstName + ' ' + lastName).trim() || (email ? email.split('@')[0] : `Apple User ${appleId.substring(0, 8)}`);

        if (!appleId) {
            return res.status(400).json({ success: false, message: 'Could not extract Apple user ID' });
        }

        // 5. Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { appleId: appleId },
                    ...(email ? [{ email: email }] : [])
                ]
            }
        });

        if (user) {
            // Link Apple ID if not already set
            const updateData = {};
            if (!user.appleId) updateData.appleId = appleId;
            if (!user.authProvider || user.authProvider === 'LOCAL') updateData.authProvider = 'APPLE';

            if (Object.keys(updateData).length > 0) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
            }
        } else {
            // Create new user
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const passwordHash = await bcrypt.hash(randomPassword, 10);

            user = await prisma.user.create({
                data: {
                    email: email || `apple_${appleId.substring(0, 12)}@privaterelay.appleid.com`,
                    fullName,
                    passwordHash,
                    appleId,
                    authProvider: 'APPLE',
                    isVerified: emailVerified,
                    role: 'BUYER'
                }
            });
            logger.info(`New user created via Apple Sign-In: ${user.email}`);
        }

        // 6. Generate Session Token
        const authToken = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        await prisma.userSession.create({
            data: {
                userId: user.id,
                token: authToken,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.connection?.remoteAddress || null,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        res.cookie('token', authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        logger.error(`Apple Login Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Apple login failed' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });

        // BUG-AUTH-04: Invalidate all existing sessions when password is changed
        await prisma.userSession.updateMany({
            where: { userId: userId },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        logger.error(`Update Password Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
};

exports.verifyBvn = async (req, res) => {
    try {
        const { bvn } = req.body;
        
        if (!bvn) {
            return res.status(400).json({ success: false, message: 'BVN is required' });
        }
        
        await kycService.verifyBVN(bvn, req.user.id);
        
        return res.json({ success: true, message: 'BVN Verified' });
    } catch (error) {
        logger.error(`BVN Verification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to verify BVN' });
    }
};


exports.getMe = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });
        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                phone: user.phone,
                isVerified: user.isVerified,
                avatarUrl: user.avatarUrl,
                subscriptionTier: user.subscriptionTier,
                hasPaidAccess: user.hasPaidAccess,
                accessExpiry: user.accessExpiry
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

