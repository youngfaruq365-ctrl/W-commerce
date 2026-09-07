const prisma = require('./prismaClient');
const logger = require('./logger');

exports.trackAIUsage = async ({ userId, storeId, tool, provider = 'gemini', inputTokens = 0, outputTokens = 0, status = 'SUCCESS' }) => {
    try {
        // Approximate costs for gemini-1.5-flash
        const estimatedCost = ((inputTokens * 0.075) + (outputTokens * 0.3)) / 1000000; 
        
        await prisma.aIUsage.create({
            data: {
                userId,
                storeId,
                tool,
                provider,
                inputTokens,
                outputTokens,
                estimatedCost,
                status
            }
        });
    } catch (e) {
        logger.error(`Failed to track AI usage: ${e.message}`);
    }
};
