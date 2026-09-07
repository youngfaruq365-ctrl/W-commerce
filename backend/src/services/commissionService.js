/**
 * Commission Calculation Service
 * Handles platform fee calculations for Nigerian escrow payments
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const sellerPlanService = require('./sellerPlanService');

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

/**
 * Get current commission rate from configuration
 */
const getCommissionRate = async () => {
    // Could be stored in database or config
    // For now, use default
    return DEFAULT_COMMISSION_RATE;
};

/**
 * Calculate commission and seller payout amounts
 * @param {number} amount - Total amount in NGN
 * @param {number} rate - Commission rate (optional, defaults to platform rate)
 */
exports.calculate = async (amount, rate = null) => {
    const commissionRate = rate || await getCommissionRate();
    
    const commissionAmount = Number(amount) * commissionRate;
    const sellerPayout = Number(amount) - commissionAmount;

    return {
        totalAmount: Number(amount),
        commissionRate,
        commissionAmount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimal places
        sellerPayout: Math.round(sellerPayout * 100) / 100
    };
};

/**
 * Calculate commission with validation
 * Throws error if amounts are invalid
 */
exports.calculateWithValidation = async (amount, rate = null) => {
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
    }

    // Validate rate
    const commissionRate = rate || await getCommissionRate();
    if (commissionRate < 0 || commissionRate > 1) {
        throw new Error('Invalid commission rate: must be between 0 and 1');
    }

    const calculation = await this.calculate(amount, commissionRate);

    // Ensure seller payout is not negative
    if (calculation.sellerPayout < 0) {
        throw new Error('Invalid calculation: seller payout cannot be negative');
    }

    return calculation;
};

exports.calculateForSeller = async (sellerId, amount) => {
    const commissionRate = await sellerPlanService.getCommissionRate(sellerId, await getCommissionRate());
    return this.calculateWithValidation(amount, commissionRate);
};

/**
 * Record commission in the database
 */
exports.recordCommission = async (paymentId, amount, currency = 'NGN') => {
    const calculation = await this.calculateWithValidation(amount);
    
    const commission = await prisma.commission.create({
        data: {
            paymentId,
            percentage: calculation.commissionRate,
            amount: calculation.commissionAmount,
            currency,
            transactionRef: `COMM-${Date.now()}`
        }
    });

    logger.info(`Commission recorded: ${commission.id}`, {
        paymentId,
        amount: calculation.commissionAmount,
        rate: calculation.commissionRate
    });

    return commission;
};

/**
 * Get total commission earned within a date range
 */
exports.getTotalCommission = async (startDate, endDate) => {
    const result = await prisma.commission.aggregate({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        },
        _sum: {
            amount: true
        }
    });

    return Number(result._sum.amount || 0);
};

/**
 * Get commission breakdown by seller
 */
exports.getCommissionBySeller = async (sellerId, startDate, endDate) => {
    const commissions = await prisma.commission.findMany({
        where: {
            payment: {
                sellerId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        },
        include: {
            payment: {
                select: {
                    id: true,
                    amount: true,
                    createdAt: true
                }
            }
        }
    });

    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalVolume = commissions.reduce((sum, c) => sum + Number(c.payment.amount), 0);

    return {
        sellerId,
        totalTransactions: commissions.length,
        totalVolume,
        totalCommission,
        averageRate: totalVolume > 0 ? totalCommission / totalVolume : 0,
        commissions
    };
};

/**
 * Calculate platform revenue from transactions
 */
exports.calculatePlatformRevenue = async (startDate, endDate) => {
    const payments = await prisma.payment.findMany({
        where: {
            status: {
                in: ['SUCCESSFUL', 'HELD', 'RELEASED']
            },
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        },
        select: {
            platformFee: true,
            amount: true
        }
    });

    const totalVolume = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCommission = payments.reduce((sum, p) => sum + Number(p.platformFee), 0);

    return {
        totalTransactions: payments.length,
        totalVolume,
        totalCommission,
        averageCommissionRate: totalVolume > 0 ? totalCommission / totalVolume : 0
    };
};

module.exports = exports;
