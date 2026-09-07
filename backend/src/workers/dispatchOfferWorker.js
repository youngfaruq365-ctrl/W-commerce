const offerService = require('../services/delivery/offerService');
const { dispatchService } = require('../services/delivery/dispatchService');
const logger = require('../utils/logger');

/**
 * Background worker that expires stale offers and re-dispatches them to the next best courier.
 */
class DispatchOfferWorker {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info("Dispatch Offer Worker started");
        
        // Check every 5 seconds
        this.interval = setInterval(() => this.process(), 5000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }

    async process() {
        try {
            // 1. Expire stale offers
            const expiredCount = await offerService.expireStaleOffers();
            if (expiredCount > 0) {
                logger.info(`Expired ${expiredCount} stale delivery offers.`);
            }

            // 2. Find orphaned assignments (PENDING, with no ACTIVE offers)
            const orphaned = await offerService.getOrphanedAssignments();
            
            // 3. Re-dispatch them
            for (const assignment of orphaned) {
                // To avoid overloading, we can run these sequentially or bounded
                await dispatchService.dispatchAssignment(assignment);
            }
        } catch (error) {
            logger.error("Error in DispatchOfferWorker: " + error.message);
        }
    }
}

module.exports = new DispatchOfferWorker();
