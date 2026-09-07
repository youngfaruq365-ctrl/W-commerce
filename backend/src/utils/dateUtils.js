/**
 * Date utilities for GlobalX
 */

/**
 * Calculate end of month for a given date in UTC
 * Handles leap years and different month lengths
 */
function getEndOfMonth(date, timezone = 'UTC') {
    // For now, we'll use UTC. In production, you'd use the platform's timezone
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    // Create date for first day of next month, then subtract 1 millisecond
    const endOfMonth = new Date(Date.UTC(year, month + 1, 1) - 1);

    return endOfMonth;
}

/**
 * Get default end date for flash deal (end of current month)
 */
function getDefaultFlashDealEndDate(timezone = 'UTC') {
    const now = new Date();
    return getEndOfMonth(now, timezone);
}

/**
 * Validate date range for flash deal
 */
function isValidDateRange(startDate, endDate) {
    return endDate > startDate;
}

/**
 * Handle daylight saving time adjustments
 * Returns the date adjusted for DST if necessary
 */
function adjustForDST(date, timezone) {
    // Basic implementation - in production, use a proper timezone library
    return date;
}

module.exports = {
    getEndOfMonth,
    getDefaultFlashDealEndDate,
    isValidDateRange,
    adjustForDST
};