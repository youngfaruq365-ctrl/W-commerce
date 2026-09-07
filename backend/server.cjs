/**
 * CRITICAL: Load and validate configuration BEFORE any other code
 */
require('dotenv').config();

const configValidator = require('./src/config/validator');
const validatedConfig = configValidator.validate();

const express = require('express');

// Base path configuration for subfolder deployment
const BASE_PATH = process.env.BASE_PATH || '';

const logger = require('./src/utils/logger');
const redisManager = require('./src/utils/redisManager');

const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./src/utils/prismaClient');

const globalStartup = global.__GLOBALX_STARTUP || (global.__GLOBALX_STARTUP = {
    app: null,
    server: null,
    io: null,
    serverStarted: false,
    cronStarted: false,
    socketStarted: false,
    redisWarned: false
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================================================

let serverInstance = null;

async function gracefulShutdown() {
    logger.warn('Received shutdown signal. Starting graceful shutdown...');
    
    await redisManager.close();
    try {
        const cronJobManager = require('./src/services/cronJobManager');
        if (cronJobManager && typeof cronJobManager.shutdown === 'function') {
            await cronJobManager.shutdown();
            logger.info('Cron jobs shut down gracefully');
        }
    } catch (e) {
        logger.warn(`Cron shutdown error: ${e.message}`);
    }
    try {
        const eventBus = require('./src/services/eventBus');
        await eventBus.shutdown();
    } catch (e) {
        logger.warn(`EventBus shutdown error: ${e.message}`);
    }

    await prisma.$disconnect();
    
    const activeServer = serverInstance || global.serverInstance || globalStartup.server;
    if (activeServer) {
        activeServer.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after 30 seconds');
            process.exit(1);
        }, 30000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection: ${reason?.stack || reason}`);
});
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    if (error.stack) logger.error(error.stack);
    gracefulShutdown();
});

// Initialize Redis early and await it before binding the HTTP server.
const redisReadyPromise = (async () => {
    try {
        await redisManager.initialize();
        logger.info('Redis initialized successfully');
        return redisManager;
    } catch (error) {
        logger.error(`Redis initialization failed: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            logger.error('FATAL: Redis is required in production. Server shutting down.');
            process.exit(1);
        }
        return redisManager;
    }
})();

// CRITICAL SECURITY AUDIT: Enforce Secret Presence
// JWT Secret — must be provided via environment variable in production
// Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
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

const { cspNonce, buildCspHeader } = require('./src/middleware/cspNonce');
const helmet = require('helmet');
const crypto = require('crypto');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const { configureGoogleStrategy } = require('./src/services/passport');
const RedisSessionStore = require('./src/utils/redisSessionStore');

// Rate limiter (uses shared Redis manager internally)
const { rateLimiters } = require('./src/middleware/rateLimiter');
const geoIPMiddleware = require('./src/middleware/geoIP');
const { validate, sanitizeInput } = require('./src/middleware/inputValidation');

const app = globalStartup.app || express();
globalStartup.app = app;

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
        secure: process.env.NODE_ENV === 'production',
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Paystack-Signature', 'stripe-signature']
}));

function createServerAndSocket() {
    if (globalStartup.server && globalStartup.io) {
        return { server: globalStartup.server, io: globalStartup.io };
    }

    const server = http.createServer(app);
    const io = new Server(server, {
        connectionStateRecovery: {},
        pingInterval: 10000, // Ping every 10s
        pingTimeout: 5000    // Timeout after 5s of no response
    });

    globalStartup.server = server;
    globalStartup.io = io;
    return { server, io };
}

const { server, io } = createServerAndSocket();
const PORT = process.env.PORT || 3000;

