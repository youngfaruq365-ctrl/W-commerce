/**
 * Tracking Compression Service
 * Downsamples raw GPS streams into optimized paths for permanent storage.
 */
class TrackingCompressionService {
    /**
     * Basic time-based downsampling. Keeps approximately 1 point per minute.
     * @param {Array} streamEntries - Array of parsed Redis Stream objects
     */
    downsample(streamEntries, intervalMs = 60000) {
        if (!streamEntries || streamEntries.length === 0) return [];
        
        const compressed = [];
        let lastTime = 0;

        for (const entry of streamEntries) {
            // entry is like: { id: '1692..-0', data: { lat: '...', lng: '...', timestamp: '...' } }
            const timestamp = parseInt(entry.data.timestamp || 0, 10);
            
            if (timestamp - lastTime >= intervalMs) {
                compressed.push({
                    lat: parseFloat(entry.data.lat),
                    lng: parseFloat(entry.data.lng),
                    timestamp: new Date(timestamp)
                });
                lastTime = timestamp;
            }
        }
        
        return compressed;
    }

    /**
     * Advanced downsampling (Douglas-Peucker) could be added here later.
     */
}

module.exports = new TrackingCompressionService();
