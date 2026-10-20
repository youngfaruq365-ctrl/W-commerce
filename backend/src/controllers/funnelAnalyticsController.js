const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

exports.trackEvent = async (req, res) => {
  try {
    const { sessionId, eventName, event, userId, productId, storeId, source, metadata, url, userAgent } = req.body;

    // Accept both 'event' and 'eventName' for backwards compatibility
    const eventValue = event || eventName;

    if (!sessionId && !eventValue) {
      return res.status(400).json({ error: 'sessionId and event/eventName are required' });
    }

    const funnelEvent = await prisma.funnelEvent.create({
      data: {
        sessionId: sessionId || 'anonymous',
        event: eventValue,
        userId: userId || null,
        productId: productId || null,
        storeId: storeId || null,
        source: source || null,
        metadata: metadata ? JSON.stringify(metadata) : (url || userAgent) ? JSON.stringify({ url, userAgent }) : null
      }
    });

    res.status(201).json({ success: true, data: funnelEvent });
  } catch (error) {
    logger.error('Error tracking funnel event:', error.message);
    res.status(500).json({ error: 'Failed to track funnel event' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const events = await prisma.funnelEvent.groupBy({
      by: ['event'],
      _count: {
        id: true
      }
    });

    const metrics = {};
    events.forEach(item => {
      metrics[item.event] = item._count.id;
    });

    // Build stats object matching what the frontend expects
    const stats = {
      landing_visitors: metrics['page_view'] || metrics['PAGE_VIEW_LANDING'] || 0,
      buyer_shopping: metrics['buyer_shopping'] || metrics['STORE_VIEWED'] || 0,
      buyer_checkout_started: metrics['buyer_checkout_started'] || metrics['CHECKOUT_STARTED'] || 0,
      seller_checkout: metrics['seller_checkout'] || metrics['CHECKOUT_COMPLETED'] || 0,
      buyer_checkout_completed: metrics['buyer_checkout_completed'] || metrics['PURCHASE_COMPLETED'] || 0,
      buyer_app_download: metrics['buyer_app_download'] || metrics['APP_HANDOFF'] || 0,
    };

    const totalVisitors = stats.landing_visitors;
    const totalPurchases = stats.buyer_checkout_completed;

    let overallConversion = 0;
    if (totalVisitors > 0) overallConversion = ((totalPurchases / totalVisitors) * 100).toFixed(2);

    res.status(200).json({
      success: true,
      // Return BOTH formats so both old and new frontends work
      stats,
      data: {
        metrics,
        stats,
        summary: {
          visitors: totalVisitors,
          purchases: totalPurchases,
        },
        conversion: {
          overallConversion
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
