const rewardService = require('../services/rewardService');
const logger = require('../utils/logger');

exports.getMyRewards = async (req, res) => {
    try {
        const rewards = await rewardService.listRewards(req.user.id, req.query.limit);
        res.json({ success: true, rewards });
    } catch (error) {
        logger.error(`Rewards list error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load rewards' });
    }
};

exports.grantReward = async (req, res) => {
    try {
        const eventKey = req.body.eventKey || req.headers['idempotency-key'];
        const result = await rewardService.grantReward(req.body.userId || req.user.id, req.body.eventType, eventKey, {
            xpAmount: req.body.xpAmount,
            gxAmount: req.body.gxAmount,
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId,
            metadata: req.body.metadata
        });
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error(`Reward grant error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.upsertRule = async (req, res) => {
    try {
        const rule = await rewardService.upsertRule(req.body);
        res.json({ success: true, rule });
    } catch (error) {
        logger.error(`Reward rule error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
