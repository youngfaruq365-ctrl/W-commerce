/**
 * Environment Configuration Validator
 *
 * Called once at server boot (before any other module).
 * Fails fast with clear, actionable error messages.
 *
 * Validation levels:
 *   REQUIRED  → server refuses to start if missing
 *   WARNING   → server starts but logs a clear warning
 *   INFO      → informational check only
 */

require('dotenv').config();

const WEAK_SECRETS = [
    'secret', 'password', 'changeme', '123456',
    'dev_secret', 'gx_dev_secret_key_998811', 'placeholder_secret',
    'REPLACE_WITH_64_CHAR_HEX_SECRET', 'REPLACE_WITH_32_BYTE_HEX_KEY',
    'REPLACE_WITH_128_CHAR_HEX_GENERATED_BY_SCRIPT',
    'REPLACE_WITH_64_CHAR_HEX_GENERATED_BY_SCRIPT',
];

// Placeholder values that must never reach production
const PLACEHOLDER_PATTERNS = [
    'REPLACE',
    'CHANGE_ME',
    'your-production-domain.com',
    'YOUR_DOMAIN',
    'example.com',
];

class ConfigValidator {
    constructor() {
        this.errors   = [];
        this.warnings = [];
        this.config   = {};
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REQUIRED
    // ──────────────────────────────────────────────────────────────────────────

    validateRequired() {
        const required = {
            PORT:           { default: 5000,          type: 'number' },
            NODE_ENV:       { default: 'development', allowedValues: ['development', 'production', 'staging', 'test'] },
            DATABASE_URL:   { type: 'string' },
            JWT_SECRET:     { type: 'string', minLength: 32 },
            SESSION_SECRET: { type: 'string', minLength: 16 },
        };

        for (const [key, rules] of Object.entries(required)) {
            const value = process.env[key] ?? rules.default;

            if (value === undefined || value === null || value === '') {
                this.errors.push(`❌ REQUIRED: ${key} is not set`);
                continue;
            }

            if (rules.type === 'number') {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    this.errors.push(`❌ TYPE: ${key} must be a number, got "${value}"`);
                } else {
                    this.config[key] = num;
                }
                continue;
            }

            if (rules.minLength && String(value).length < rules.minLength) {
                this.errors.push(`❌ LENGTH: ${key} must be at least ${rules.minLength} characters (got ${String(value).length})`);
                continue;
            }

            if (rules.allowedValues && !rules.allowedValues.includes(value)) {
                this.errors.push(`❌ VALUE: ${key} must be one of [${rules.allowedValues.join(', ')}], got "${value}"`);
                continue;
            }

            this.config[key] = value;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FRONTEND URL
    // ──────────────────────────────────────────────────────────────────────────

    validateFrontendUrl() {
        const isProduction = process.env.NODE_ENV === 'production';
        const url = process.env.FRONTEND_URL || '';

        if (isProduction) {
            if (!url) {
                this.errors.push('❌ FRONTEND_URL: Not set. Required in production for CORS and OAuth redirects.');
                return;
            }

            // Reject known placeholder patterns
            const isPlaceholder = PLACEHOLDER_PATTERNS.some(p => url.includes(p));
            if (isPlaceholder) {
                this.errors.push(`❌ FRONTEND_URL: Still contains a placeholder value ("${url}"). Set your real production domain.`);
                return;
            }

            // Must use HTTPS in production
            if (!url.startsWith('https://')) {
                this.errors.push(`❌ FRONTEND_URL: Must use HTTPS in production. Got: "${url}"`);
                return;
            }

            this.config.FRONTEND_URL = url;
        } else {
            if (!url) {
                this.warnings.push('⚠️ FRONTEND_URL: Not set. Defaulting to http://localhost:5175 for dev.');
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FEATURE FLAGS
    // ──────────────────────────────────────────────────────────────────────────

    validateFeatureFlags() {
        const aiChat = process.env.ENABLE_AI_CHAT;
        if (aiChat !== undefined && aiChat !== 'true' && aiChat !== 'false') {
            this.warnings.push(`⚠️ FEATURE_FLAG: ENABLE_AI_CHAT must be "true" or "false", got "${aiChat}". Defaulting to false.`);
        }
        this.config.ENABLE_AI_CHAT = aiChat === 'true';

        if (process.env.NODE_ENV === 'production' && this.config.ENABLE_AI_CHAT) {
            if (!process.env.GEMINI_API_KEY) {
                this.warnings.push('⚠️ FEATURE_FLAG: ENABLE_AI_CHAT=true but GEMINI_API_KEY is not set. AI routes will degrade gracefully.');
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SECURITY
    // ──────────────────────────────────────────────────────────────────────────

    validateSecurity() {
        const isProduction = process.env.NODE_ENV === 'production';

        // Weak secret detection (both envs)
        for (const key of ['JWT_SECRET', 'SESSION_SECRET']) {
            const val = process.env[key];
            if (val && WEAK_SECRETS.includes(val)) {
                if (isProduction) {
                    this.errors.push(`❌ SECURITY: ${key} is a known weak/placeholder value. Use a strong random secret in production.`);
                } else {
                    this.warnings.push(`⚠️ SECURITY: ${key} is weak. Acceptable for dev but must be changed before production.`);
                }
            }
        }

        // Production-only hardened checks
        if (isProduction) {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
                this.errors.push('❌ SECURITY: JWT_SECRET must be at least 64 characters in production.');
            }
            if (!process.env.AES_ENCRYPTION_KEY) {
                this.warnings.push('⚠️ SECURITY: AES_ENCRYPTION_KEY not set. Sensitive field encryption is disabled.');
            }
            if (!process.env.FILE_ENCRYPTION_KEY) {
                this.warnings.push('⚠️ SECURITY: FILE_ENCRYPTION_KEY not set. File encryption is disabled.');
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DATABASE
    // ──────────────────────────────────────────────────────────────────────────

    validateDatabase() {
        const url = process.env.DATABASE_URL || '';
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && url.startsWith('file:')) {
            this.errors.push('❌ DATABASE: SQLite (file:) is not allowed in production. Use PostgreSQL.');
        }

        if (!isProduction && url.startsWith('file:')) {
            this.config.DATABASE_DRIVER = 'sqlite';
        } else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
            this.config.DATABASE_DRIVER = 'postgresql';
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REDIS
    // ──────────────────────────────────────────────────────────────────────────

    validateRedis() {
        const isProduction = process.env.NODE_ENV === 'production';

        if (process.env.REDIS_URL) {
            this.config.REDIS_CONFIGURED = true;
        } else if (isProduction) {
            this.errors.push('❌ REDIS: REDIS_URL is required in production for session persistence and rate limiting.');
        } else {
            this.warnings.push('⚠️ REDIS: REDIS_URL not set. Using in-memory session store (data lost on restart). Set REDIS_URL for persistence.');
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PAYMENT GATEWAYS
    // ──────────────────────────────────────────────────────────────────────────

    validatePaymentGateways() {
        const gateways = {
            Paystack:  ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
            Stripe:    ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
            Monnify:   ['MONNIFY_API_KEY', 'MONNIFY_SECRET_KEY', 'MONNIFY_CONTRACT_CODE'],
            RevenueCat: ['REVENUECAT_API_KEY', 'REVENUECAT_WEBHOOK_SECRET']
        };

        let hasValidGateway = false;

        for (const [name, keys] of Object.entries(gateways)) {
            const missing = keys.filter(k => !process.env[k]);
            if (missing.length === 0) {
                this.config[`${name.toUpperCase()}_CONFIGURED`] = true;
                hasValidGateway = true;
            } else if (missing.length < keys.length) {
                // Partially configured — more dangerous than fully missing
                this.warnings.push(`⚠️ PAYMENT: ${name} is partially configured (missing: ${missing.join(', ')}). This gateway will fail at runtime.`);
            } else {
                this.warnings.push(`⚠️ PAYMENT: ${name} not configured (missing all keys).`);
            }
        }

        if (!hasValidGateway) {
            this.warnings.push('⚠️ PAYMENT: No payment gateway is fully configured. All payment operations will fail.');
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // EMAIL
    // ──────────────────────────────────────────────────────────────────────────

    validateEmail() {
        if (process.env.SENDGRID_API_KEY) {
            this.config.SENDGRID_CONFIGURED = true;
        } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.config.SMTP_CONFIGURED = true;
        } else {
            this.warnings.push('⚠️ EMAIL: No email provider configured (no SENDGRID_API_KEY or SMTP_HOST). Email will be logged to console.');
            this.config.ALLOW_EMAIL_SIMULATION = true;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SMS
    // ──────────────────────────────────────────────────────────────────────────

    validateSMS() {
        const provider = (process.env.SMS_PROVIDER || 'SIMULATION').toUpperCase();
        const isProduction = process.env.NODE_ENV === 'production';
        const allowSimInProd = process.env.ALLOW_SMS_SIMULATION_IN_PRODUCTION === 'true';
        const required = {
            TWILIO: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SID'],
            TERMII: ['TERMII_API_KEY'],
        };

        const flagSimulation = (reason) => {
            this.config.ALLOW_SMS_SIMULATION = true;
            if (isProduction && !allowSimInProd) {
                this.errors.push(`❌ SMS: ${reason} Phone OTP/2FA will never reach users. Configure a real provider or set ALLOW_SMS_SIMULATION_IN_PRODUCTION=true to override.`);
            } else {
                this.warnings.push(`⚠️ SMS: ${reason} OTP codes will be logged to console only.`);
            }
        };

        if (required[provider]) {
            const missing = required[provider].filter(k => !process.env[k]);
            if (missing.length === 0) {
                this.config[`${provider}_CONFIGURED`] = true;
            } else {
                flagSimulation(`SMS_PROVIDER=${provider} but missing: ${missing.join(', ')}.`);
            }
        } else {
            flagSimulation(`SMS_PROVIDER=${provider}.`);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WEBAUTHN / PASSKEYS
    // ──────────────────────────────────────────────────────────────────────────

    validateWebAuthn() {
        const rpId   = process.env.WEBAUTHN_RP_ID;
        const origin = process.env.WEBAUTHN_ORIGIN;
        const rpName = process.env.WEBAUTHN_RP_NAME;

        if (rpId && origin && rpName) {
            this.config.WEBAUTHN_CONFIGURED = true;

            // In production, RP_ID should NOT be 'localhost'
            if (process.env.NODE_ENV === 'production' && rpId === 'localhost') {
                this.errors.push('❌ WEBAUTHN: WEBAUTHN_RP_ID cannot be "localhost" in production. Set it to your domain (e.g. yourdomain.com).');
            }
            if (process.env.NODE_ENV === 'production' && origin.startsWith('http://')) {
                this.errors.push('❌ WEBAUTHN: WEBAUTHN_ORIGIN must use HTTPS in production.');
            }
        } else {
            this.warnings.push('⚠️ WEBAUTHN: WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, or WEBAUTHN_ORIGIN not set. Passkey login/registration will use defaults (localhost). Set these vars in production.');
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // OPTIONAL SERVICES
    // ──────────────────────────────────────────────────────────────────────────

    validateOptionalServices() {
        // Google OAuth
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            this.config.GOOGLE_OAUTH_CONFIGURED = true;
        } else {
            this.warnings.push('⚠️ SOCIAL_AUTH: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Google login disabled.');
        }

        // Gemini AI
        if (process.env.GEMINI_API_KEY) {
            this.config.GEMINI_CONFIGURED = true;
        } else {
            this.warnings.push('⚠️ AI: GEMINI_API_KEY not set. AI assistant features will return 501.');
        }

        // Google Maps
        if (process.env.GOOGLE_MAPS_API_KEY) {
            this.config.MAPS_CONFIGURED = true;
        } else {
            this.warnings.push('⚠️ MAPS: GOOGLE_MAPS_API_KEY not set. Delivery routing will use mock coordinates.');
        }

        // Push Notifications
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            this.config.PUSH_CONFIGURED = true;
        } else {
            this.warnings.push('⚠️ PUSH: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set. Web push notifications disabled.');
        }

        // Storage
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            this.config.CLOUDINARY_CONFIGURED = true;
        } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET_NAME) {
            this.config.S3_CONFIGURED = true;
        } else {
            if (process.env.NODE_ENV === 'production') {
                this.errors.push('❌ STORAGE: No Cloudinary or S3 configured. Local uploads are wiped on redeploy — set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
            } else {
                this.warnings.push('⚠️ STORAGE: No cloud storage configured (no Cloudinary or S3). Files will be stored locally under backend/storage/uploads/.');
            }
        }

        // Exchange Rate
        if (!process.env.EXCHANGE_RATE_API_KEY) {
            this.warnings.push('⚠️ EXCHANGE_RATE: EXCHANGE_RATE_API_KEY not set. Multi-currency wallet conversion will use fallback rates.');
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PLATFORM ECONOMICS
    // ──────────────────────────────────────────────────────────────────────────

    validatePlatformEconomics() {
        const rate = parseFloat(process.env.PLATFORM_COMMISSION_RATE);
        if (isNaN(rate) || rate < 0 || rate > 1) {
            this.warnings.push('⚠️ ECONOMICS: PLATFORM_COMMISSION_RATE is not set or invalid. Defaulting to 0.05 (5%).');
            this.config.PLATFORM_COMMISSION_RATE = 0.05;
        } else {
            this.config.PLATFORM_COMMISSION_RATE = rate;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RUN ALL VALIDATIONS
    // ──────────────────────────────────────────────────────────────────────────

    validate() {
        console.log('\n════════════════════════════════════════════════════');
        console.log('    🔍 W-COMMERCE — ENVIRONMENT VALIDATION');
        console.log(`    ENV: ${process.env.NODE_ENV || 'development'} | PORT: ${process.env.PORT || 5000}`);
        console.log('════════════════════════════════════════════════════\n');

        this.validateRequired();
        this.validateSecurity();
        this.validateDatabase();
        this.validateRedis();
        this.validateFrontendUrl();
        this.validateFeatureFlags();
        this.validatePaymentGateways();
        this.validateEmail();
        this.validateSMS();
        this.validateWebAuthn();
        this.validateOptionalServices();
        this.validatePlatformEconomics();

        if (this.warnings.length > 0) {
            console.log('⚠️  WARNINGS (server will start, but review these):');
            this.warnings.forEach(w => console.log('   ' + w));
            console.log('');
        }

        if (this.errors.length > 0) {
            console.error('❌ FATAL ERRORS (server cannot start):');
            this.errors.forEach(e => console.error('   ' + e));
            console.error('\n════════════════════════════════════════════════════');
            console.error('❌ Fix the above errors and restart the server.');
            console.error('════════════════════════════════════════════════════\n');
            process.exit(1);
        }

        const gatewayCount = ['PAYSTACK', 'STRIPE', 'MONNIFY'].filter(g => this.config[`${g}_CONFIGURED`]).length;
        process.stdout.write(`✅ Validation passed | Gateways: ${gatewayCount} | DB: ${this.config.DATABASE_DRIVER || 'unknown'} | Redis: ${this.config.REDIS_CONFIGURED ? 'yes' : 'no (in-memory)'}\n`);
        process.stdout.write('════════════════════════════════════════════════════\n\n');

        return this.config;
    }
}

module.exports = new ConfigValidator();
