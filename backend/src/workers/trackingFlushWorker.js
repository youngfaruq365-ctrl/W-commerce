const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisManager = require('../utils/redisManager');
const logger = require('../utils/logger');
const trackingCompressionService = require('../services/delivery/trackingCompressionService');

/**
 * Worker that flushes Redis tracking streams to PostgreSQL periodically.
 */
class TrackingFlushWorker {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info("Tracking Flush Worker started");
        
        // Run every 60 seconds
        this.interval = setInterval(() => this.process(), 60000);
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
            if (!redisManager.getStatus().connected) return;
            const client = redisManager.client;

            // 1. Find all tracking stream keys
            let cursor = '0';
            let keys = [];
            do {
                const result = await client.scan(cursor, 'MATCH', 'tracking:history:*', 'COUNT', 100);
                cursor = result[0];
                keys = keys.concat(result[1]);
            } while (cursor !== '0');

            if (keys.length === 0) return;

            // 2. Process each stream
            for (const key of keys) {
                const assignmentId = key.split(':')[2];
                if (!assignmentId) continue;

                // Read all entries in the stream
                const streamData = await client.xrange(key, '-', '+');
                if (!streamData || streamData.length === 0) continue;

                // Parse Redis format
                const parsedEntries = streamData.map(entry => {
                    const id = entry[0];
                    const rawData = entry[1]; // Array of [key, value, key, value...]
                    const data = {};
                    for (let i = 0; i < rawData.length; i += 2) {
                        data[rawData[i]] = rawData[i + 1];
                    }
                    return { id, data };
                });

                // Compress
                const compressed = trackingCompressionService.downsample(parsedEntries);

                // Insert into DB
                if (compressed.length > 0) {
                    const dataToInsert = compressed.map(c => ({
                        assignmentId,
                        status: 'IN_TRANSIT', // Generic historical status
                        lat: c.lat,
                        lng: c.lng,
                        createdAt: c.timestamp
                    }));

                    await prisma.deliveryTrackingEvent.createMany({
                        data: dataToInsert
                    });
                }

                // Delete the stream once flushed (or just XTRIM)
                await client.del(key);
            }

            logger.info(`Flushed ${keys.length} tracking streams to PostgreSQL.`);

        } catch (error) {
            logger.error(`Error in TrackingFlushWorker: ${error.message}`);
        }
    }
}

module.exports = new TrackingFlushWorker();