// Middleware
// Webhook Parser (MUST COME BEFORE GLOBAL express.json for raw body calculation)
app.post(['/api/payment/webhook', '/api/v1/payment/webhook'], express.raw({ type: 'application/json' }), (req, res) => {
    // Forward to controller
    require('./src/controllers/webhookController').handleWebhook(req, res);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const morgan = require('morgan');

// Morgan Http Logger
app.use(morgan('combined', { stream: logger.stream }));

// Input sanitization middleware
app.use(sanitizeInput);

// CSRF Protection (double-submit cookie pattern)
const { csrfProtection, csrfToken } = require('./src/middleware/csrf');
app.get(['/api/csrf-token', '/api/v1/csrf-token'], csrfToken);

// Rate limiting
app.use(['/api', '/api/v1'], rateLimiters.api);

// AI Assistant — gated behind ENABLE_AI_CHAT feature flag (default: false).
// Set ENABLE_AI_CHAT=true in .env once the AI backend is production-ready.
const AI_ENABLED = process.env.ENABLE_AI_CHAT === 'true';

app.post(['/api/ai-chat', '/api/v1/ai-chat'], (req, res) => {
    if (!AI_ENABLED) {
        return res.status(503).json({ success: false, code: 'FEATURE_DISABLED', message: 'AI assistant is not currently available.' });
    }
    return res.status(501).json({ success: false, message: 'AI assistant is not yet implemented.' });
});

app.post(['/api/ai-chat/generate-product', '/api/v1/ai-chat/generate-product'], async (req, res) => {
    if (!AI_ENABLED) {
        return res.status(503).json({ success: false, code: 'FEATURE_DISABLED', message: 'AI product generation is not currently available.' });
    }
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });
        
        const aiService = require('./src/services/aiService');
        const systemPrompt = `Write a product description in JSON format with fields: title (string), description (string), price (number).\nUser Prompt: ${prompt}\nRespond ONLY with valid JSON.`;

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

app.use(['/api', '/api/v1'], csrfProtection);

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
    logger.warn(`Static directory missing: ${FRONTEND_DIRS.html}`);
}

if (directoryExists(FRONTEND_DIRS.css)) {
    app.use(express.static(FRONTEND_DIRS.css, staticAssetOptions));
    app.use('/public/css', express.static(FRONTEND_DIRS.css, staticAssetOptions));
} else {
    logger.warn(`Static directory missing: ${FRONTEND_DIRS.css}`);
}

if (directoryExists(FRONTEND_DIRS.js)) {
    app.use(express.static(FRONTEND_DIRS.js, staticAssetOptions));
    app.use('/public/js', express.static(FRONTEND_DIRS.js, staticAssetOptions));
} else {
    logger.warn(`Static directory missing: ${FRONTEND_DIRS.js}`);
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
const authRoutes = require('./src/routes/authRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const productRoutes = require('./src/routes/productRoutes');
const escrowRoutes = require('./src/routes/escrowRoutes');
const socketService = require('./src/services/socketService');
const poolEvents = require('./src/services/poolEvents');
const { startCronJobs } = require('./src/services/cronService');
const { startEscrowJobs } = require('./src/services/escrowJobs');
const { registerEscrowV2Jobs } = require('./src/services/escrowV2Jobs'); // Phase 6
const { registerOutboxJobs }   = require('./src/services/outboxRetryJob'); // Phase 10
const cronJobManager = require('./src/services/cronJobManager');

// Initialize Real-time Service
const initializeSocket = () => {
    if (globalStartup.socketStarted) {
        return;
    }

    socketService(io);
    poolEvents.initializePoolSocket(io);
    globalStartup.socketStarted = true;
};

const initializeCron = async () => {
    if (globalStartup.cronStarted) {
        return;
    }

    try {
        await startCronJobs(cronJobManager);
        await startEscrowJobs(cronJobManager);
        registerEscrowV2Jobs(cronJobManager);    // Phase 6 — Earnings Ledger + Escrow Release
        registerOutboxJobs(cronJobManager);      // Phase 10 — Outbox retry (notifications + domain events)
        globalStartup.cronStarted = true;
        logger.info('✅ Cron jobs registered and started (singleton)');
    } catch (error) {
        logger.error(`Failed to start cron jobs: ${error.message}`);
    }
};

initializeSocket();
initializeCron();

// Phase 7 — Register domain event handlers (notifications, logging, side-effects)
const { registerEventHandlers } = require('./src/services/domainEventHandlers');
registerEventHandlers();

// Phase 10 — Initialize Event Bus (Redis Pub/Sub in prod, in-process in dev)
const eventBus = require('./src/services/eventBus');
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
app.use(['/api/user', '/api/v1/user'], require('./src/routes/userRoutes'));
// Feature-flagged AI routes
if (process.env.ENABLE_AI_CHAT === 'true') {
    app.use(['/api/ai', '/api/v1/ai'], require('./src/routes/aiRoutes'));
}
app.use(['/api/wallet', '/api/v1/wallet'], require('./src/routes/walletRoutes'));
app.use(['/api/rewards', '/api/v1/rewards'], require('./src/routes/rewardRoutes'));
app.use(['/api/seller-plans', '/api/v1/seller-plans'], require('./src/routes/sellerPlanRoutes'));
app.use('/api/admin/economy', require('./src/routes/adminEconomyRoutes'));
app.use(['/api/payment', '/api/v1/payment'], paymentRoutes);
app.use(['/api/escrow', '/api/v1/escrow'], escrowRoutes);
app.use(['/api/products', '/api/v1/products'], productRoutes);
app.use(['/api/orders', '/api/v1/orders'], require('./src/routes/orderRoutes'));
// Phase 4 — Multi-seller checkout (MarketplaceOrder + FulfillmentOrder architecture)
app.use('/api/v1/checkout', require('./src/routes/checkoutV2Routes'));
// Phase 5 — Payment V2 (Paystack webhook + initialize for MarketplaceOrder)
// MUST be registered BEFORE the legacy /api/payment mount so the raw-body webhook
// route takes precedence over the global express.json() middleware.
app.use('/api/v1/payment', require('./src/routes/paymentV2Routes'));
// Phase 6 — Earnings Ledger (seller dashboard, buyer receipt confirm, admin release)
app.use('/api/v1/earnings', require('./src/routes/earningsV2Routes'));
// Phase 8 — Package & Chain-of-Custody Ledger
app.use('/api/v1/packages', require('./src/routes/packageRoutes'));
// Phase 9 — Unified Notification System
app.use('/api/v1/notifications', require('./src/routes/notificationV2Routes'));
// Phase 14 — Seller Fulfillment State Machine
app.use('/api/v1/fulfillment', require('./src/routes/fulfillmentRoutes'));
// Phase 16 — Courier Offer System
app.use('/api/v1/courier/offers', require('./src/routes/courierOfferRoutes'));
// Phase 17 — GPS Tracking REST API
app.use('/api/v1/tracking', require('./src/routes/trackingRoutes'));
app.use('/api/v1/hub', require('./src/routes/hubRoutes'));
app.use(['/api/dispatch', '/api/v1/dispatch'], require('./src/routes/dispatchRoutes'));

app.use(['/api/admin', '/api/v1/admin'], require('./src/routes/adminRoutes'));
app.use(['/api/admin', '/api/v1/admin'], require('./src/routes/adminStudioRoutes'));
app.use(['/api/upload', '/api/v1/upload'], require('./src/routes/uploadRoutes'));
app.use(['/api/buyers', '/api/v1/buyers'], require('./src/routes/buyerRoutes'));
app.use('/api/v1/buyer', require('./src/routes/buyerDashboardRoutes'));
app.use(['/api/buyer-requests', '/api/v1/buyer-requests'], require('./src/routes/buyerRequestRoutes'));
app.use(['/api/packing', '/api/v1/packing'], require('./src/routes/packingRoutes'));
app.use(['/api/pools', '/api/v1/pools'], require('./src/routes/poolRoutes'));
app.use(['/api/notifications', '/api/v1/notifications'], require('./src/routes/notificationRoutes'));
app.use(['/api/feed', '/api/v1/feed'], require('./src/routes/feedRoutes'));
app.use(['/api/verification', '/api/v1/verification'], require('./src/routes/verificationRoutes'));
app.use(['/api/buyer', '/api/v1/buyer'], require('./src/routes/buyerDashboardRoutes'));
app.use(['/api/buyer', '/api/v1/buyer'], require('./src/routes/buyerStudioRoutes'));
app.use(['/api/config', '/api/v1/config'], require('./src/routes/configRoutes'));
app.use(['/api/payments', '/api/v1/payments'], require('./src/routes/paymentProofRoutes'));
app.use(['/api/logs', '/api/v1/logs'], require('./src/routes/logRoutes'));
app.use(['/api/config', '/api/v1/config'], require('./src/routes/configRoutes'));
app.use(['/api/payments', '/api/v1/payments'], require('./src/routes/paymentProofRoutes'));
app.use(['/api/logs', '/api/v1/logs'], require('./src/routes/logRoutes'));
app.use(['/api/stores', '/api/v1/stores'], require('./src/routes/storeRoutes'));
app.use(['/api/messages', '/api/v1/messages'], require('./src/routes/messageRoutes'));
app.use(['/api/marketing', '/api/v1/marketing'], require('./src/routes/marketingRoutes'));
app.use(['/api/cart', '/api/v1/cart'], require('./src/routes/cartRoutes'));
app.use(['/api/wishlist', '/api/v1/wishlist'], require('./src/routes/wishlistRoutes'));
app.use(['/api/shipping', '/api/v1/shipping'], require('./src/routes/shippingRoutes'));
app.use(['/api/seller', '/api/v1/seller'], require('./src/routes/sellerRoutes'));
app.use(['/api/seller-studio', '/api/v1/seller-studio'], require('./src/routes/sellerStudioRoutes'));
// Note: /api/sellers was a duplicate of /api/seller — removed in Phase 1 cleanup.
app.use(['/api/seller/analytics', '/api/v1/seller-analytics'], require('./src/routes/sellerAnalyticsRoutes'));

// W-Delivery OS
app.use(['/api/delivery/earnings', '/api/v1/delivery/earnings'], require('./src/routes/courierEarningsRoutes'));
app.use(['/api/delivery', '/api/v1/delivery'], require('./src/routes/deliveryRoutes'));
app.use(['/api/courier', '/api/v1/courier'], require('./src/routes/courierRoutes'));

// WebAuthn / Passkey Routes (consumed by @simplewebauthn/browser in authStore.js)
app.use(['/api/webauthn', '/api/v1/webauthn'], require('./src/routes/webauthnRoutes'));

// Trial Routes (6-Month Free Trial)
app.use(['/api/trial', '/api/v1/trial'], require('./src/routes/trialRoutes'));

// Promo Code Routes
app.use(['/api/promo', '/api/v1/promo'], require('./src/routes/promoCodeRoutes'));

// Flash Deal Routes
app.use(['/api/flash-deals', '/api/v1/flash-deals'], require('./src/routes/flashDealRoutes'));

// Dispute Routes
app.use(['/api/disputes', '/api/v1/disputes'], require('./src/routes/disputeRoutes'));

// Note: Health endpoint is defined once above (line ~444). This duplicate was removed in Phase 1.

// Serve Uploaded Images
app.use('/uploads', express.static(path.join(__dirname, 'storage', 'uploads')));

// Root route redirect to index.html
app.get('/', (req, res) => {
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

// Redirect any other direct non-API browser navigation on the backend port to the Vite dev server
app.get('*', (req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        return res.redirect(`${frontendUrl}${req.path}`);
    }
    next();
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    
    const statusCode = err.statusCode || err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = {
        success: false,
        message: (isProduction && statusCode === 500) ? 'Internal server error' : (err.message || 'Internal server error')
    };

    if (!isProduction) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// ============================================================================
// START SERVER WITH PROPER ERROR HANDLING
// ============================================================================

async function startServerWithErrorHandling() {
    if (globalStartup.serverStarted) {
        logger.warn('Server start attempted twice in same process - skipping duplicate start');
        return;
    }
    globalStartup.serverStarted = true;

    await redisReadyPromise;
    const redisStatus = redisManager.getStatus();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!redisStatus.connected || redisStatus.useFallback)) {
        logger.error('FATAL: Redis-backed session store is unavailable in production. Server shutting down.');
        process.exit(1);
    }

    const basePort = parseInt(process.env.PORT, 10) || 5000;
    const maxAttempts = 2;
    let attempts = 0;
    let currentPort = basePort;

    const tryStart = () => {
        attempts += 1;

        if (global.serverInstance) {
            global.serverInstance.removeAllListeners('error');
        }

        global.serverInstance = server.listen(currentPort, () => {
            const addr = global.serverInstance.address();
            logger.info('✅ Server is running on port ' + addr.port);
        });

        global.serverInstance.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn('Port ' + currentPort + ' is in use.');
                if (attempts < maxAttempts) {
                    currentPort += 1;
                    logger.info('Trying port ' + currentPort + '...');
                    setTimeout(tryStart, 1000);
                } else {
                    logger.error('Max attempts reached. Could not find an available port.');
                    process.exit(1);
                }
            } else {
                logger.error('Server error: ' + error.message);
                process.exit(1);
            }
        });
    };

    tryStart();
}

startServerWithErrorHandling().catch((error) => {
    logger.error('Failed to start server: ' + error.message);
    logger.error(error.stack);
    process.exit(1);
});
