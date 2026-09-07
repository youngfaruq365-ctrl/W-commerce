/**
 * Cron Job Manager
 * Ensures cron jobs run only once (singleton pattern)
 * Prevents duplicate execution across multiple server instances
 * Integrates with Redis for distributed locking
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const redisManager = require('../utils/redisManager');
const crypto = require('crypto');

class CronJobManager {
    constructor() {
        this.jobs = new Map();
        this.lockDuration = 60; // seconds
    }

    /**
     * Register and start a cron job with distributed locking
     * @param {string} name - Job name
    * @param {string} schedule - Cron expression (e.g., '* /5 * * * *' for every 5 minutes)
     * @param {Function} handler - Async function to execute
     * @param {object} options - { runOnStartup, lockExpiry }
     */
    register(name, schedule, handler, options = {}) {
        const { runOnStartup = false, lockExpiry = 60 } = options;

        // Prevent duplicate job registration
        if (this.jobs.has(name)) {
            logger.warn(`Cron job "${name}" already registered. Skipping duplicate.`);
            return;
        }

        // Create lock key for distributed systems
        const lockKey = `cron:${name}:lock`;

        // Wrapper with distributed lock
        const wrappedHandler = async () => {
            try {
                // Attempt to acquire lock (returns lock token when acquired)
                const lockToken = await this.acquireLock(lockKey, lockExpiry);

                if (!lockToken) {
                    logger.debug(`Cron job "${name}" already running on another instance. Skipping.`);
                    return;
                }

                logger.info(`⏰ Starting cron job: "${name}"`);
                const startTime = Date.now();

                try {
                    await handler();
                    const duration = Date.now() - startTime;
                    logger.info(`✅ Cron job "${name}" completed in ${duration}ms`);
                } catch (error) {
                    logger.error(`❌ Cron job "${name}" failed: ${error.message}`);
                } finally {
                    // Release lock only if we are the owner
                    try {
                        await redisManager.releaseLockIfOwner(lockKey, lockToken);
                    } catch (err) {
                        logger.warn(`Failed releasing cron lock for "${name}": ${err.message}`);
                    }
                }
            } catch (error) {
                logger.error(`Cron job "${name}" lock error: ${error.message}`);
            }
        };

        // Schedule the job
        try {
            const task = cron.schedule(schedule, wrappedHandler, { scheduled: false });
            this.jobs.set(name, { task, schedule, handler, lockKey });

            // Start job
            task.start();
            logger.info(`✅ Cron job registered: "${name}" (${schedule})`);

            // Run immediately on startup if requested
            if (runOnStartup) {
                setImmediate(() => wrappedHandler());
            }
        } catch (error) {
            logger.error(`Failed to register cron job "${name}": ${error.message}`);
        }
    }

    /**
     * Acquire distributed lock via Redis
     * Uses SET with NX (if not exists) and EX (expiry) for atomic operation
     */
    async acquireLock(lockKey, expirySeconds) {
        try {
            const lockId = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
            // Try to set lock atomically (NX + EX)
            const acquired = await redisManager.setIfNotExists(lockKey, lockId, expirySeconds);
            if (acquired) return lockId;
            return null;
        } catch (error) {
            logger.error(`Lock acquisition failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop a specific cron job
     */
    stop(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.task.stop();
            logger.info(`⏸️  Cron job stopped: "${name}"`);
        }
    }

    /**
     * Stop all cron jobs
     */
    stopAll() {
        this.jobs.forEach(({ task }, name) => {
            task.stop();
            logger.info(`⏸️  Cron job stopped: "${name}"`);
        });
    }

    /**
     * Get status of all jobs
     */
    getStatus() {
        const status = {};
        this.jobs.forEach(({ schedule }, name) => {
            status[name] = {
                schedule,
                running: true,
            };
        });
        return status;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Shutting down cron jobs...');
        this.stopAll();
        logger.info('All cron jobs stopped');
    }
}

// Singleton instance
const cronJobManager = new CronJobManager();

module.exports = cronJobManager;
