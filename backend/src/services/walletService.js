const prisma = require('../utils/prismaClient');

const COINS = new Set(['GONG', 'GX', 'XP']);

const coinFields = {
    GONG: { available: 'gongAvailable', held: 'gongHeld' },
    GX: { available: 'gxAvailable', held: 'gxHeld' },
    XP: { available: 'xpAvailable', held: 'xpHeld' }
};

function normalizeCoin(coin) {
    const normalized = String(coin || 'GONG').toUpperCase();
    if (!COINS.has(normalized)) throw new Error(`Unsupported coin: ${coin}`);
    return normalized;
}

function normalizeAmount(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Amount must be a positive number');
    return Math.round(value * 1000000) / 1000000;
}

function stringifyMetadata(metadata) {
    if (!metadata) return null;
    return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
}

function client(tx) {
    return tx || prisma;
}

async function ensureWallet(userId, tx = null) {
    const db = client(tx);

    // Use upsert to atomically find-or-create, preventing race conditions
    // when parallel requests (e.g. wallet/summary + wallet/transactions) both try to create
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { balance: true }
    });

    return db.wallet.upsert({
        where: { userId },
        update: {}, // Don't overwrite if already exists
        create: {
            userId,
            gongAvailable: user ? Number(user.balance || 0) : 0
        }
    });
}

async function getSummary(userId) {
    const wallet = await ensureWallet(userId);
    return {
        walletId: wallet.id,
        status: wallet.status,
        freezeReason: wallet.freezeReason,
        balances: {
            GONG: {
                available: Number(wallet.gongAvailable),
                held: Number(wallet.gongHeld)
            },
            GX: {
                available: Number(wallet.gxAvailable),
                held: Number(wallet.gxHeld)
            },
            XP: {
                available: Number(wallet.xpAvailable),
                held: Number(wallet.xpHeld)
            }
        }
    };
}

async function assertActive(wallet) {
    if (wallet.status !== 'ACTIVE') {
        const error = new Error(wallet.freezeReason || 'Wallet is not active');
        error.statusCode = 423;
        throw error;
    }
}

async function createLedgerEntry(db, wallet, params, balanceAfter) {
    if (params.idempotencyKey) {
        const existing = await db.walletLedgerEntry.findUnique({
            where: { idempotencyKey: params.idempotencyKey }
        });
        if (existing) return existing;
    }

    return db.walletLedgerEntry.create({
        data: {
            walletId: wallet.id,
            userId: wallet.userId,
            coin: params.coin,
            direction: params.direction,
            amount: params.amount,
            balanceAfter,
            status: params.status || 'COMPLETED',
            referenceType: params.referenceType || null,
            referenceId: params.referenceId || null,
            idempotencyKey: params.idempotencyKey || null,
            metadata: stringifyMetadata(params.metadata),
            description: params.description || null
        }
    });
}

async function credit(userId, coin, amount, options = {}, tx = null) {
    const db = client(tx);
    const normalizedCoin = normalizeCoin(coin);
    const value = normalizeAmount(amount);
    const fields = coinFields[normalizedCoin];

    if (options.idempotencyKey) {
        const existing = await db.walletLedgerEntry.findUnique({
            where: { idempotencyKey: options.idempotencyKey }
        });
        if (existing) return existing;
    }

    const wallet = await ensureWallet(userId, tx);
    await assertActive(wallet);

    const updated = await db.wallet.update({
        where: { id: wallet.id },
        data: { [fields.available]: { increment: value } }
    });

    if (normalizedCoin === 'GONG') {
        await db.user.update({
            where: { id: userId },
            data: { balance: { increment: value } }
        });
    }

    return createLedgerEntry(db, updated, {
        ...options,
        coin: normalizedCoin,
        direction: options.direction || 'CREDIT',
        amount: value
    }, updated[fields.available]);
}

