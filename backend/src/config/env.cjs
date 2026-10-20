require('dotenv').config();
const configValidator = require('./validator');
const logger = require('../utils/logger');

// Load and validate configuration BEFORE any other code
configValidator.validate();

// CRITICAL SECURITY AUDIT: Enforce Secret Presence
const WEAK_SECRETS = ['placeholder_secret', 'secret', 'dev_secret', '123456', 'gx_dev_secret_key_998811'];
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || WEAK_SECRETS.includes(JWT_SECRET)) {
    const reason = !JWT_SECRET ? 'NOT DEFINED' : 'WEAK';
    if (process.env.NODE_ENV === 'production') {
        logger.error(`❌ FATAL: JWT_SECRET is ${reason}. Production requires a strong secret. Shutting down.`);
        process.exit(1);
    }
    logger.warn(`⚠️ SECURITY: JWT_SECRET is ${reason}. Using dev fallback — never use in production!`);
}

const BASE_PATH = process.env.BASE_PATH || '';

module.exports = {
    BASE_PATH,
    JWT_SECRET
};
