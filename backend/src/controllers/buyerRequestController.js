const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const demandDiscoveryService = require('../services/demandDiscoveryService');

const RESPONSE_TYPES = new Set(['ACCEPT', 'DECLINE', 'QUOTE']);

function parseMoney(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

function deriveRequestStatus(responseTypes = []) {
    if (responseTypes.includes('ACCEPT')) return 'ACCEPTED';
    if (responseTypes.includes('QUOTE')) return 'QUOTED';
    if (responseTypes.length > 0) return 'RESPONDED';
    return 'OPEN';
}

function formatRequest(request, currentSellerId = null) {
    const responses = (request.responses || []).map((response) => ({
        id: response.id,
        responseType: response.responseType,
        message: response.message,
        quotedPrice: response.quotedPrice != null ? Number(response.quotedPrice) : null,
        alternativeSuggestion: response.alternativeSuggestion || null,
        estimatedDeliveryDays: response.estimatedDeliveryDays || null,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        seller: response.seller ? {
            id: response.seller.id,
            fullName: response.seller.fullName,
            email: response.seller.email,
            storeName: response.seller.store?.storeName || null
        } : null,
        isMine: currentSellerId ? response.sellerId === currentSellerId : false
    }));

    const ownResponse = currentSellerId
        ? responses.find((response) => response.isMine) || null
        : null;

    return {
        id: request.id,
        productName: request.productName,
        description: request.description,
        budget: Number(request.budget),
        preferredBudgetMax: request.preferredBudgetMax != null ? Number(request.preferredBudgetMax) : null,
        quantity: request.quantity,
        urgency: request.urgency,
        category: request.category,
        location: request.location,
        neededBy: request.neededBy,
        isBulkRequest: request.isBulkRequest,
        demandScore: request.demandScore,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        buyer: request.buyer ? {
            id: request.buyer.id,
            fullName: request.buyer.fullName,
            email: request.buyer.email
        } : null,
        responses,
        responseCount: responses.length,
        ownResponse
    };
}

async function notifySellersAboutHotDemand(request) {
    const similarDemandCount = await prisma.buyerRequest.count({
        where: {
            productName: request.productName,
            createdAt: {
                gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
            }
        }
    });

    if (similarDemandCount < 3) {
        return;
    }

    const sellers = await prisma.user.findMany({
        where: {
            role: 'SELLER',
            store: {
                isVerified: true
            }
        },
        select: { id: true }
    });

    if (sellers.length === 0) {
        return;
    }

    await prisma.notification.createMany({
        data: sellers.slice(0, 25).map((seller) => ({
            userId: seller.id,
            title: 'Demand signal detected',
            body: `${request.productName} has been requested multiple times this week. Consider stocking it.`,
            type: 'ALERT',
            linkUrl: '/seller-dashboard.html?tab=buyer-requests'
        }))
    });
}

exports.createBuyerRequest = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const payload = demandDiscoveryService.normalizeCreatePayload(req.body);

        if (!payload.productName || !payload.description || payload.budget === null) {
            return res.status(400).json({
                success: false,
                message: 'Product name, description, and a valid budget are required.'
            });
        }

        const request = await prisma.buyerRequest.create({
            data: {
                buyerId,
                ...payload,
                status: 'OPEN'
            },
            include: {
                responses: true
            }
        });

        await demandDiscoveryService.refreshDemandScores();
        await notifySellersAboutHotDemand(request);

        res.status(201).json({
            success: true,
            message: request.isBulkRequest
                ? 'Your bulk request has been submitted and highlighted to sellers.'
                : 'Your product request has been submitted.',
            request: formatRequest(request),
            marketSignals: {
                movedToBulkFlow: request.isBulkRequest,
                demandFeedEligible: true
            }
        });
    } catch (error) {
        logger.error(`Create Buyer Request Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to submit buyer request.' });
    }
};

exports.getMyBuyerRequests = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const requests = await prisma.buyerRequest.findMany({
            where: { buyerId },
            include: {
                responses: {
                    include: {
                        seller: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                store: {
                                    select: {
                                        storeName: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: [
                { demandScore: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        res.json({
            success: true,
            requests: requests.map((request) => formatRequest(request)),
            trendingDemand: await demandDiscoveryService.getTrendingDemandFeed(6)
        });
    } catch (error) {
        logger.error(`Get My Buyer Requests Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load buyer requests.' });
    }
};

