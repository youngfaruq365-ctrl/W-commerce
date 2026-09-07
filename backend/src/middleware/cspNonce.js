/**
 * CSP Nonce Middleware
 *
 * Generates a cryptographically random nonce per request.
 * The nonce is attached to res.locals.cspNonce and injected into
 * Content-Security-Policy headers, replacing blanket 'unsafe-inline'.
 *
 * Usage in server.cjs:
 *   const { cspNonce, buildCspHeader } = require('./src/middleware/cspNonce');
 *   app.use(cspNonce);   // MUST come before helmet()
 *   // Then pass nonceForRequest to helmet's csp directives via scriptSrc nonce.
 */

const crypto = require('crypto');

/**
 * Middleware: generate a fresh nonce for every HTTP request.
 * The nonce is available as res.locals.cspNonce downstream.
 */
function cspNonce(req, res, next) {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
}

/**
 * Build a full Content-Security-Policy header string for a given nonce.
 * Removes 'unsafe-inline' for script-src; style-src retains it because
 * Tailwind CSS injects styles at runtime (migrate to hashes in a future pass).
 *
 * @param {string} nonce        - base64 nonce for this request
 * @param {boolean} production  - whether to add upgrade-insecure-requests
 * @returns {string}            - full CSP header value
 */
function buildCspHeader(nonce, production = false) {
    const directives = [
        `default-src 'self'`,
        // Scripts: nonce replaces 'unsafe-inline'
        `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://cdn.jsdelivr.net https://accounts.google.com https://appleid.cdn-apple.com`,
        // Inline event handlers still require unsafe-hashes or nonce on attrs;
        // for now, script-src-attr is tightened to nonce only.
        `script-src-attr 'nonce-${nonce}'`,
        // Styles: 'unsafe-inline' kept for Tailwind JIT; harden in a later pass.
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
        `font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:`,
        `img-src 'self' data: blob: https:`,
        `connect-src 'self' https://api.stripe.com https://accounts.google.com https://api.exchangerate-api.com wss: ws:`,
        `frame-src 'self' https://js.stripe.com https://accounts.google.com`,
        `media-src 'self'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `frame-ancestors 'self'`,
        `form-action 'self'`,
    ];

    if (production) {
        directives.push('upgrade-insecure-requests');
    }

    return directives.join('; ');
}

module.exports = { cspNonce, buildCspHeader };