async function debit(userId, coin, amount, options = {}, tx = null) {
    const db = client(tx);
    const normalizedCoin = normalizeCoin(coin);
    const value = normalizeAmount(amount);
    const fields = coinFields[normalizedCoin];

    if (options.idempotencyKey) {
        const existing = await db.walletLedgerEntry.findUnique({
            where: { idempotencyKey: options.idempotencyKey }
        });
        if (existing) return existing;
    }

    const wallet = await ensureWallet(userId, tx);
    await assertActive(wallet);

    // BUG-WALLET-02: Previous pattern read balance, checked it, then decremented in a separate
    // query — two concurrent debits could both pass the check then both decrement, going negative.
    // Fixed: use updateMany with a WHERE balance >= value. If 0 rows updated, balance was insufficient.
    const result = await db.wallet.updateMany({
        where: {
            id: wallet.id,
            [fields.available]: { gte: value }
        },
        data: { [fields.available]: { decrement: value } }
    });

    if (result.count === 0) {
        const error = new Error(`Insufficient ${normalizedCoin} balance`);
        error.statusCode = 400;
        throw error;
    }

    // Re-fetch to get the post-update balance for the ledger entry
    const updated = await db.wallet.findUnique({ where: { id: wallet.id } });

    if (normalizedCoin === 'GONG') {
        await db.user.update({
            where: { id: userId },
            data: { balance: { decrement: value } }
        });
    }

    return createLedgerEntry(db, updated, {
        ...options,
        coin: normalizedCoin,
        direction: options.direction || 'DEBIT',
        amount: value
    }, updated[fields.available]);
}

async function createHold(userId, coin, amount, options = {}, tx = null) {
    const db = client(tx);
    const normalizedCoin = normalizeCoin(coin);
    const value = normalizeAmount(amount);
    const fields = coinFields[normalizedCoin];

    if (options.idempotencyKey) {
        const existing = await db.walletHold.findUnique({ where: { idempotencyKey: options.idempotencyKey } });
        if (existing) return existing;
    }

    const wallet = await ensureWallet(userId, tx);
    await assertActive(wallet);

    // BUG-WALLET-02 (createHold): Same TOCTOU fix — atomic conditional update.
    const holdResult = await db.wallet.updateMany({
        where: {
            id: wallet.id,
            [fields.available]: { gte: value }
        },
        data: {
            [fields.available]: { decrement: value },
            [fields.held]: { increment: value }
        }
    });

    if (holdResult.count === 0) {
        const error = new Error(`Insufficient ${normalizedCoin} balance`);
        error.statusCode = 400;
        throw error;
    }

    const updated = await db.wallet.findUnique({ where: { id: wallet.id } });

    if (normalizedCoin === 'GONG') {
        await db.user.update({
            where: { id: userId },
            data: { balance: { decrement: value } }
        });
    }

    const hold = await db.walletHold.create({
        data: {
            walletId: wallet.id,
            userId,
            coin: normalizedCoin,
            amount: value,
            reason: options.reason || 'ESCROW',
            referenceType: options.referenceType || null,
            referenceId: options.referenceId || null,
            idempotencyKey: options.idempotencyKey || null,
            releaseAt: options.releaseAt || null,
            metadata: stringifyMetadata(options.metadata)
        }
    });

    await createLedgerEntry(db, updated, {
        ...options,
        coin: normalizedCoin,
        direction: 'HOLD',
        amount: value
    }, updated[fields.available]);

    return hold;
}

async function releaseHold(holdId, options = {}, tx = null) {
    const db = client(tx);
    const hold = await db.walletHold.findUnique({ where: { id: holdId }, include: { wallet: true } });
    if (!hold) throw new Error('Wallet hold not found');
    if (hold.status !== 'HELD' && hold.status !== 'DISPUTED') return hold;

    const normalizedCoin = normalizeCoin(hold.coin);
    const fields = coinFields[normalizedCoin];
    const value = Number(hold.amount);

    const updated = await db.wallet.update({
        where: { id: hold.walletId },
        data: { [fields.held]: { decrement: value } }
    });

    const released = await db.walletHold.update({
        where: { id: hold.id },
        data: { status: 'RELEASED', releasedAt: new Date() }
    });

    await createLedgerEntry(db, updated, {
        ...options,
        coin: normalizedCoin,
        direction: 'RELEASE',
        amount: value,
        referenceType: options.referenceType || hold.referenceType,
        referenceId: options.referenceId || hold.referenceId
    }, updated[fields.available]);

    return released;
}

