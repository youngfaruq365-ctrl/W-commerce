/**
 * AI Mediation Service for Disputes
 * Automated dispute resolution using pattern recognition and analysis
 */

const prisma = require('../utils/prismaClient');

/**
 * Analyze a dispute and provide AI-powered resolution suggestion
 * @param {string} disputeId - The dispute ID to analyze
 * @returns {Object} AI analysis and suggestion
 */
async function analyzeDispute(disputeId) {
    try {
        // Fetch dispute with related data
        const dispute = await prisma.dispute.findUnique({
            where: { id: disputeId },
            include: {
                order: {
                    include: {
                        items: {
                            include: { product: true }
                        }
                    }
                }
            }
        });

        if (!dispute) {
            return { success: false, error: 'Dispute not found' };
        }

        // Get tracking info from order
        const trackingInfo = dispute.order?.trackingNumber ? {
            trackingNumber: dispute.order.trackingNumber,
            status: dispute.order.status,
            shippedDate: dispute.order.shippedAt,
            deliveredDate: dispute.order.deliveredAt
        } : null;

        // Get relevant messages between buyer and seller
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: dispute.buyerId, receiverId: dispute.sellerId },
                    { senderId: dispute.sellerId, receiverId: dispute.buyerId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // Perform AI analysis
        const analysis = performAIAnalysis(dispute, trackingInfo, messages);

        // Generate suggestion based on analysis
        const suggestion = generateSuggestion(dispute, analysis);

        // Update dispute with AI analysis
        await prisma.dispute.update({
            where: { id: disputeId },
            data: {
                aiAnalysis: analysis,
                aiSuggestion: suggestion.resolution,
                aiConfidence: suggestion.confidence,
                status: suggestion.canAutoResolve ? 'AI_RESOLVED' : dispute.status
            }
        });

        return {
            success: true,
            analysis,
            suggestion,
            canAutoResolve: suggestion.canAutoResolve
        };

    } catch (err) {
        console.error('[AIMediation] Analysis error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Perform AI analysis on dispute data
 */
function performAIAnalysis(dispute, trackingInfo, messages) {
    const analysis = {
        disputeReason: dispute.reason,
        patterns: [],
        riskFactors: [],
        confidence: 0
    };

    // Pattern 1: Tracking shows delivered but buyer claims not received
    if (trackingInfo?.status === 'DELIVERED' && 
        dispute.reason.toLowerCase().includes('not received')) {
        analysis.patterns.push({
            type: 'DELIVERY_DISPUTE',
            description: 'Tracking shows delivered but buyer reports otherwise',
            recommendation: 'Ask buyer to check with neighbors or building management'
        });
        analysis.riskFactors.push('HIGH - Delivery confirmed by carrier');
    }

    // Pattern 2: Item not as described
    if (dispute.reason.toLowerCase().includes('not as described') ||
        dispute.reason.toLowerCase().includes('different')) {
        analysis.patterns.push({
            type: 'ITEM_DISCREPANCY',
            description: 'Buyer claims item differs from listing',
            recommendation: 'Request photos of item and original listing'
        });
    }

    // Pattern 3: Damaged item
    if (dispute.reason.toLowerCase().includes('damaged') ||
        dispute.reason.toLowerCase().includes('broken')) {
        analysis.patterns.push({
            type: 'DAMAGE_CLAIM',
            description: 'Buyer reports item damage',
            recommendation: 'Request photos of damage and packaging'
        });
    }

    // Pattern 4: Message tone analysis
    const urgentKeywords = ['urgent', 'immediately', 'refund now', 'scam', 'fraud'];
    const politeKeywords = ['please', 'kindly', 'understand', 'appreciate'];
    
    const recentMessages = messages.slice(0, 5);
    const messageText = recentMessages.map(m => m.content).join(' ').toLowerCase();
    
    if (urgentKeywords.some(k => messageText.includes(k))) {
        analysis.patterns.push({
            type: 'URGENT_TONE',
            description: 'Buyer using urgent language',
            recommendation: 'Prioritize this dispute - buyer may escalate'
        });
        analysis.riskFactors.push('MEDIUM - Urgent tone detected');
    }

    if (politeKeywords.some(k => messageText.includes(k))) {
        analysis.patterns.push({
            type: 'POLITE_TONE',
            description: 'Buyer using polite language',
            recommendation: 'Good chance of resolution through communication'
        });
    }

    // Pattern 5: Time-based analysis
    const daysSinceOrder = Math.floor(
        (new Date() - new Date(dispute.order?.createdAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceOrder < 7 && dispute.reason.toLowerCase().includes('not received')) {
        analysis.patterns.push({
            type: 'EARLY_DISPUTE',
            description: 'Dispute opened within 7 days of order',
            recommendation: 'May need to wait longer for delivery'
        });
    }

    // Calculate confidence based on patterns found
    analysis.confidence = Math.min(95, 40 + (analysis.patterns.length * 15));

    return analysis;
}

/**
 * Generate resolution suggestion based on analysis
 */
function generateSuggestion(dispute, analysis) {
    const reasons = dispute.reason.toLowerCase();
    
    // Rule-based resolution logic
    
    // 1. Tracking shows delivered - suggest buyer check location
    if (analysis.riskFactors.some(r => r.includes('Delivery confirmed'))) {
        return {
            resolution: 'Tracking shows the package was delivered. Please check with neighbors, family members, or your building management. If still not found, we can file a claim with the carrier.',
            confidence: 85,
            canAutoResolve: false,
            escalateToHuman: true,
            reason: 'Delivery confirmed but buyer claims otherwise'
        };
    }

    // 2. Damaged item - request photos, likely refund
    if (reasons.includes('damaged') || reasons.includes('broken')) {
        return {
            resolution: 'We recommend requesting photos of the damage from the buyer. If confirmed, process a full refund. This appears to be a shipping damage issue covered by our buyer protection.',
            confidence: analysis.confidence,
            canAutoResolve: false,
            escalateToHuman: false,
            nextStep: 'Request photos of damage within 48 hours'
        };
    }

    // 3. Not as described - request evidence
    if (reasons.includes('not as described') || reasons.includes('different')) {
        return {
            resolution: 'Request both photos of the received item AND the original listing from buyer. Compare and determine if significant discrepancy exists.',
            confidence: analysis.confidence,
            canAutoResolve: false,
            escalateToHuman: false,
            nextStep: 'Compare evidence from both parties'
        };
    }

    // 4. Not received but within expected delivery window
    if (reasons.includes('not received')) {
        return {
            resolution: 'Package may still be in transit. We recommend waiting an additional 5-7 business days. If still not received, file a claim with the carrier.',
            confidence: 70,
            canAutoResolve: true,
            escalateToHuman: false,
            nextStep: 'Auto-resolve: Wait for delivery window to close'
        };
    }

    // Default - escalate to human
    return {
        resolution: 'This dispute requires human review due to complex circumstances. An agent will review the case within 24 hours.',
        confidence: analysis.confidence,
        canAutoResolve: false,
        escalateToHuman: true,
        nextStep: 'Escalate to support agent'
    };
}

/**
 * Batch process disputes for AI analysis
 */
async function batchAnalyzeDisputes() {
    const pendingDisputes = await prisma.dispute.findMany({
        where: {
            status: 'PENDING',
            aiAnalysis: null
        },
        take: 50
    });

    const results = [];
    for (const dispute of pendingDisputes) {
        const result = await analyzeDispute(dispute.id);
        results.push({ disputeId: dispute.id, ...result });
    }

    return results;
}

/**
 * Get AI mediation stats
 */
async function getMediationStats() {
    const total = await prisma.dispute.count();
    const aiResolved = await prisma.dispute.count({
        where: { status: 'AI_RESOLVED' }
    });
    const escalated = await prisma.dispute.count({
        where: { status: 'ESCALATED' }
    });

    return {
        total,
        aiResolved,
        escalated,
        autoResolveRate: total > 0 ? ((aiResolved / total) * 100).toFixed(1) + '%' : '0%'
    };
}

module.exports = {
    analyzeDispute,
    batchAnalyzeDisputes,
    getMediationStats
};
