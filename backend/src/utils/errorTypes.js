'use strict';

/**
 * AppError — operational error with HTTP status
 * Use this for expected failures (validation, 404, auth, etc.)
 * DO NOT use for unexpected programming errors (those are bugs, not AppErrors).
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

const notFound = (resource = 'Resource') =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND');

const unauthorized = (msg = 'Authentication required') =>
    new AppError(msg, 401, 'UNAUTHORIZED');

const forbidden = (msg = 'You do not have permission to perform this action') =>
    new AppError(msg, 403, 'FORBIDDEN');

const badRequest = (msg = 'Invalid request data', code = 'BAD_REQUEST') =>
    new AppError(msg, 400, code);

const conflict = (msg = 'Resource already exists') =>
    new AppError(msg, 409, 'CONFLICT');

const serviceUnavailable = (msg = 'Service temporarily unavailable') =>
    new AppError(msg, 503, 'SERVICE_UNAVAILABLE');

const tooManyRequests = (msg = 'Too many requests, please slow down') =>
    new AppError(msg, 429, 'RATE_LIMITED');

// ── Prisma error mapper ───────────────────────────────────────────────────────
// Maps PrismaClientKnownRequestError codes to human-readable HTTP errors.
// Reference: https://www.prisma.io/docs/reference/api-reference/error-reference

const PRISMA_HTTP_MAP = {
    P2000: { status: 400, message: 'Input value too long for the field' },
    P2001: { status: 404, message: 'Record not found' },
    P2002: { status: 409, message: 'A record with this value already exists' },
    P2003: { status: 400, message: 'Related record not found (foreign key constraint failed)' },
    P2004: { status: 400, message: 'A database constraint failed' },
    P2005: { status: 400, message: 'Invalid field value' },
    P2006: { status: 400, message: 'Invalid value for model field' },
    P2007: { status: 400, message: 'Data validation error' },
    P2008: { status: 400, message: 'Query parsing failed' },
    P2009: { status: 400, message: 'Query validation failed' },
    P2010: { status: 500, message: 'Raw query failed' },
    P2011: { status: 400, message: 'A required field is null' },
    P2012: { status: 400, message: 'A required value is missing' },
    P2013: { status: 400, message: 'Missing required argument' },
    P2014: { status: 400, message: 'Relation violation' },
    P2015: { status: 404, message: 'Related record not found' },
    P2016: { status: 400, message: 'Query interpretation error' },
    P2017: { status: 400, message: 'Records for relation not connected' },
    P2018: { status: 404, message: 'Required connected records not found' },
    P2019: { status: 400, message: 'Input error' },
    P2020: { status: 400, message: 'Value out of range for field' },
    P2021: { status: 500, message: 'Table not found in database' },
    P2022: { status: 500, message: 'Column not found in database' },
    P2023: { status: 400, message: 'Inconsistent column data' },
    P2024: { status: 503, message: 'Connection pool timed out. Try again.' },
    P2025: { status: 404, message: 'Record not found' },
    P2026: { status: 500, message: 'Database feature not supported' },
    P2033: { status: 400, message: 'Number is too large for database field' },
};

/**
 * Map a Prisma error to an AppError.
 * Returns null if the error is not a known Prisma error.
 */
function prismaErrorToAppError(err) {
    const code = err.code;

    // PrismaClientKnownRequestError
    if (code && PRISMA_HTTP_MAP[code]) {
        const mapped = PRISMA_HTTP_MAP[code];
        // For P2002 (unique constraint), include the field if available
        let message = mapped.message;
        if (code === 'P2002' && err.meta?.target) {
            const fields = Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target;
            message = `A record with this ${fields} already exists`;
        }
        return new AppError(message, mapped.status, code);
    }

    // PrismaClientInitializationError / PrismaClientRustPanicError
    if (
        err.name === 'PrismaClientInitializationError' ||
        err.name === 'PrismaClientRustPanicError' ||
        err.name === 'PrismaClientUnknownRequestError'
    ) {
        return new AppError('Database connection error. Please try again shortly.', 503, 'DB_UNAVAILABLE');
    }

    // PrismaClientValidationError
    if (err.name === 'PrismaClientValidationError') {
        return new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR');
    }

    return null; // not a Prisma error
}

/**
 * isDatabaseError — detect any Prisma or underlying DB error
 */
function isDatabaseError(err) {
    return (
        err.code?.startsWith('P') ||
        err.name?.startsWith('PrismaClient') ||
        err.message?.includes('connect ECONNREFUSED') ||
        err.message?.includes('Can\'t reach database server')
    );
}

module.exports = {
    AppError,
    notFound,
    unauthorized,
    forbidden,
    badRequest,
    conflict,
    serviceUnavailable,
    tooManyRequests,
    prismaErrorToAppError,
    isDatabaseError,
};