async function refundHold(holdId, options = {}, tx = null) {
    const db = client(tx);
    const hold = await db.walletHold.findUnique({ where: { id: holdId }, include: { wallet: true } });
    if (!hold) throw new Error('Wallet hold not found');
    if (hold.status !== 'HELD' && hold.status !== 'DISPUTED') return hold;

    const normalizedCoin = normalizeCoin(hold.coin);
    const fields = coinFields[normalizedCoin];
    const value = Number(hold.amount);

    const updated = await db.wallet.update({
        where: { id: hold.walletId },
        data: {
            [fields.available]: { increment: value },
            [fields.held]: { decrement: value }
        }
    });

    if (normalizedCoin === 'GONG') {
        await db.user.update({
            where: { id: hold.userId },
            data: { balance: { increment: value } }
        });
    }

    const refunded = await db.walletHold.update({
        where: { id: hold.id },
        data: { status: 'REFUNDED', releasedAt: new Date() }
    });

    await createLedgerEntry(db, updated, {
        ...options,
        coin: normalizedCoin,
        direction: 'REFUND',
        amount: value,
        referenceType: options.referenceType || hold.referenceType,
        referenceId: options.referenceId || hold.referenceId
    }, updated[fields.available]);

    return refunded;
}

async function transfer(fromUserId, toUserId, coin, amount, options = {}) {
    const normalizedCoin = normalizeCoin(coin);
    const value = normalizeAmount(amount);
    const transferKey = options.idempotencyKey || `TRANSFER-${fromUserId}-${toUserId}-${normalizedCoin}-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
        await debit(fromUserId, normalizedCoin, value, {
            ...options,
            idempotencyKey: `${transferKey}:DEBIT`,
            direction: 'TRANSFER_OUT',
            referenceType: options.referenceType || 'TRANSFER'
        }, tx);
        await credit(toUserId, normalizedCoin, value, {
            ...options,
            idempotencyKey: `${transferKey}:CREDIT`,
            direction: 'TRANSFER_IN',
            referenceType: options.referenceType || 'TRANSFER'
        }, tx);
        return { success: true, coin: normalizedCoin, amount: value };
    });
}

async function convert(userId, fromCoin, toCoin, amount, rate, options = {}) {
    const sourceCoin = normalizeCoin(fromCoin);
    const targetCoin = normalizeCoin(toCoin);
    if (sourceCoin === targetCoin) throw new Error('Cannot convert a coin to itself');
    if (sourceCoin === 'XP' && targetCoin === 'GONG') throw new Error('XP cannot convert directly to GONG');

    const value = normalizeAmount(amount);
    const conversionRate = Number(rate);
    if (!Number.isFinite(conversionRate) || conversionRate <= 0) throw new Error('Invalid conversion rate');
    const targetAmount = normalizeAmount(value * conversionRate);
    const key = options.idempotencyKey || `CONVERT-${userId}-${sourceCoin}-${targetCoin}-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
        await debit(userId, sourceCoin, value, {
            ...options,
            idempotencyKey: `${key}:OUT`,
            direction: 'CONVERT_OUT',
            referenceType: 'CONVERSION',
            metadata: { ...(options.metadata || {}), targetCoin, rate: conversionRate }
        }, tx);
        await credit(userId, targetCoin, targetAmount, {
            ...options,
            idempotencyKey: `${key}:IN`,
            direction: 'CONVERT_IN',
            referenceType: 'CONVERSION',
            metadata: { ...(options.metadata || {}), fromCoin: sourceCoin, rate: conversionRate }
        }, tx);
        return { fromCoin: sourceCoin, toCoin: targetCoin, amount: value, convertedAmount: targetAmount, rate: conversionRate };
    });
}

async function freezeWallet(userId, reason, tx = null) {
    const wallet = await ensureWallet(userId, tx);
    return client(tx).wallet.update({
        where: { id: wallet.id },
        data: { status: 'FROZEN', freezeReason: reason || 'Admin review' }
    });
}

async function unfreezeWallet(userId, tx = null) {
    const wallet = await ensureWallet(userId, tx);
    return client(tx).wallet.update({
        where: { id: wallet.id },
        data: { status: 'ACTIVE', freezeReason: null }
    });
}

async function listTransactions(userId, options = {}) {
    const wallet = await ensureWallet(userId);
    return prisma.walletLedgerEntry.findMany({
        where: {
            walletId: wallet.id,
            ...(options.coin ? { coin: normalizeCoin(options.coin) } : {}),
            ...(options.status ? { status: options.status } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(options.limit || 50), 100)
    });
}

module.exports = {
    COINS,
    ensureWallet,
    getSummary,
    credit,
    debit,
    createHold,
    releaseHold,
    refundHold,
    transfer,
    convert,
    freezeWallet,
    unfreezeWallet,
    listTransactions,
    normalizeAmount,
    normalizeCoin
};
