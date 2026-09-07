const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const rateLimiter = require('../middleware/rateLimiter');
const { rateLimiters } = rateLimiter;
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');
const honeypot = require('../middleware/honeypot');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../utils/jwtSecret');
const authController = require('../controllers/authController');

// Rate limiter for resend verification (3 per hour)
const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many verification requests. Please try again in an hour.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Login: 5 attempts per 15 mins with progressive delay
router.post('/login', honeypot, validate('login', 'body'), authLimiter, authController.login);
router.post('/social-login', rateLimiters.login, authController.socialLogin);

// Signup: 10 accounts per hour per IP
router.post('/signup', honeypot, validate('signup', 'body'), rateLimiters.signup, authController.signup);
// Alias: /register → /signup (common alternative endpoint name)
router.post('/register', honeypot, validate('signup', 'body'), authLimiter, authController.signup);

// Email verification (no rate limit needed - single use tokens)
// router.get('/verify', authController.verifyEmail);
router.post('/verify-otp', authLimiter, authController.verifyOTP);

// Resend verification email: 3 per hour
router.post('/resend-verification', resendLimiter, authController.resendVerification);

// Forgot password: 3 attempts per hour with progressive delay
router.post('/forgot-password', rateLimiters.forgotPassword, authController.forgotPassword);

// Password reset (token-protected, no additional rate limit)
router.post('/reset-password', authController.resetPassword);

// Get current user session (protected by HttpOnly cookie)
router.get('/me', protect, authController.getMe);
router.post('/set-role', protect, authController.setRole);
router.put('/update-password', protect, authController.updatePassword);
router.post('/verify-bvn', protect, authController.verifyBvn);

// Logout (no rate limit needed)
router.post('/logout', authController.logout);

// Sessions
router.get('/sessions', protect, authController.getSessions);
router.delete('/sessions/:sessionId', protect, authController.revokeSession);

// ============================================
// Social Login Routes (Google/Apple)
// ============================================

// Google OAuth routes - uses Passport.js when configured
router.get('/google', (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    try {
        const passport = require('passport');

        // Check if Google strategy is registered
        if (!passport._strategies || !passport._strategies.google) {
              logger.warn('Google OAuth strategy not configured. Redirect to login with error.');
              return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
          }
  
          // Store return URL in session if present
          if (req.query.returnUrl && req.session) {
              req.session.returnUrl = req.query.returnUrl;
          }
  
          // Trigger Google OAuth flow
          passport.authenticate('google', {
              scope: ['profile', 'email'],
              prompt: 'select_account' // Always show account picker
          })(req, res, next);
  
      } catch (err) {
          logger.error(`Google OAuth initiation error: ${err.message}`);
          res.redirect(`${frontendUrl}/login?error=google_unavailable`);
      }
  });
  
  router.get('/google/callback',
      (req, res, next) => {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
          try {
              const passport = require('passport');
  
              if (!passport._strategies || !passport._strategies.google) {
                  return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
              }
  
              passport.authenticate('google', {
                  failureRedirect: `${frontendUrl}/login?error=google_auth_failed`,
                  session: false // We use JWT, not sessions
              })(req, res, next);
          } catch (err) {
              logger.error(`Google callback error: ${err.message}`);
              res.redirect(`${frontendUrl}/login?error=google_callback_failed`);
          }
      },
      (req, res) => {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
          try {
              // User is now in req.user (from Passport)
              const user = req.user;
  
              // Generate JWT token
              const token = jwt.sign(
                  { id: user.id, role: user.role, email: user.email },
                  getJwtSecret(),
                  { expiresIn: '30d' }
              );
  
              // Set httpOnly cookie
              res.cookie('token', token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
              });
  
              // Determine redirect URL
              let returnPath = req.session?.returnUrl || '/';
              if (req.session?.returnUrl) {
                  delete req.session.returnUrl;
              }
              
              // Ensure returnPath starts with / and doesn't contain a domain to avoid open redirect vulnerabilities
              if (!returnPath.startsWith('/')) returnPath = '/' + returnPath;
              const returnUrl = frontendUrl + returnPath;
  
              logger.info(`User logged in via Google OAuth: ${user.email}`);
              res.redirect(returnUrl);
  
          } catch (err) {
              logger.error(`Google OAuth token generation error: ${err.message}`);
              res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
          }
      }
  );

// Apple Sign In
router.post('/apple', rateLimiters.login, authController.appleLogin);

module.exports = router;
