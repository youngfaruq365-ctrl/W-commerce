const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const webauthnController = require('../controllers/webauthnController');

// ============================================================
// WebAuthn / Passkey Routes
// These endpoints are consumed by @simplewebauthn/browser on the frontend.
// All registration routes require an authenticated session.
// Authentication routes are public (used during login before a session exists).
// ============================================================

// --- Registration (Passkey Setup) ---
// Step 1: Generate options for the authenticator
router.get('/generate-registration-options', protect, webauthnController.generateRegistrationOptions);

// Step 2: Verify the authenticator's response and save the credential
router.post('/verify-registration', protect, webauthnController.verifyRegistration);

// --- Authentication (Passkey Login) ---
// Step 1: Generate options (public — called before login, email passed as query param)
router.get('/generate-authentication-options', webauthnController.generateAuthenticationOptions);

// Step 2: Verify authenticator response and issue session cookie
router.post('/verify-authentication', webauthnController.verifyAuthentication);

module.exports = router;
