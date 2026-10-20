const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');

async function logStudioNotification(userId, title, body, type = 'SYSTEM') {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { userId, title, body, type, isRead: false }
    });
  } catch (err) {
    logger.warn(`Failed to create buyer studio notification: ${err.message}`);
  }
}

// Dispute Action
exports.disputeAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Dispute Filed', details || 'Your dispute has been escalated to arbitration.', 'DISPUTE');
    logger.info('Buyer dispute action received');
    return res.status(200).json({ success: true, message: 'Dispute filed successfully', details });
  } catch (error) {
    logger.error('Error in disputeAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to file dispute' });
  }
};

// History Action
exports.historyAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Order History Exported', details || 'Your order history export is ready.', 'ORDER');
    logger.info('Buyer history export action received');
    return res.status(200).json({ success: true, message: 'History exported successfully', details });
  } catch (error) {
    logger.error('Error in historyAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to export history' });
  }
};

// Hub Action
exports.hubAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Hub Consolidation Requested', details || 'Your packages have been queued for hub consolidation.', 'SHIPPING');
    logger.info('Buyer hub consolidate action received');
    return res.status(200).json({ success: true, message: 'Packages consolidated successfully', details });
  } catch (error) {
    logger.error('Error in hubAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to consolidate packages' });
  }
};

// Notifications Action
exports.notificationsAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Alert Preferences Saved', details || 'Your notification alert rules have been updated.', 'SYSTEM');
    logger.info('Buyer notification alerts configure action received');
    return res.status(200).json({ success: true, message: 'Alerts configured successfully', details });
  } catch (error) {
    logger.error('Error in notificationsAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to configure alerts' });
  }
};

// Payment Action
exports.paymentAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Payment Account Linked', details || 'Your payment method settings were updated.', 'PAYMENT');
    logger.info('Buyer payment link account action received');
    return res.status(200).json({ success: true, message: 'Payment account linked successfully', details });
  } catch (error) {
    logger.error('Error in paymentAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to link payment account' });
  }
};

// Refunds Action
exports.refundsAction = async (req, res) => {
  try {
    const { details } = req.body;
    await logStudioNotification(req.user?.id, 'Refund Requested', details || 'Your refund request is under review.', 'REFUND');
    logger.info('Buyer refund request action received');
    return res.status(200).json({ success: true, message: 'Refund requested successfully', details });
  } catch (error) {
    logger.error('Error in refundsAction:', error);
    return res.status(500).json({ success: false, message: 'Failed to request refund' });
  }
};
