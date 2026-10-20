const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

async function recordBuyerAction(userId, title, body, type = 'SYSTEM') {
    if (!userId) return;
    try {
        await prisma.notification.create({
            data: { userId, title, body, type, isRead: false }
        });
    } catch (err) {
        logger.warn(`Failed to create buyer action notification: ${err.message}`);
    }
}

exports.supportAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Support Ticket Created', details || 'Your support ticket has been logged with our team.', 'SUPPORT');
        res.status(200).json({ success: true, message: 'Support ticket created successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.messagesAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Message Dispatched', details || 'Your message has been sent.', 'MESSAGE');
        res.status(200).json({ success: true, message: 'Message sent successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.securityAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Security Settings Updated', details || 'Your account security preferences were updated.', 'SECURITY');
        res.status(200).json({ success: true, message: 'Security settings updated successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.preferencesAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Preferences Updated', details || 'Your shopping preferences have been saved.', 'PREFERENCES');
        res.status(200).json({ success: true, message: 'Preferences updated successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.addressesAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Address Book Updated', details || 'Your delivery address has been saved.', 'ADDRESS');
        res.status(200).json({ success: true, message: 'Address added successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.ordersAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Order Modification Requested', details || 'Your order modification request has been submitted.', 'ORDER');
        res.status(200).json({ success: true, message: 'Order modification requested successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.genericAction = async (req, res) => {
    try {
        const { details } = req.body;
        await recordBuyerAction(req.user?.id, 'Action Processed', details || 'Your dashboard request was completed.', 'SYSTEM');
        res.status(200).json({ success: true, message: 'Action processed successfully', details });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
