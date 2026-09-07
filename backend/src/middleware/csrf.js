/**
 * GlobalX — CSRF Protection Middleware
 * Double-submit cookie pattern for form protection
 */
const crypto = require('crypto');
const logger = require('../utils/logger');

const CSRF_COOKIE = 'gx_csrf';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32;
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Methods that don't need CSRF validation
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths to skip CSRF (webhooks receive external POST requests)
const SKIP_PATHS = [
  '/api/webhooks/',
  '/api/stripe/webhook',
  '/api/paystack/webhook'
];

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF Protection Middleware
 * - Sets a CSRF token cookie on every request
 * - Validates the X-CSRF-Token header matches the cookie on unsafe methods
 */
function csrfProtection(req, res, next) {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) {
    // Still set the cookie if not present
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = generateToken();
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // Client JS needs to read this to send in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/'
      });
    }
    return next();
  }

  // Skip webhook paths
  const path = req.path || req.url;
  if (SKIP_PATHS.some(skip => path.startsWith(skip))) {
    return next();
  }

  // Get the token from cookie and header
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  // If no cookie token exists, generate one and reject this request
  if (!cookieToken) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });

    logger.warn(`CSRF: No token cookie present for ${req.method} ${path}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.'
    });
  }

  // Validate: header token must match cookie token
  if (!headerToken || headerToken !== cookieToken) {
    logger.warn(`CSRF: Token mismatch for ${req.method} ${path} (IP: ${req.ip})`);
    return res.status(403).json({
      success: false,
      message: 'CSRF token invalid. Please refresh the page and try again.'
    });
  }

  // Valid - Token is stable for the session to prevent SPA race conditions
  next();
}

/**
 * Helper: Get CSRF token endpoint for SPAs
 * Mount as: app.get('/api/csrf-token', csrfToken)
 */
function csrfToken(req, res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });
  }
  res.json({ csrfToken: token });
}

module.exports = { csrfProtection, csrfToken };
