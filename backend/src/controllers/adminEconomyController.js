const coinConversionService = require('../services/coinConversionService');
const rewardService = require('../services/rewardService');
const walletService = require('../services/walletService');
const economyAnalyticsService = require('../services/economyAnalyticsService');
const sellerPlanService = require('../services/sellerPlanService');
const logger = require('../utils/logger');

exports.overview = async (req, res) => {
    try {
        const overview = await economyAnalyticsService.getEconomyOverview();
        res.json({ success: true, overview });
    } catch (error) {
        logger.error(`Admin economy overview error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load economy overview' });
    }
};

exports.setConversionRate = async (req, res) => {
    try {
        const rate = await coinConversionService.upsertRate({ ...req.body, updatedById: req.user.id });
        res.json({ success: true, rate });
    } catch (error) {
        logger.error(`Admin conversion rate error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.setRewardRule = async (req, res) => {
    try {
        const rule = await rewardService.upsertRule(req.body);
        res.json({ success: true, rule });
    } catch (error) {
        logger.error(`Admin reward rule error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.freezeWallet = async (req, res) => {
    try {
        const wallet = await walletService.freezeWallet(req.body.userId, req.body.reason);
        res.json({ success: true, wallet });
    } catch (error) {
        logger.error(`Freeze wallet error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.unfreezeWallet = async (req, res) => {
    try {
        const wallet = await walletService.unfreezeWallet(req.body.userId);
        res.json({ success: true, wallet });
    } catch (error) {
        logger.error(`Unfreeze wallet error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.seedPlans = async (req, res) => {
    try {
        await sellerPlanService.seedDefaultPlans();
        res.json({ success: true, message: 'Seller plans seeded' });
    } catch (error) {
        logger.error(`Seed plans error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to seed seller plans' });
    }
};
