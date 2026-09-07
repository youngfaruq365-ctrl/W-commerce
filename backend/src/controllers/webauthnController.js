const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// RP (Relying Party) configuration — should match your domain in production
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'W-Commerce';
const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'localhost';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  || 'http://localhost:5175';

// In-memory challenge store (development only).
// In production, persist challenges in Redis with a short TTL (e.g. 60s).
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

        // Fetch existing credentials to exclude them from registration
        const existingCredentials = await prisma.webAuthnCredential.findMany({
            where: { userId: user.id },
            select: { id: true, transports: true }
        });
        
        const mappedCredentials = existingCredentials.map(cred => ({
            id: Buffer.from(cred.id, 'base64url'),
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined
        }));

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: Buffer.from(user.id),
            userName: user.email,
            userDisplayName: user.fullName || user.email,
            attestationType: 'none',
            excludeCredentials: mappedCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        // Store challenge temporarily against the user ID
        challengeStore.set(user.id, options.challenge);

        return res.json(options);
    } catch (err) {
        logger.error(`WebAuthn generateRegistrationOptions error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to generate registration options' });
    }
};

/**
 * POST /api/v1/webauthn/verify-registration
 * Requires: authenticated session
 */
exports.verifyRegistration = async (req, res) => {
    try {
        const user = req.user;
        const expectedChallenge = challengeStore.get(user.id);

        if (!expectedChallenge) {
            return res.status(400).json({ success: false, message: 'No pending registration challenge. Please restart the flow.' });
        }

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        challengeStore.delete(user.id);

        if (verification.verified) {
            const { registrationInfo } = verification;
            const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;
            
            await prisma.webAuthnCredential.create({
                data: {
                    id: Buffer.from(credentialID).toString('base64url'),
                    userId: user.id,
                    publicKey: Buffer.from(credentialPublicKey),
                    counter: BigInt(counter),
                    deviceType: credentialDeviceType,
                    backedUp: credentialBackedUp,
                    transports: req.body.transports ? JSON.stringify(req.body.transports) : null
                }
            });
            logger.info(`WebAuthn registration verified for user ${user.id}`);
            return res.json({ verified: true });
        }

        return res.status(400).json({ verified: false, message: 'Registration verification failed' });
    } catch (err) {
        logger.error(`WebAuthn verifyRegistration error: ${err.message}`);
        return res.status(400).json({ verified: false, message: err.message });
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
            return res.status(400).json({ success: false, message: 'email query parameter is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return generic options to avoid user-enumeration
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userCredentials = await prisma.webAuthnCredential.findMany({
            where: { userId: user.id }
        });
        const allowCredentials = userCredentials.map(cred => ({
            id: Buffer.from(cred.id, 'base64url'),
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined
        }));

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            userVerification: 'preferred',
            allowCredentials,
        });

        challengeStore.set(user.id, options.challenge);

        return res.json(options);
    } catch (err) {
        logger.error(`WebAuthn generateAuthenticationOptions error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to generate authentication options' });
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

        const expectedChallenge = challengeStore.get(user.id);
        if (!expectedChallenge) {
            return res.status(400).json({ success: false, message: 'No pending authentication challenge. Please restart the flow.' });
        }

        const credentialIdBase64url = response.id;
        const credential = await prisma.webAuthnCredential.findUnique({
            where: { id: credentialIdBase64url }
        });
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Credential not found' });
        }
        
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(credential.id, 'base64url'),
                credentialPublicKey: credential.publicKey,
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

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            
            return res.json({ verified: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
        }

    } catch (err) {
        logger.error(`WebAuthn verifyAuthentication error: ${err.message}`);
        return res.status(400).json({ verified: false, message: err.message });
    }
};
