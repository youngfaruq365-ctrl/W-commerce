const redisManager = require('../../utils/redisManager');
const logger = require('../../utils/logger');

/**
 * Tracking Buffer Service
 * Buffers high-frequency GPS points into Redis Streams per assignment.
 */
class TrackingBufferService {
    async appendPoint(assignmentId, payload) {
        try {
            if (!redisManager.getStatus().connected) return false;
            
            const client = redisManager.client;
            const streamKey = `tracking:history:${assignmentId}`;
            
            // XADD key * lat <lat> lng <lng> accuracy <acc> timestamp <ts>
            await client.xadd(
                streamKey,
                '*', // auto-generate ID
                'lat', payload.lat.toString(),
                'lng', payload.lng.toString(),
                'accuracy', payload.accuracy ? payload.accuracy.toString() : '0',
                'speed', payload.speed ? payload.speed.toString() : '0',
                'heading', payload.heading ? payload.heading.toString() : '0',
                'timestamp', payload.timestamp ? payload.timestamp.toString() : Date.now().toString()
            );

            // Set expiration on stream in case it gets orphaned (e.g., 24 hours)
            await client.expire(streamKey, 86400);
            
            return true;
        } catch (error) {
            logger.error(`Error appending to tracking buffer: ${error.message}`);
            return false;
        }
    }
}

module.exports = new TrackingBufferService();
