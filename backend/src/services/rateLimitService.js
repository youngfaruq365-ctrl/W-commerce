const redisManager = require('../utils/redisManager');
const logger = require('../utils/logger');

// Define specific rate limits for different actions
const LIMITS = {
  LIKE: { max: 10, windowMs: 10000 },       // 10 likes per 10 seconds
  COMMENT: { max: 5, windowMs: 60000 },     // 5 comments per minute
  FOLLOW: { max: 10, windowMs: 60000 },     // 10 follows per minute
  VIEW: { max: 50, windowMs: 60000 },       // 50 views per minute
  CLICK: { max: 50, windowMs: 60000 },      // 50 clicks per minute
};

class RateLimitService {
  /**
   * Check if the user is allowed to perform an action.
   * Uses Redis if available, or falls back to Memory via redisManager.
   * @param {string} userId - The user ID
   * @param {string} action - The action type (LIKE, COMMENT, FOLLOW, VIEW, CLICK)
   * @returns {Promise<boolean>} true if allowed, false if rate limited
   */
  async checkLimit(userId, action) {
    try {
      const limitConfig = LIMITS[action];
      if (!limitConfig) {
        return true; // No limit defined for this action
      }

      const windowSeconds = Math.ceil(limitConfig.windowMs / 1000);
      const currentWindow = Math.floor(Date.now() / limitConfig.windowMs);
      const key = `ratelimit:${action}:${userId}:${currentWindow}`;

      const count = await redisManager.increment(key, windowSeconds);

      if (count > limitConfig.max) {
        logger.warn(`Rate limit exceeded for user ${userId} on action ${action}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error in RateLimitService: ${error.message}`);
      // Fail open to avoid blocking legitimate users on cache failure
      return true;
    }
  }
}

module.exports = new RateLimitService();
