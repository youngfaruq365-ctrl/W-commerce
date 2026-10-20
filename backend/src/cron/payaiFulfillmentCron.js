'use strict';

/**
 * PayAI Proactive Fulfillment & Milestone Cron
 *
 * Scans active orders in SELLER_ACCEPTED and PREPARING states.
 * Identifies preparation bottlenecks and approaching delivery deadlines.
 * Proactively reminds merchants, updates estimated delivery timelines,
 * notifies buyers, and logs structured status events to prisma.payAIOrderStatusEvent.
 */

const logger = require('../utils/logger');
const cronJobManager = require('../services/cronJobManager');
const orderService = require('../services/payai/orderService');

/**
 * Scan active orders for preparation and milestone delays
 * @param {Object} options
 * @param {boolean} [options.forceRun=false] - Bypass operating hours check if true
 * @param {string} [options.timeZone='Africa/Lagos'] - Merchant timezone
 * @param {number} [options.preparationSlaHours=24] - Standard SLA for preparation
 * @param {number} [options.criticalDeliveryWindowHours=48] - Urgency threshold
 */
async function scanAndAlertPendingOrders(options = {}) {
  try {
    logger.info('[PayAI:FulfillmentCron] Starting proactive milestone & delay monitoring scan...');
    const result = await orderService.checkFulfillmentDelays(options);
    logger.info(
      `[PayAI:FulfillmentCron] Scan complete. Scanned: ${result.scannedCount || 0}, Alerts generated: ${result.alertsGenerated || 0}, Skipped: ${result.skippedCount || 0}.`
    );
    return result;
  } catch (error) {
    logger.error(`[PayAI:FulfillmentCron] Error executing fulfillment scan: ${error.message}`);
    return {
      success: false,
      error: error.message,
      scannedCount: 0,
      alertsGenerated: 0
    };
  }
}

/**
 * Register proactive fulfillment monitoring cron job
 * Runs every 15 minutes with distributed locking via Redis
 */
function initPayAIFulfillmentCron() {
  try {
    cronJobManager.register(
      'payaiFulfillmentWatcher',
      '*/15 * * * *',
      async () => {
        await scanAndAlertPendingOrders();
      },
      { runOnStartup: false, lockExpiry: 180 }
    );
    logger.info('✅ PayAI Fulfillment Monitor cron registered (every 15 minutes)');
  } catch (error) {
    logger.error(`[PayAI:FulfillmentCron] Failed to register cron: ${error.message}`);
  }
}

module.exports = {
  initPayAIFulfillmentCron,
  scanAndAlertPendingOrders
};
