const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// RP (Relying Party) configuration
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'W-Commerce';
const _frontend = process.env.FRONTEND_URL || 'http://localhost:5175';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  || _frontend.replace(/\/+$/, '');
const RP_ID   = process.env.WEBAUTHN_RP_ID   || (() => { try { return new URL(ORIGIN).hostname; } catch { return 'localhost'; } })();

// Dynamic origin helper — for dev, always use the env/default.
// Browser GET requests don't send Origin header, so we need a solid fallback.
const getOriginAndRpId = (req) => {
    const origin = req.get('origin') || req.get('referer')?.replace(/\/$/, '') || ORIGIN;
    let rpId = RP_ID;
    try {
        rpId = new URL(origin).hostname || RP_ID;
    } catch (e) {
        rpId = RP_ID;
    }
    return { origin, rpId };
};

// In-memory challenge store (dev only — use Redis in production with short TTL)
const challengeStore = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/webauthn/generate-registration-options
 * Requires: authenticated session (protect middleware applied in routes file)
 */
exports.generateRegistrationOptions = async (req, res) => {
    try {
        const user = req.user;

        // Fetch existing credentials to exclude them from re-registration
        const existingCredentials = await prisma.webAuthnCredential.findMany({
            where: { userId: user.id },
            select: { id: true, transports: true }
        });

        const excludeCredentials = existingCredentials.map(cred => ({
            id: cred.id,  // v14 accepts base64url string directly
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined
        }));

        const { origin, rpId } = getOriginAndRpId(req);
        logger.info(`WebAuthn registration options — origin: ${origin}, rpId: ${rpId}`);

        // v14: userID must be a Uint8Array. Use a hash of the user.id string for stability.
        const crypto = require('crypto');
        const userIdBytes = crypto.createHash('sha256').update(user.id).digest();

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: rpId,
            userID: userIdBytes,
            userName: user.email,
            userDisplayName: user.fullName || user.email,
            attestationType: 'none',
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        // Store challenge keyed to user id
        challengeStore.set(user.id, { challenge: options.challenge, origin, rpId });

        return res.json(options);
    } catch (err) {
        logger.error(`WebAuthn generateRegistrationOptions error: ${err.message}\n${err.stack}`);
        return res.status(500).json({ success: false, message: `Registration setup failed: ${err.message}` });
    }
};

/**
 * POST /api/v1/webauthn/verify-registration
 * Requires: authenticated session
 */
exports.verifyRegistration = async (req, res) => {
    try {
        const user = req.user;
        const stored = challengeStore.get(user.id);

        if (!stored) {
            return res.status(400).json({ success: false, message: 'No pending registration challenge. Please click Setup Passkey again.' });
        }

        const { challenge: expectedChallenge, origin: expectedOrigin, rpId: expectedRPID } = stored;

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
        });

        challengeStore.delete(user.id);

        if (verification.verified) {
            // v14 API: credential object holds id, publicKey, counter
            const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            await prisma.webAuthnCredential.create({
                data: {
                    id: Buffer.from(credential.id).toString('base64url'),
                    userId: user.id,
                    publicKey: Buffer.from(credential.publicKey),
                    counter: BigInt(credential.counter),
                    deviceType: credentialDeviceType,
                    backedUp: credentialBackedUp,
                    transports: req.body.response?.transports
                        ? JSON.stringify(req.body.response.transports)
                        : null
                }
            });
            logger.info(`WebAuthn passkey registered for user ${user.id}`);
            return res.json({ verified: true });
        }

        return res.status(400).json({ verified: false, message: 'Passkey registration verification failed.' });
    } catch (err) {
        logger.error(`WebAuthn verifyRegistration error: ${err.message}\n${err.stack}`);
        return res.status(400).json({ verified: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/webauthn/generate-authentication-options?email=...
 * Public — called before a session exists (during login)
 */
exports.generateAuthenticationOptions = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please enter your email address first.' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'No passkey found. Please sign in with your password and set up a passkey in Security settings.' });
        }

        const userCredentials = await prisma.webAuthnCredential.findMany({
            where: { userId: user.id }
        });

        if (userCredentials.length === 0) {
            return res.status(400).json({ success: false, message: 'No passkey registered for this account. Please sign in with your password and set up a passkey in Security & 2FA settings.' });
        }

        const allowCredentials = userCredentials.map(cred => ({
            id: cred.id,  // v14 accepts base64url string
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined
        }));

        const { origin, rpId } = getOriginAndRpId(req);
        logger.info(`WebAuthn auth options — origin: ${origin}, rpId: ${rpId}`);

        const options = await generateAuthenticationOptions({
            rpID: rpId,
            userVerification: 'preferred',
            allowCredentials,
        });

        challengeStore.set(user.id, { challenge: options.challenge, origin, rpId });

        return res.json(options);
    } catch (err) {
        logger.error(`WebAuthn generateAuthenticationOptions error: ${err.message}\n${err.stack}`);
        return res.status(500).json({ success: false, message: `Authentication setup failed: ${err.message}` });
    }
};

/**
 * POST /api/v1/webauthn/verify-authentication
 * Public — verifies the authenticator response and issues a session cookie
 */
exports.verifyAuthentication = async (req, res) => {
    try {
        const { email, response } = req.body;

        if (!email || !response) {
            return res.status(400).json({ success: false, message: 'email and response are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const stored = challengeStore.get(user.id);
        if (!stored) {
            return res.status(400).json({ success: false, message: 'No pending authentication challenge. Please try again.' });
        }

        const { challenge: expectedChallenge, origin: expectedOrigin, rpId: expectedRPID } = stored;

        const credentialIdBase64url = response.id;
        const credential = await prisma.webAuthnCredential.findUnique({
            where: { id: credentialIdBase64url }
        });
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Passkey not found. Please set up your passkey again in Security settings.' });
        }

        // v14 API: use `credential` key (not `authenticator`)
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
            credential: {
                id: credential.id,
                publicKey: credential.publicKey,
                counter: Number(credential.counter),
                transports: credential.transports ? JSON.parse(credential.transports) : undefined,
            }
        });

        challengeStore.delete(user.id);

        if (verification.verified) {
            await prisma.webAuthnCredential.update({
                where: { id: credential.id },
                data: { counter: BigInt(verification.authenticationInfo.newCounter) }
            });

            const jwt = require('jsonwebtoken');
            const { getJwtSecret } = require('../utils/jwtSecret');
            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email },
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
            }).catch(err => logger.error(`WebAuthn session creation error: ${err.message}`));

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            return res.json({
                verified: true,
                token, // Required for localStorage
                user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
            });
        }

        return res.status(400).json({ verified: false, message: 'Passkey authentication failed.' });

    } catch (err) {
        logger.error(`WebAuthn verifyAuthentication error: ${err.message}\n${err.stack}`);
        return res.status(400).json({ verified: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message });
    }
};
