const logger = require('../utils/logger');
const messagingService = require('../services/messagingService');
const socketService = require('../services/socketService');

exports.getConversations = async (req, res) => {
    try {
        const conversations = await messagingService.getConversations(req.user.id, Number(req.query.limit || 30));
        res.json({ success: true, conversations });
    } catch (error) {
        logger.error(`Get Conversations Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const messages = await messagingService.getHistory(req.user.id, {
            otherUserId: req.params.otherUserId || req.query.otherUserId || req.query.recipientId || null,
            recipient: req.query.recipient || null,
            receiverName: req.query.receiverName || null
        });

        res.json({ success: true, messages });
    } catch (error) {
        logger.error(`Get History Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getRecentMessages = async (req, res) => {
    try {
        const messages = await messagingService.getRecentMessages(req.user.id, Number(req.query.limit || 3));
        res.json({ success: true, messages });
    } catch (error) {
        logger.error(`Get Recent Messages Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const result = await messagingService.sendMessage({
            senderId: req.user.id,
            receiverId: req.body.receiverId || req.body.recipientId || null,
            recipient: req.body.recipient || null,
            receiverName: req.body.receiverName || req.body.receiver || null,
            content: req.body.content || req.body.text,
            productId: req.body.productId || null,
            orderId: req.body.orderId || req.params.orderId || req.body.deliveryId || req.params.deliveryId || null,
            quotedMsg: req.body.quotedMsg || null,
            productContext: req.body.productContext || null
        }, {
            recipientOnline: socketService.isUserOnline(req.body.receiverId || req.body.recipientId || null)
        });

        res.json({ success: true, message: result.message, autoReply: result.autoReply });
    } catch (error) {
        logger.error(`Send Message Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message || 'Failed to send message' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await messagingService.markAsRead(req.user.id, {
            otherUserId: req.params.otherUserId || req.body.otherUserId || null,
            recipient: req.body.recipient || req.query.recipient || null
        });

        res.json({ success: true });
    } catch (error) {
        logger.error(`Mark Read Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getQuickReplies = async (req, res) => {
    try {
        const templates = await messagingService.getQuickReplies(req.user.id);
        res.json({ success: true, templates });
    } catch (error) {
        logger.error(`Get Quick Replies Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createQuickReply = async (req, res) => {
    try {
        const template = await messagingService.saveQuickReply(req.user.id, req.body);
        res.status(201).json({ success: true, template });
    } catch (error) {
        logger.error(`Create Quick Reply Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to save quick reply' });
    }
};

exports.translateMessage = async (req, res) => {
    try {
        const { text, targetLang = 'EN' } = req.body;

        const dict = {
            ES: 'Hola! ',
            FR: 'Salut! ',
            YO: 'E nle o! ',
            ZH: 'Ni hao! ',
            AR: 'Marhaban! '
        };

        const prefix = dict[String(targetLang).toUpperCase()] || `[${targetLang}] `;
        const translatedText = prefix + String(text || '') + ' (GlobalX Real-time AI Translate)';

        res.json({ success: true, translatedText });
    } catch (error) {
        logger.error(`Translation Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Translation failed' });
    }
};
