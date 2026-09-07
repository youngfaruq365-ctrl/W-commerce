/**
 * SSL/HTTPS Configuration for Production
 * 
 * For production deployment:
 * 1. Get SSL certificate (Let's Encrypt - free)
 * 2. Update .env with SSL certificate paths
 * 3. Server will automatically use HTTPS
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Check if SSL is configured and return options
 */
function getSSLOptions() {
  const { SSL_ENABLED, SSL_CERT_PATH, SSL_KEY_PATH, SSL_CA_PATH, NODE_ENV } = process.env;

  // Only use SSL in production or if explicitly enabled
  if (NODE_ENV !== 'production' && SSL_ENABLED !== 'true') {
    return null;
  }

  if (!SSL_CERT_PATH || !SSL_KEY_PATH) {
    logger.warn('[SSL] SSL enabled but certificates not configured. Using HTTP.');
    return null;
  }

  try {
    const options = {
      cert: fs.readFileSync(path.resolve(SSL_CERT_PATH)),
      key: fs.readFileSync(path.resolve(SSL_KEY_PATH))
    };

    if (SSL_CA_PATH) {
      options.ca = fs.readFileSync(path.resolve(SSL_CA_PATH));
    }

    logger.info('[SSL] SSL certificates loaded successfully');
    return options;
  } catch (error) {
    logger.error('[SSL] Failed to load SSL certificates:', error.message);
    return null;
  }
}

/**
 * Create HTTPS server (for production use)
 */
function createHTTPServer(app, sslOptions) {
  if (!sslOptions) {
    logger.info('[SSL] Running in HTTP mode (no SSL)');
    return null;
  }

  const https = require('https');
  return https.createServer(sslOptions, app);
}

/**
 * Redirect HTTP to HTTPS (for production load balancer)
 */
function createHTTPRedirect(app) {
  app.use((req, res, next) => {
    // Only redirect in production
    if (process.env.NODE_ENV === 'production' && process.env.SSL_ENABLED === 'true') {
      if (!req.secure) {
        return res.redirect(`https://${req.hostname}${req.url}`);
      }
    }
    next();
  });
}

/**
 * Get recommended SSL setup instructions
 */
function getSSLInstructions() {
  return `
=================================================================
                    SSL/HTTPS SETUP GUIDE
=================================================================

Option 1: Let's Encrypt (Free - Recommended)
---------------------------------------------
1. Install Certbot:
   sudo apt install certbot python3-certbot-nginx

2. Generate certificates:
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

3. Update .env:
   SSL_ENABLED=true
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   SSL_CA_PATH=/etc/letsencrypt/live/yourdomain.com/chain.pem

Option 2: Commercial Certificate
---------------------------------
1. Purchase certificate from Comodo, DigiCert, etc.
2. Update .env with your certificate paths

Option 3: Cloudflare (Easiest)
-------------------------------
1. Sign up for Cloudflare (free)
2. Point domain to Cloudflare nameservers
3. Enable "Full SSL" in Cloudflare settings
4. No server-side SSL needed!

=================================================================
  `;
}

module.exports = {
  getSSLOptions,
  createHTTPServer,
  createHTTPRedirect,
  getSSLInstructions
};
