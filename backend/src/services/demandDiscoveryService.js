const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { priceToNumber } = require('../models/marketplaceIntelligenceModel');

function getBulkThreshold() {
    return Number(process.env.BULK_REQUEST_THRESHOLD || 10);
}

function calculateDemandScore({ quantity, urgency, responseCount, createdAt }) {
    const urgencyWeights = {
        LOW: 1,
        STANDARD: 2,
        HIGH: 3,
        ASAP: 4
    };

    const ageHours = Math.max((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60), 1);
    return Math.round((Number(quantity || 1) * (urgencyWeights[String(urgency || 'STANDARD').toUpperCase()] || 2) * 10) + (responseCount * 6) + (24 / ageHours));
}

class DemandDiscoveryService {
    normalizeCreatePayload(body) {
        const quantity = Math.max(Number(body.quantity || 1), 1);
        const urgency = String(body.urgency || 'STANDARD').toUpperCase();
        return {
            productName: String(body.productName || '').trim(),
            description: String(body.description || '').trim(),
            budget: priceToNumber(body.budget),
            preferredBudgetMax: body.preferredBudgetMax === undefined || body.preferredBudgetMax === null || body.preferredBudgetMax === '' ? null : priceToNumber(body.preferredBudgetMax),
            quantity,
            urgency,
            category: body.category ? String(body.category).trim() : null,
            location: body.location ? String(body.location).trim() : null,
            neededBy: body.neededBy ? new Date(body.neededBy) : null,
            isBulkRequest: quantity >= getBulkThreshold()
        };
    }

    async refreshDemandScores() {
        try {
            const requests = await prisma.buyerRequest.findMany({
                include: {
                    responses: true
                }
            });

            for (const request of requests) {
                const demandScore = calculateDemandScore({
                    quantity: request.quantity,
                    urgency: request.urgency,
                    responseCount: request.responses.length,
                    createdAt: request.createdAt
                });

                await prisma.buyerRequest.update({
                    where: { id: request.id },
                    data: { demandScore }
                });
            }
        } catch (error) {
            logger.error(`Demand discovery refresh error: ${error.message}`);
        }
    }

    async getTrendingDemandFeed(limit = 10) {
        await this.refreshDemandScores();

        const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        const requests = await prisma.buyerRequest.findMany({
            where: {
                createdAt: { gte: weekAgo }
            },
            include: {
                responses: true
            },
            orderBy: [
                { demandScore: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        });

        return requests.map((request) => ({
            id: request.id,
            productName: request.productName,
            category: request.category,
            urgency: request.urgency,
            quantity: request.quantity,
            demandScore: request.demandScore,
            isBulkRequest: request.isBulkRequest,
            responseCount: request.responses.length
        }));
    }

    async getSellerDemandInsights() {
        const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

        const grouped = await prisma.buyerRequest.groupBy({
            by: ['productName', 'category'],
            where: {
                createdAt: { gte: weekAgo }
            },
            _count: {
                _all: true
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _count: {
                    productName: 'desc'
                }
            }
        });

        return grouped.slice(0, 12).map((entry) => ({
            productName: entry.productName,
            category: entry.category,
            requestCount: entry._count._all,
            requestedUnits: entry._sum.quantity || 0,
            stockSuggestion: entry._count._all >= 3 ? 'Multiple buyers want this. Consider stocking it.' : 'Monitor this demand cluster.'
        }));
    }
}

module.exports = new DemandDiscoveryService();
