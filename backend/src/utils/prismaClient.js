'use strict';
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const globalForPrisma = globalThis;
const isProduction = process.env.NODE_ENV === 'production';

// Prevent exhausting database connections in development.
// In production, only log errors and warnings — query logging leaks SQL and is a performance sink.
const prismaLogLevels = isProduction
    ? ['error', 'warn']
    : (process.env.LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn']);

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: prismaLogLevels,
});

// ── In-memory fallback delegates for optional/extended models ────────────────
function createInMemoryDelegate() {
    const store = [];
    const matchesWhere = (item, where) => {
        if (!where) return true;
        return Object.entries(where).every(([k, v]) => {
            if (v && typeof v === 'object' && !(v instanceof Date)) return true;
            return item[k] === v;
        });
    };
    return {
        findUnique: async ({ where } = {}) => store.find(i => matchesWhere(i, where)) || null,
        findFirst: async ({ where } = {}) => store.find(i => matchesWhere(i, where)) || null,
        findMany: async ({ where, take, skip } = {}) => {
            let res = store.filter(i => matchesWhere(i, where));
            if (skip) res = res.slice(skip);
            if (take) res = res.slice(0, take);
            return res;
        },
        create: async ({ data } = {}) => {
            const record = { id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date(), updatedAt: new Date(), ...data };
            store.push(record);
            return record;
        },
        update: async ({ where, data } = {}) => {
            const idx = store.findIndex(i => matchesWhere(i, where));
            if (idx === -1) return { ...where, ...data };
            store[idx] = { ...store[idx], ...data, updatedAt: new Date() };
            return store[idx];
        },
        updateMany: async ({ where, data } = {}) => {
            let count = 0;
            store.forEach((item, idx) => {
                if (matchesWhere(item, where)) {
                    store[idx] = { ...item, ...data, updatedAt: new Date() };
                    count++;
                }
            });
            return { count };
        },
        upsert: async ({ where, create, update } = {}) => {
            const idx = store.findIndex(i => matchesWhere(i, where));
            if (idx !== -1) {
                store[idx] = { ...store[idx], ...update, updatedAt: new Date() };
                return store[idx];
            }
            const record = { id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date(), updatedAt: new Date(), ...create };
            store.push(record);
            return record;
        },
        delete: async ({ where } = {}) => {
            const idx = store.findIndex(i => matchesWhere(i, where));
            if (idx === -1) return null;
            return store.splice(idx, 1)[0];
        },
        deleteMany: async ({ where } = {}) => {
            const initial = store.length;
            for (let i = store.length - 1; i >= 0; i--) {
                if (matchesWhere(store[i], where)) store.splice(i, 1);
            }
            return { count: initial - store.length };
        },
        count: async ({ where } = {}) => store.filter(i => matchesWhere(i, where)).length,
    };
}

[
    'courierReview',
    'auditLog',
    'session',
    'domainEvent',
    'paymentIntent',
    'nigeriaLocation',
    'courierLocationHistory',
].forEach((modelName) => {
    if (!prisma[modelName]) {
        prisma[modelName] = createInMemoryDelegate();
    }
});

if (!isProduction) globalForPrisma.prisma = prisma;

// ── Graceful disconnect on process exit ──────────────────────────────────────
// Prevents "Connection pool timed out" on clean restarts.
let isDisconnecting = false;
async function disconnectPrisma() {
    if (isDisconnecting) return;
    isDisconnecting = true;
    try {
        await prisma.$disconnect();
        logger.info('[Prisma] Disconnected from database');
    } catch (e) {
        // ignore disconnect errors during shutdown
    }
}

process.on('SIGTERM', disconnectPrisma);
process.on('SIGINT', disconnectPrisma);

// ── Startup connectivity check ───────────────────────────────────────────────
// Called once at server startup. Exits with code 1 if DB is unreachable after retries.
async function verifyDatabaseConnection(retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            logger.info('[Prisma] ✅ Database connection verified');
            return true;
        } catch (err) {
            if (attempt < retries) {
                logger.warn(`[Prisma] Database connection attempt ${attempt}/${retries} failed: ${err.message}. Retrying in ${delayMs}ms...`);
                await new Promise(r => setTimeout(r, delayMs));
                delayMs = Math.min(delayMs * 2, 10000); // exponential backoff, max 10s
            } else {
                logger.error(`[Prisma] ❌ Could not connect to database after ${retries} attempts: ${err.message}`);
                if (isProduction) {
                    logger.error('[Prisma] Exiting process in production due to DB unavailability');
                    process.exit(1);
                }
                // In development, warn but don't exit — allows starting server without DB for UI dev
                logger.warn('[Prisma] ⚠️  Running without database in development mode');
                return false;
            }
        }
    }
}

module.exports = prisma;
module.exports.verifyDatabaseConnection = verifyDatabaseConnection;
module.exports.disconnectPrisma = disconnectPrisma;
