const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'backend', 'controllers', 'authController.js');
let content = fs.readFileSync(filePath, 'utf8');

const correctText = `    } catch (err) {
        logger.error(\`Email Link Verification Error: \${err.message}\`);
        res.status(400).send("<h1>Verification Failed</h1><p>Invalid or expired verification link.</p>");
    }
};

/**
 * Resend Verification Email
 * Allows users to request a new verification email
 */
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

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
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
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

        // Send verification SMS (if phone exists)
        if (user.phone) {
            await smsService.sendVerificationCode(user.phone, verificationCode);
        }

        res.json({
            success: true,
            message: 'Verification email sent! Please check your inbox (and spam folder).'
        });

    } catch (error) {
        logger.error(\`Resend Verification Error: \${error.message}\`);
        res.status(500).json({ success: false, message: 'Failed to resend verification email' });
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

        if (!['BUYER', 'SELLER'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role selected.' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.role !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Role has already been set.' });
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

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.json({
            success: true,
            message: 'Role updated successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error(\`Set Role Error: \${error.message}\`);
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
            const googleRes = await fetch(\`https://oauth2.googleapis.com/tokeninfo?id_token=\${token}\`);
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
            if (!user.googleId && providerId) {`;

const match1 = "    } catch (err) {\r\n        logger.error(`Email Link Verification Error: ${err.message}`);";
const match2 = "        if (user) {\r\n            // Link Google ID if not already set\r\n            if (!user.googleId && providerId) {";

const idx1 = content.indexOf("    } catch (err) {\n        logger.error(`Email Link Verification Error");
if (idx1 === -1) {
    const fallbackIdx1 = content.indexOf("    } catch (err) {\r\n        logger.error(`Email Link Verification Error");
    if (fallbackIdx1 === -1) console.log("Failed to find start");
}

const idx2 = content.indexOf("        if (user) {\n            // Link Google ID if not already set\n            if (!user.googleId && providerId) {");
if (idx2 === -1) {
     const fallbackIdx2 = content.indexOf("        if (user) {\r\n            // Link Google ID if not already set\r\n            if (!user.googleId && providerId) {");
     if (fallbackIdx2 === -1) console.log("Failed to find end");
}

// I will just use regex to replace it
const replaced = content.replace(/    \} catch \(err\) \{[\s\S]*?if \(!user\.googleId && providerId\) \{/, correctText);
fs.writeFileSync(filePath, replaced);
console.log("Successfully fixed authController.js");
