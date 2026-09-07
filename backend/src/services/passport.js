/**
 * Passport.js Social Authentication Configuration
 * Supports Google OAuth 2.0
 */

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');

// Serialize user for session
const serializeUser = (user, done) => {
    done(null, user.id);
};

// Deserialize user from session
const deserializeUser = async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
};

/**
 * Configure Google OAuth Strategy
 */
const configureGoogleStrategy = (passport) => {
    // Only configure if credentials are present
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        logger.warn('⚠️ Google OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Google login disabled.');
        return;
    }

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback',
        scope: ['profile', 'email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;

                // Check if user already exists with Google ID or email
                let user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { googleId: profile.id },
                            ...(email ? [{ email: email }] : [])
                        ]
                    }
                });

                if (user) {
                    // Link Google ID if not already set
                    if (!user.googleId) {
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                googleId: profile.id,
                                authProvider: 'GOOGLE'
                            }
                        });
                    }
                    return done(null, user);
                }

                // Create new user
                const randomPassword = crypto.randomBytes(32).toString('hex');
                const passwordHash = await bcrypt.hash(randomPassword, 10);

                user = await prisma.user.create({
                    data: {
                        fullName: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
                        email: email || `google_${profile.id}@placeholder.globalx.app`,
                        passwordHash,
                        googleId: profile.id,
                        authProvider: 'GOOGLE',
                        isVerified: true, // Google verifies email
                        role: 'PENDING',
                        avatarUrl: profile.photos?.[0]?.value || null
                    }
                });

                logger.info(`New user created via Google OAuth: ${user.email}`);
                return done(null, user);
            } catch (err) {
                logger.error(`Google OAuth Error: ${err.message}`);
                return done(err, null);
            }
        }));

    passport.serializeUser(serializeUser);
    passport.deserializeUser(deserializeUser);

    logger.info('✅ Google OAuth strategy configured');
};

module.exports = {
    configureGoogleStrategy,
    serializeUser,
    deserializeUser
};
