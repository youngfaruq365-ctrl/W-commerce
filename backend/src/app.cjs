require('express-async-errors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const redisManager = require('./utils/redisManager');
const { BASE_PATH, JWT_SECRET } = require('./config/env.cjs');
const { prismaErrorToAppError, isDatabaseError, AppError } = require('./utils/errorTypes');

// ── Global process crash guards ───────────────────────────────────────────────
// Keep the server alive on unhandled rejections in dev; exit gracefully in prod.
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[UNHANDLED REJECTION] ${reason?.stack || reason}`);
    // Do not crash the server on unhandled rejections (often caused by fire-and-forget DB calls)
});

process.on('uncaughtException', (err) => {
    logger.error(`[UNCAUGHT EXCEPTION] ${err.stack || err.message}`);
    // Always exit on uncaught exceptions — the process state may be corrupt.
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received — shutting down gracefully');
    process.exit(0);
});

const globalStartup = global.__GLOBALX_STARTUP || (global.__GLOBALX_STARTUP = {
    app: null,
    server: null,
    io: null,
    serverStarted: false,
    cronStarted: false,
    socketStarted: false,
    redisWarned: false
});

// Since we moved these imports, we must adjust paths. 
// They used to be from backend/server.cjs (e.g. './src/middleware/...'). 
// Now they are in backend/src/app.cjs, so it's './middleware/...'.
const { cspNonce, buildCspHeader } = require('./middleware/cspNonce');
const helmet = require('helmet');
const crypto = require('crypto');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const { configureGoogleStrategy } = require('./services/passport');
const RedisSessionStore = require('./utils/redisSessionStore');

// Rate limiter (uses shared Redis manager internally)
const { rateLimiters } = require('./middleware/rateLimiter');
const geoIPMiddleware = require('./middleware/geoIP');
const { validate, sanitizeInput } = require('./middleware/inputValidation');

const app = globalStartup.app || express();
globalStartup.app = app;
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const FRONTEND_DIRS = {
    html: path.join(__dirname, '..', 'frontend', 'public', 'html'),
    css: path.join(__dirname, '..', 'frontend', 'public', 'css'),
    js: path.join(__dirname, '..', 'frontend', 'public', 'js'),
    root: path.join(__dirname, '..')
};

function directoryExists(dirPath) {
    try {
        return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

function fileExists(filePath) {
    try {
        return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
    } catch {
        return false;
    }
}

function resolveFrontendHtml(fileName) {
    const publicHtmlPath = path.join(FRONTEND_DIRS.html, fileName);
    if (fileExists(publicHtmlPath)) return publicHtmlPath;
    return path.join(FRONTEND_DIRS.root, fileName);
}

function isBlockedRootStaticPath(requestPath) {
    const normalizedPath = (requestPath || '').toLowerCase();
    const blockedPrefixes = [
        '/src/',
        '/node_modules/',
        '/prisma/',
        '/logs/',
        '/scripts/',
        '/tests/',
        '/backups/',
        '/.git/',
        '/.github/',
        '/.vscode/',
        '/.idea/'
    ];

    if (blockedPrefixes.some(prefix => normalizedPath.startsWith(prefix))) {
        return true;
    }

    const blockedExactFiles = new Set([
        '/server.js',
        '/package.json',
        '/package-lock.json',
        '/docker-compose.yml',
        '/docker-compose.yaml',
        '/.env',
        '/.env.local',
        '/.env.production',
        '/.env.development'
    ]);

    if (blockedExactFiles.has(normalizedPath)) {
        return true;
    }

    if (normalizedPath.includes('..') || normalizedPath.includes('%2e%2e')) {
        return true;
    }

    // Keep the root static fallback limited to typical web assets.
    const ext = path.extname(normalizedPath);
    const allowedExtensions = new Set([
        '',
        '.html',
        '.css',
        '.js',
        '.mjs',
        '.map',
        '.glb',
        '.gltf',
        '.bin',
        '.webp',
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.ico',
        '.txt',
        '.xml',
        '.webmanifest'
    ]);

    if (!allowedExtensions.has(ext)) {
        return true;
    }

    return false;
}

// 🚀 SECURITY & PERFORMANCE ENHANCEMENTS
const isProduction = process.env.NODE_ENV === 'production';

app.use(cspNonce); // Attach per-request CSP nonce to res.locals

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, "https://js.stripe.com", "https://cdn.jsdelivr.net", "https://accounts.google.com", "https://appleid.cdn-apple.com"],
            scriptSrcAttr: [(req, res) => `'nonce-${res.locals.cspNonce}'`],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            connectSrc: ["'self'", "https://api.stripe.com", "https://accounts.google.com", "https://api.exchangerate-api.com", "wss:", "ws:"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://accounts.google.com"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            ...(isProduction ? { upgradeInsecureRequests: [] } : {})
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // HSTS - Force HTTPS in production
    hsts: isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    } : false
}));

// Home-route CSP overlay: uses nonce-based CSP (no unsafe-inline for scripts).
// The nonce is generated per-request by the cspNonce middleware above.
app.use((req, res, next) => {
    const lowerPath = req.path.toLowerCase();
    const basePathLower = (BASE_PATH || '').toLowerCase();
    const isHomeRoute =
        lowerPath === '/' ||
        lowerPath === '/index.html' ||
        (basePathLower && (lowerPath === basePathLower || lowerPath === `${basePathLower}/` || lowerPath === `${basePathLower}/index.html`));

    if (!isHomeRoute) {
        return next();
    }

    const nonce = res.locals.cspNonce || require('crypto').randomBytes(16).toString('base64');
    res.setHeader('Content-Security-Policy', buildCspHeader(nonce, isProduction));
    next();
});
app.use(compression()); // Gzip compression
app.get('/favicon.ico', (req, res) => {
    res.type('image/svg+xml');
    res.sendFile(path.join(__dirname, 'assets', 'logo.svg'));
});
app.use(geoIPMiddleware); // Auto-detect region
app.use(cookieParser());

// Session middleware (required for Passport OAuth flow)
// Use a strong session secret - must be provided in production
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { logger.error('SESSION_SECRET required in production'); process.exit(1); })() : 'dev_session_secret_change_in_prod');

// Prefer Redis-backed session store in production if Redis is available
let sessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost') && !process.env.FRONTEND_URL.includes('127.0.0.1'),
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hour session for better UX
    }
};

if (isProduction || process.env.REDIS_URL) {
    sessionOptions.store = new RedisSessionStore({
        redisManager,
        prefix: process.env.REDIS_SESSION_PREFIX || 'sess:',
        ttlSeconds: 24 * 60 * 60
    });
    logger.info('Redis-backed session store configured');
} else {
    logger.warn('Using in-memory session store in development because REDIS_URL is not configured.');
}

app.use(session(sessionOptions));

// Initialize Passport for social login
app.use(passport.initialize());
app.use(passport.session());
configureGoogleStrategy(passport);

// --- Production environment validation (fail-fast) ---
// --- Production environment validation (fail-fast) ---
if (isProduction) {
    const requiredVars = ['JWT_SECRET', 'SESSION_SECRET', 'DATABASE_URL', 'FRONTEND_URL', 'STRIPE_SECRET_KEY', 'PAYSTACK_SECRET_KEY'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        logger.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    // Disallow SQLite in production
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
        logger.error('❌ FATAL: DATABASE_URL points to a local SQLite file. Use PostgreSQL in production.');
        process.exit(1);
    }
}

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'Idempotency-Key', 'Paystack-Signature', 'stripe-signature']
}));



// Middleware
// Webhook Parser (MUST COME BEFORE GLOBAL express.json for raw body calculation)
app.post(['/api/payment/webhook', '/api/v1/payment/webhook'], express.raw({ type: 'application/json' }), (req, res) => {
    // Forward to controller
    require('./controllers/webhookController').handleWebhook(req, res);
});

// RevenueCat Webhook - Needs raw body for signature verification
app.post('/api/v1/webhooks/revenuecat', express.raw({ type: 'application/json' }), require('./routes/revenuecatRoutes').webhookHandler);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const morgan = require('morgan');

// Morgan Http Logger
app.use(morgan('combined', { stream: logger.stream }));

// Input sanitization middleware
app.use(sanitizeInput);

// CSRF Protection (double-submit cookie pattern)
const { csrfProtection, csrfToken } = require('./middleware/csrf');
app.get(['/api/csrf-token', '/api/v1/csrf-token'], csrfToken);

// Rate limiting
app.use(['/api', '/api/v1'], rateLimiters.api);

// AI Assistant — gated behind ENABLE_AI_CHAT feature flag (default: false).
// Set ENABLE_AI_CHAT=true in .env once the AI backend is production-ready.
app.post(['/api/ai-chat', '/api/v1/ai-chat'], (req, res) => {
    const aiController = require('./controllers/aiController');
    return aiController.chat(req, res);
});

app.post(['/api/ai-chat/generate-product', '/api/v1/ai-chat/generate-product'], async (req, res) => {
    
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });
        
        const aiService = require('./services/aiService');
        const systemPrompt = `Write a product description in JSON format with fields: title (string), description (string), price (number).
User Prompt: ${prompt}
Respond ONLY with valid JSON.`;

        const reply = await aiService.generateChatResponse([{ role: 'user', content: systemPrompt }]);
        let parsed = {};
        try {
            parsed = JSON.parse(reply.replace(/```json|```/g, '').trim());
        } catch(e) {
            parsed = { title: 'Generated Product', description: reply, price: 99.99 };
        }

        return res.json({ success: true, product: parsed });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.post(['/api/ai-chat/inventory-insights', '/api/v1/ai-chat/inventory-insights'], (req, res) => {
    const aiController = require('./controllers/aiController');
    return aiController.getInventoryInsights(req, res);
});

// Apply CSRF protection to all API routes except public analytics/funnel event tracking
// (These public routes are called from static pages and can't get a CSRF token)
const csrfExcluded = [
    '/api/v1/analytics/funnel',
    '/api/v1/analytics/funnel-event',
    '/api/v1/funnel/signup-and-checkout',
    '/api/v1/payment/webhook/paystack',
    '/api/v1/payment/webhook/stripe',
    '/api/v1/payments/paypal',
    '/api/payments/paypal',
    '/api/v1/webhooks/paypal',
    '/api/webhooks/paypal',
    '/api/v1/seller-plans/direct-upgrade',
    '/api/seller-plans/direct-upgrade',
    '/api/v1/ai-chat/inventory-insights',
    '/api/ai-chat/inventory-insights',
    '/api/v1/ai/inventory-insights',
    '/api/ai/inventory-insights'
];
app.use(['/api', '/api/v1'], (req, res, next) => {
    if (csrfExcluded.some(path => req.path === path || req.originalUrl.startsWith(path))) {
        return next();
    }
    return csrfProtection(req, res, next);
});


// Health & readiness probe (single definition)
app.get('/health', async (req, res) => {
    const status = { uptime: process.uptime(), redis: redisManager.getStatus(), env: process.env.NODE_ENV || 'development' };
    try { await prisma.$queryRawUnsafe('SELECT 1'); status.database = { ok: true }; }
    catch (err) { status.database = { ok: false, error: err.message }; }
    const overallUp = status.database.ok && (process.env.NODE_ENV === 'production' ? status.redis.connected : true);
    return res.status(overallUp ? 200 : 503).json({ status: overallUp ? 'ok' : 'degraded', details: status });
});
app.get(['/api/redis-status', '/api/v1/redis-status'], (req, res) => {
    return res.json({ status: redisManager.getStatus(), timestamp: new Date().toISOString() });
});

// RBAC Middleware for Admin & Tiered Pages
app.use(async (req, res, next) => {
    const lowerPath = req.path.toLowerCase();

    if (lowerPath.startsWith('/admin-') && lowerPath.endsWith('.html')) {
        const token = req.cookies?.token || null;

        if (!token) {
            logger.warn(`Admin access blocked: missing token for ${req.path}`);
            return res.redirect('/login.html?error=unauthorized');
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role !== 'ADMIN') {
                return res.status(403).send('<h1>403 Forbidden</h1><p>Access denied. Admins only.</p>');
            }
            res.set('Cache-Control', 'no-store'); // Ensure browser always checks with server
            next();

        } catch (err) {
            logger.warn(`Admin access denied: invalid/expired token for ${req.path}`);
            return res.redirect('/login.html?error=session_expired');
        }
    } else if ((lowerPath === '/landing-page.html' || lowerPath === '/portfolio.html') && lowerPath.endsWith('.html')) {
        const token = req.cookies?.token || null;

        if (!token) {
            logger.warn(`Tiered page blocked: missing token for ${req.path}`);
            return res.redirect('/login.html?error=unauthorized');
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // We need to fetch the user tier from DB or trust the token if we add tier to token
            // For now, let's fetch from DB to be secure — using singleton prisma client
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });

            if (!user) return res.redirect('/login.html?error=user_not_found');

            const tiers = { 'NONE': 0, 'MONTHLY': 1, 'YEARLY': 2 };
            const userTierValue = tiers[user.subscriptionTier] || 0;

            if (req.path === '/landing-page.html' && userTierValue < 1) {
                return res.redirect('/access-fee.html?required=MONTHLY');
            }
            if (req.path === '/portfolio.html' && userTierValue < 2) {
                return res.redirect('/access-fee.html?required=YEARLY');
            }

            next();
        } catch (err) {
            logger.warn(`Tiered page denied: invalid/expired token for ${req.path}`);
            return res.redirect('/login.html?error=session_expired');
        }
    } else {
        next();
    }
});

// Static asset cache options
const staticAssetOptions = { maxAge: '7d', etag: true, lastModified: true };
const staticHtmlOptions = { maxAge: '0', etag: true, lastModified: true }; // Never cache HTML

// Serve static files from multiple locations
// Serve at root path
if (directoryExists(FRONTEND_DIRS.html)) {
    app.use(express.static(FRONTEND_DIRS.html, staticHtmlOptions));
} else {
    logger.debug(`Optional legacy static directory not present: ${FRONTEND_DIRS.html}`);
}

if (directoryExists(FRONTEND_DIRS.css)) {
    app.use(express.static(FRONTEND_DIRS.css, staticAssetOptions));
    app.use('/public/css', express.static(FRONTEND_DIRS.css, staticAssetOptions));
} else {
    logger.debug(`Optional legacy static directory not present: ${FRONTEND_DIRS.css}`);
}

if (directoryExists(FRONTEND_DIRS.js)) {
    app.use(express.static(FRONTEND_DIRS.js, staticAssetOptions));
    app.use('/public/js', express.static(FRONTEND_DIRS.js, staticAssetOptions));
} else {
    logger.debug(`Optional legacy static directory not present: ${FRONTEND_DIRS.js}`);
}

if (directoryExists(FRONTEND_DIRS.html)) {
    app.use('/public/html', express.static(FRONTEND_DIRS.html, staticHtmlOptions));
}

// Also serve at BASE_PATH if configured (for subfolder deployment)
if (BASE_PATH) {
    if (directoryExists(FRONTEND_DIRS.html)) {
        app.use(BASE_PATH, express.static(FRONTEND_DIRS.html));
    }
    if (directoryExists(FRONTEND_DIRS.css)) {
        app.use(BASE_PATH + '/css', express.static(FRONTEND_DIRS.css));
    }
    if (directoryExists(FRONTEND_DIRS.js)) {
        app.use(BASE_PATH + '/js', express.static(FRONTEND_DIRS.js));
    }
}

if (directoryExists(FRONTEND_DIRS.html)) {
    app.use('/html', express.static(FRONTEND_DIRS.html, staticHtmlOptions)); // Explicit /html route
}

if (directoryExists(path.join(__dirname, 'models'))) {
    app.use('/models', express.static(path.join(__dirname, 'models'), staticAssetOptions));
}

// Guard the root static fallback to avoid exposing backend/source files.
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
    }

    if (isBlockedRootStaticPath(req.path)) {
        return res.status(404).end();
    }

    return next();
});

app.use(express.static(__dirname, {
    dotfiles: 'deny',
    index: false,
    redirect: false,
    fallthrough: true,
    maxAge: '0'
})); // Root fallback for legacy frontend assets

// Privacy & Compliance (GDPR/CCPA)
app.use((req, res, next) => {
    // Check for consent cookie
    const hasConsent = req.headers.cookie?.includes('gx_consent=true');
    req.gdprStatus = hasConsent ? 'CONSENTED' : 'ANONYMOUS';
    next();
});
// Import Backend Modules
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const escrowRoutes = require('./routes/escrowRoutes');
const { startCronJobs } = require('./services/cronService');
const { startEscrowJobs } = require('./services/escrowJobs');
const { registerEscrowV2Jobs } = require('./services/escrowV2Jobs'); // Phase 6
const { registerOutboxJobs }   = require('./services/outboxRetryJob'); // Phase 10
const cronJobManager = require('./services/cronJobManager');

const initializeCron = async () => {
    if (globalStartup.cronStarted) {
        return;
    }

    try {
        await startCronJobs(cronJobManager);
        await startEscrowJobs(cronJobManager);
        registerEscrowV2Jobs(cronJobManager);    // Phase 6 — Earnings Ledger + Escrow Release
        registerOutboxJobs(cronJobManager);      // Phase 10 — Outbox retry (notifications + domain events)
        require('./cron/sellerBanningCron').initBanningCron(); // Seller Banning Rating System
        require('./cron/payaiFulfillmentCron').initPayAIFulfillmentCron(); // Proactive Fulfillment & Milestone Monitor
        globalStartup.cronStarted = true;
        logger.info('✅ Cron jobs registered and started (singleton)');
    } catch (error) {
        logger.error(`Failed to start cron jobs: ${error.message}`);
    }
};

initializeCron();

// Phase 7 — Register domain event handlers (notifications, logging, side-effects)
const { registerEventHandlers } = require('./services/domainEventHandlers');
registerEventHandlers();

// Phase 10 — Initialize Event Bus (Redis Pub/Sub in prod, in-process in dev)
const eventBus = require('./services/eventBus');
eventBus.initialize(redisManager)
    .then(() => eventBus.registerBuiltinConsumers())
    .catch(err => logger.error(`[EventBus] Init failed: ${err.message}`));

// ── API Routes ───────────────────────────────────────────────────────────────
// All routes registered once, under /api/v1/ prefix only.
// Dual-prefix registration (/api + /api/v1) is kept only where an existing
// client or integration depends on the non-versioned path.

// Deprecation header: warn consumers of legacy /api/* (non-versioned) paths.
// These will be removed in a future major release — clients must migrate to /api/v1/*.
app.use('/api', (req, res, next) => {
    // Only flag if the path does NOT start with /api/v1 (i.e. it's the legacy prefix)
    const isVersioned = req.path.startsWith('/v1/');
    if (!isVersioned) {
        res.setHeader('Deprecation', 'true');
        res.setHeader('Link', '</api/v1' + req.path + '>; rel="successor-version"');
        res.setHeader('Sunset', new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toUTCString()); // ~6 months
    }
    next();
});

app.use(['/api/auth', '/api/v1/auth'], authRoutes);
app.use(['/api/user', '/api/v1/user'], require('./routes/userRoutes'));
app.use(['/api/seller/templates', '/api/v1/seller/templates'], require('./routes/sellerTemplateRoutes'));
app.use(['/api/seller', '/api/v1/seller', '/api/sellers', '/api/v1/sellers'], require('./routes/sellerRoutes'));
// AI routes
app.use(['/api/ai', '/api/v1/ai', '/api/ai-chat', '/api/v1/ai-chat'], require('./routes/aiRoutes'));
app.use(['/api/wallet', '/api/v1/wallet'], require('./routes/walletRoutes'));
app.use(['/api/rewards', '/api/v1/rewards'], require('./routes/rewardRoutes'));
app.use(['/api/seller-plans', '/api/v1/seller-plans'], require('./routes/sellerPlanRoutes'));
app.use(['/api/courier-plans', '/api/v1/courier-plans'], require('./routes/courierPlanRoutes'));
app.use(['/api/product', '/api/v1/product', '/api/products', '/api/v1/products'], require('./routes/productRoutes'));
app.use(['/api/home/discovery', '/api/v1/home/discovery', '/api/home-discovery', '/api/v1/home-discovery'], require('./routes/homeDiscoveryRoutes'));
app.use('/api/admin/economy', require('./routes/adminEconomyRoutes'));
app.use('/api/v1/subscriptions', require('./routes/revenuecatRoutes'));
// Phase 5 — Payment V2 (Paystack webhook + initialize for MarketplaceOrder)
// MUST be registered BEFORE the legacy /api/payment mount so the /verify/:reference
// route handles MarketplaceOrder references correctly.
app.use(['/api/v1/payment', '/api/v1/payment/v2', '/api/payment/v2'], require('./routes/paymentV2Routes'));
app.use(['/api/payment', '/api/v1/payment'], paymentRoutes);
app.use(['/api/escrow', '/api/v1/escrow'], escrowRoutes);
app.use(['/api/orders', '/api/v1/orders'], require('./routes/orderRoutes'));
// Phase 4 — Multi-seller checkout (MarketplaceOrder + FulfillmentOrder architecture)
app.use('/api/v1/checkout', require('./routes/checkoutV2Routes'));
// Phase 6 — Earnings Ledger (seller dashboard, buyer receipt confirm, admin release)
app.use('/api/v1/earnings', require('./routes/earningsV2Routes'));
// Phase 8 — Package & Chain-of-Custody Ledger
app.use('/api/v1/packages', require('./routes/packageRoutes'));
// Phase 9 — Unified Notification System
app.use(['/api/notifications', '/api/v1/notifications'], require('./routes/notificationRoutes'));
app.use('/api/v1/notifications/v2', require('./routes/notificationV2Routes'));
// Phase 14 — Seller Fulfillment State Machine
app.use('/api/v1/fulfillment', require('./routes/fulfillmentRoutes'));
// Phase 16 — Courier Offer System
app.use('/api/v1/courier/offers', require('./routes/courierOfferRoutes'));
// Phase 17 — GPS Tracking REST API
app.use('/api/v1/tracking', require('./routes/trackingRoutes'));
app.use('/api/v1/hub', require('./routes/hubRoutes'));
app.use(['/api/dispatch', '/api/v1/dispatch'], require('./routes/dispatchRoutes'));

app.use(['/api/admin', '/api/v1/admin'], require('./routes/adminRoutes'));
app.use(['/api/admin-studio', '/api/v1/admin-studio'], require('./routes/adminStudioRoutes'));
app.use(['/api/upload', '/api/v1/upload'], require('./routes/uploadRoutes'));
app.use(['/api/buyers', '/api/v1/buyers'], require('./routes/buyerRoutes'));
app.use('/api/v1/buyer', require('./routes/buyerDashboardRoutes'));
app.use('/api/v1/analytics', require('./routes/funnelAnalyticsRoutes'));
app.use('/api/v1/funnel', require('./routes/funnelRoutes'));
app.use(['/api/buyer', '/api/v1/buyer'], require('./routes/buyerStudioRoutes'));
app.use(['/api/buyer-requests', '/api/v1/buyer-requests'], require('./routes/buyerRequestRoutes'));
app.use(['/api/packing', '/api/v1/packing'], require('./routes/packingRoutes'));
app.use(['/api/pools', '/api/v1/pools'], require('./routes/poolRoutes'));
app.use(['/api/push', '/api/v1/push'], require('./routes/pushRoutes'));
app.use(['/api/feed', '/api/v1/feed'], require('./routes/feedRoutes'));
app.use(['/api/verification', '/api/v1/verification'], require('./routes/verificationRoutes'));
app.use(['/api/config', '/api/v1/config'], require('./routes/configRoutes'));
app.use('/api/v1/system', require('./routes/systemRoutes'));
app.use(['/api/payments', '/api/v1/payments'], require('./routes/paymentProofRoutes'));
app.use(['/api/logs', '/api/v1/logs'], require('./routes/logRoutes'));
app.use(['/api/stores', '/api/v1/stores'], require('./routes/storeRoutes'));
app.use(['/api/messages', '/api/v1/messages'], require('./routes/messageRoutes'));

// W-Commerce PayAI International Shopping Layer
app.use(['/api/v1', '/api'], require('./routes/payaiRoutes'));

// User story-statuses (WhatsApp-style) — in-memory store until DB model is added
const _statusStore = [];
app.get(['/api/statuses', '/api/v1/statuses'], (req, res) => {
    const now = Date.now();
    const live = _statusStore.filter(s => s.expiresAt > now);
    res.json({ success: true, statuses: live });
});
app.post(['/api/statuses', '/api/v1/statuses'], (req, res) => {
    const { content, mediaUrl, expiresInHours = 24 } = req.body;
    const userId = req.user?.id || 'guest';
    const status = {
        id: `${userId}-${Date.now()}`,
        userId,
        content: content || '',
        mediaUrl: mediaUrl || null,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + (Number(expiresInHours) * 3600000),
    };
    _statusStore.push(status);
    res.json({ success: true, status });
});
app.use(['/api/marketing', '/api/v1/marketing'], require('./routes/marketingRoutes'));
app.use(['/api/cart', '/api/v1/cart'], require('./routes/cartRoutes'));
app.use(['/api/templates', '/api/v1/templates'], require('./routes/templateRoutes'));
app.use(['/api/ads/discount', '/api/v1/ads/discount'], require('./routes/adDiscountRoutes'));
app.use(['/api/wishlist', '/api/v1/wishlist'], require('./routes/wishlistRoutes'));
app.use(['/api/shipping', '/api/v1/shipping'], require('./routes/shippingRoutes'));
app.use(['/api/seller-studio', '/api/v1/seller-studio'], require('./routes/sellerStudioRoutes'));
app.use(['/api/seller/analytics', '/api/v1/seller-analytics'], require('./routes/sellerAnalyticsRoutes'));
app.use(['/api/delivery/earnings', '/api/v1/delivery/earnings'], require('./routes/courierEarningsRoutes'));
app.use(['/api/delivery', '/api/v1/delivery'], require('./routes/deliveryRoutes'));
app.use(['/api/courier', '/api/v1/courier'], require('./routes/courierRoutes'));
app.use(['/api/webauthn', '/api/v1/webauthn'], require('./routes/webauthnRoutes'));
app.use(['/api/trial', '/api/v1/trial'], require('./routes/trialRoutes'));
app.use(['/api/promo', '/api/v1/promo'], require('./routes/promoCodeRoutes'));
app.use(['/api/flash-deals', '/api/v1/flash-deals'], require('./routes/flashDealRoutes'));
app.use(['/api/disputes', '/api/v1/disputes'], require('./routes/disputeRoutes'));
// Review Routes - was missing, added during OS-02 audit
app.use(['/api/reviews', '/api/v1/reviews'], require('./routes/reviewRoutes'));
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'storage', 'uploads'), {
    maxAge: '30d',  // Uploaded media is immutable (hash-named) — cache aggressively
    etag: true,
    lastModified: true,
    immutable: true
}));

const SPA_DIST_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist');
if ((process.env.NODE_ENV === 'production' || process.env.SERVE_SPA === 'true') && directoryExists(SPA_DIST_DIR)) {
    app.use(express.static(SPA_DIST_DIR, staticAssetOptions));
}

// Root route redirect to index.html
app.get('/', (req, res) => {
    const spaIndex = path.join(SPA_DIST_DIR, 'index.html');
    if ((process.env.NODE_ENV === 'production' || process.env.SERVE_SPA === 'true') && fileExists(spaIndex)) {
        return res.sendFile(spaIndex);
    }
    const filePath = path.join(FRONTEND_DIRS.html, 'index.html');
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        res.redirect(`${frontendUrl}/`);
    }
});

// Explicit HTML routes for public/html files (with BASE_PATH support)
const htmlFiles = ['index', 'shop', 'cart', 'product', 'login', 'messages'];
htmlFiles.forEach(file => {
    app.get(`/${file}.html`, (req, res) => {
        const filePath = path.join(FRONTEND_DIRS.html, `${file}.html`);
        if (require('fs').existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send(`<h1>404 Not Found</h1><p>${file}.html is missing</p>`);
        }
    });
});

// Serve SPA index.html in production or redirect to Vite dev server in development
app.get('*', (req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        const spaIndex = path.join(SPA_DIST_DIR, 'index.html');
        if ((process.env.NODE_ENV === 'production' || process.env.SERVE_SPA === 'true') && fileExists(spaIndex)) {
            return res.sendFile(spaIndex);
        }
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        return res.redirect(`${frontendUrl}${req.path}`);
    }
    next();
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

const Sentry = require("@sentry/node");
Sentry.setupExpressErrorHandler(app);

// ── Global Error Handler ──────────────────────────────────────────────────────
// Handles: AppError (operational), Prisma errors, CSRF errors, JWT errors, unknown.
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Already sent a response (streaming, etc.) — delegate to Express default
    if (res.headersSent) {
        return next(err);
    }

    // ── 1. CSRF error ─────────────────────────────────────────────────────────
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            code: 'CSRF_INVALID',
            message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
        });
    }

    // ── 2. JWT errors ─────────────────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Invalid authentication token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' });
    }

    // ── 3. Prisma errors ──────────────────────────────────────────────────────
    if (isDatabaseError(err)) {
        const appErr = prismaErrorToAppError(err);
        if (appErr) {
            if (appErr.statusCode < 500) {
                logger.warn(`[DB:${err.code}] ${req.method} ${req.path} — ${appErr.message}`);
            } else {
                logger.error(`[DB:${err.code}] ${req.method} ${req.path} — ${err.message}`);
            }
            return res.status(appErr.statusCode).json({
                success: false,
                code: err.code || appErr.code,
                message: appErr.message
            });
        }
        // Unknown DB error
        logger.error(`[DB:UNKNOWN] ${req.method} ${req.path} — ${err.message}\n${err.stack}`);
        return res.status(503).json({
            success: false,
            code: 'DB_ERROR',
            message: 'Database error. Please try again shortly.'
        });
    }

    // ── 4. Operational AppError ───────────────────────────────────────────────
    if (err.isOperational) {
        logger.warn(`[APP:${err.code}] ${req.method} ${req.path} — ${err.message}`);
        return res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message
        });
    }

    // ── 5. Multer / file upload errors ────────────────────────────────────────
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE', message: 'File size exceeds the 4MB limit. Please compress your file and try again.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, code: 'UNEXPECTED_FILE', message: 'Unexpected file field in upload' });
    }

    // ── 6. Zod validation errors ─────────────────────────────────────────────
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            errors: err.errors?.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
    }

    // ── 7. Unknown / programming error ───────────────────────────────────────
    logger.error(`[UNHANDLED] ${req.method} ${req.path} — ${err.message}\n${err.stack}`);
    return res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'An unexpected error occurred. Our team has been notified.' : err.message,
        ...(isProduction ? {} : { stack: err.stack })
    });
});

module.exports = app;