exports.getMarketplaceBuyerRequests = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { category, urgency, bulkOnly } = req.query;

        const where = {};
        if (category) where.category = category;
        if (urgency) where.urgency = urgency;
        if (bulkOnly === 'true') where.isBulkRequest = true;

        const requests = await prisma.buyerRequest.findMany({
            where,
            include: {
                buyer: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                responses: {
                    include: {
                        seller: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                store: {
                                    select: {
                                        storeName: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: [
                { demandScore: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        res.json({
            success: true,
            requests: requests.map((request) => formatRequest(request, sellerId)),
            trendingDemand: await demandDiscoveryService.getTrendingDemandFeed(8)
        });
    } catch (error) {
        logger.error(`Get Marketplace Buyer Requests Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load buyer requests.' });
    }
};

exports.respondToBuyerRequest = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { requestId } = req.params;
        const responseType = String(req.body.responseType || '').trim().toUpperCase();
        const message = String(req.body.message || '').trim() || null;
        const quotedPrice = req.body.quotedPrice === undefined || req.body.quotedPrice === null || req.body.quotedPrice === ''
            ? null
            : parseMoney(req.body.quotedPrice);
        const alternativeSuggestion = req.body.alternativeSuggestion ? String(req.body.alternativeSuggestion).trim() : null;
        const estimatedDeliveryDays = req.body.estimatedDeliveryDays ? Number(req.body.estimatedDeliveryDays) : null;

        if (!RESPONSE_TYPES.has(responseType)) {
            return res.status(400).json({
                success: false,
                message: 'Response type must be ACCEPT, DECLINE, or QUOTE.'
            });
        }

        if (responseType === 'QUOTE' && quotedPrice === null) {
            return res.status(400).json({
                success: false,
                message: 'A valid quoted price is required when sending a quote.'
            });
        }

        const existingRequest = await prisma.buyerRequest.findUnique({
            where: { id: requestId },
            include: {
                buyer: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });

        if (!existingRequest) {
            return res.status(404).json({ success: false, message: 'Buyer request not found.' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const response = await tx.requestResponse.upsert({
                where: {
                    requestId_sellerId: {
                        requestId,
                        sellerId
                    }
                },
                update: {
                    responseType,
                    message,
                    quotedPrice,
                    alternativeSuggestion,
                    estimatedDeliveryDays
                },
                create: {
                    requestId,
                    sellerId,
                    responseType,
                    message,
                    quotedPrice,
                    alternativeSuggestion,
                    estimatedDeliveryDays
                },
                include: {
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            store: {
                                select: {
                                    storeName: true
                                }
                            }
                        }
                    }
                }
            });

            const responseTypes = await tx.requestResponse.findMany({
                where: { requestId },
                select: { responseType: true }
            });

            const nextStatus = deriveRequestStatus(responseTypes.map((entry) => entry.responseType));

            await tx.buyerRequest.update({
                where: { id: requestId },
                data: { status: nextStatus }
            });

            const sellerLabel = response.seller.store?.storeName || response.seller.fullName;
            let body = `${sellerLabel} responded to your request for "${existingRequest.productName}".`;
            if (responseType === 'ACCEPT') {
                body = `${sellerLabel} accepted your request for "${existingRequest.productName}".`;
            } else if (responseType === 'QUOTE') {
                body = `${sellerLabel} sent a quote of $${quotedPrice.toFixed(2)} for "${existingRequest.productName}".`;
            } else if (responseType === 'DECLINE') {
                body = `${sellerLabel} declined your request for "${existingRequest.productName}".`;
            }

            if (alternativeSuggestion) {
                body += ` Alternative: ${alternativeSuggestion}.`;
            }

            await tx.notification.create({
                data: {
                    userId: existingRequest.buyer.id,
                    title: 'Buyer Request Update',
                    body,
                    type: 'INFO',
                    linkUrl: '/buyer-requests.html'
                }
            });

            return { response, nextStatus };
        });

        res.json({
            success: true,
            message: 'Response saved successfully.',
            response: {
                id: result.response.id,
                responseType: result.response.responseType,
                message: result.response.message,
                quotedPrice: result.response.quotedPrice != null ? Number(result.response.quotedPrice) : null,
                alternativeSuggestion: result.response.alternativeSuggestion,
                estimatedDeliveryDays: result.response.estimatedDeliveryDays,
                createdAt: result.response.createdAt,
                updatedAt: result.response.updatedAt,
                seller: {
                    id: result.response.seller.id,
                    fullName: result.response.seller.fullName,
                    email: result.response.seller.email,
                    storeName: result.response.seller.store?.storeName || null
                }
            },
            requestStatus: result.nextStatus
        });
    } catch (error) {
        logger.error(`Respond To Buyer Request Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to save request response.' });
    }
};

exports.getTrendingDemandFeed = async (req, res) => {
    try {
        res.json({
            success: true,
            trendingDemand: await demandDiscoveryService.getTrendingDemandFeed(Number(req.query.limit || 10))
        });
    } catch (error) {
        logger.error(`Get Trending Demand Feed Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load demand feed.' });
    }
};

exports.getSellerDemandInsights = async (req, res) => {
    try {
        res.json({
            success: true,
            insights: await demandDiscoveryService.getSellerDemandInsights()
        });
    } catch (error) {
        logger.error(`Get Seller Demand Insights Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load demand insights.' });
    }
};
