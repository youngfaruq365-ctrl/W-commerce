 const prisma = require('../utils/prismaClient');
 const DOMPurify = require('isomorphic-dompurify');
 const logger = require('../utils/logger');
 const reviewService = require('../services/reviewService');
 const sellerAnalyticsService = require('../services/sellerAnalyticsService');

/**
 * Create a new review
 */
exports.createReview = async (req, res) => {
    try {
        const { productId, rating, comment, images } = req.body;
        const userId = req.user.id;

        // 1. Validate - User must have purchased the product
        const order = await prisma.order.findFirst({
            where: {
                buyerId: userId,
                status: {
                    in: ['DELIVERED', 'COMPLETED']
                },
                items: {
                    some: {
                        productId: productId
                    }
                }
            }
        });

        if (!order) {
            return res.status(403).json({
                success: false,
                message: 'You can only review products you have purchased and received.'
            });
        }

        // 2. Check if already reviewed
        const existingReview = await prisma.review.findFirst({
            where: {
                productId,
                userId
            }
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product.'
            });
        }

        // 3. Sanitize comment
        const cleanComment = DOMPurify.sanitize(comment);

        // 4. Process uploaded images
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const mockReq = { file: file };
                    const imageUrl = await require('../middleware/uploadMiddleware').uploadToCloud(mockReq, { status: () => ({ json: () => {} }) });
                    imageUrls.push(imageUrl);
                } catch (error) {
                    imageUrls.push(`/uploads/${file.filename}`);
                }
            }
        } else if (images && Array.isArray(images)) {
            imageUrls = images;
        }

        // 5. Validate rating bounds
        // BUG-REV-02: Was accepting any integer (999, -5), corrupting product/seller averages
        const parsedRating = parseInt(rating, 10);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const review = await prisma.review.create({
            data: {
                productId,
                userId,
                sellerId: product.store.sellerId,
                rating: parsedRating,
                comment: cleanComment,
                images: JSON.stringify(imageUrls),
                orderId: order.id // link to specific order for verification
            },
            include: {
                user: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        // Recalculate top reviews asynchronously (non-blocking)
        reviewService.recalcTopReviews(productId).catch(err => logger.warn(`Top reviews recalc failed: ${err.message}`));

        // 6. Update Product Average Rating
        const allReviews = await prisma.review.findMany({
            where: { productId }
        });

        const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

        await prisma.product.update({
            where: { id: productId },
            data: { rating: avgRating }
        });

        // 7. Update Seller Average Rating
        if (product && product.store) {
            const storeId = product.storeId;

            const allSellerReviews = await prisma.review.findMany({
                where: {
                    product: { storeId: storeId }
                }
            });

            const sellerAvgRating = allSellerReviews.length > 0
                ? allSellerReviews.reduce((acc, r) => acc + r.rating, 0) / allSellerReviews.length
                : 0.0;

            await prisma.store.update({
                where: { id: storeId },
                data: { averageRating: sellerAvgRating }
            });

            await sellerAnalyticsService.updatePerformanceScore(product.store.sellerId).catch((err) => {
                logger.warn(`Seller trust refresh failed after review: ${err.message}`);
            });

            // 8. Notify Seller
            await prisma.notification.create({
                data: {
                    userId: product.store.sellerId,
                    title: '⭐ New Product Review',
                    body: `A buyer just rated "${product.title}" ${parsedRating} stars.`,
                    type: 'INFO',
                    linkUrl: '/seller-dashboard.html?tab=reviews'
                }
            });
        }

        res.status(201).json({ success: true, review });

    } catch (error) {
        logger.error(`Create Review Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
};

/**
 * Get reviews for a product
 */
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user ? req.user.id : null;

        const reviews = await prisma.review.findMany({
            where: { productId },
            include: {
                user: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                },
                likes: userId ? { where: { userId } } : false
            },
            orderBy: [{ isTopReview: 'desc' }, { helpfulCount: 'desc' }, { createdAt: 'desc' }]
        });

        // BUG-REV-01: Was hardcoding verifiedPurchase: true for ALL reviews regardless of orderId.
        // Now computed from whether the review has an orderId (set at creation time from a DELIVERED order).
        const enriched = reviews.map(r => ({
            ...r,
            verifiedPurchase: !!r.orderId,
            likedByCurrentUser: userId ? r.likes.length > 0 : false
        }));

        res.json({ success: true, reviews: enriched });
    } catch (error) {
        logger.error(`Fetch Reviews Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
};

/**
 * Get reviews by current user
 */
exports.getMyReviews = async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { userId: req.user.id },
            include: {
                product: {
                    select: {
                        title: true,
                        images: {
                            where: { isPrimary: true },
                            take: 1
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, reviews });
    } catch (error) {
        logger.error(`Fetch My Reviews Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch your reviews' });
    }
};

/**
 * Delete a review (Only by author or Admin)
 * BUG-REV-03: Was not recalculating product/seller avg rating after deletion,
 * causing averages to drift permanently from reality.
 */
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const review = await prisma.review.findUnique({
            where: { id },
            include: { product: { include: { store: true } } }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await prisma.review.delete({ where: { id } });

        // Recalculate product avg rating
        const remainingReviews = await prisma.review.findMany({ where: { productId: review.productId } });
        const newAvg = remainingReviews.length > 0
            ? remainingReviews.reduce((acc, r) => acc + r.rating, 0) / remainingReviews.length
            : 0;
        await prisma.product.update({
            where: { id: review.productId },
            data: { rating: newAvg }
        });

        // Recalculate seller avg rating
        if (review.product?.store) {
            const storeId = review.product.storeId;
            const allSellerReviews = await prisma.review.findMany({
                where: { product: { storeId } }
            });
            const sellerAvg = allSellerReviews.length > 0
                ? allSellerReviews.reduce((acc, r) => acc + r.rating, 0) / allSellerReviews.length
                : 0;
            await prisma.store.update({
                where: { id: storeId },
                data: { averageRating: sellerAvg }
            });
        }

        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        logger.error(`Delete Review Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to delete review' });
    }
};

/**
 * Get all reviews for products belonging to a seller
 */
exports.getSellerReviews = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const store = await prisma.store.findUnique({ where: { sellerId } });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        const reviews = await prisma.review.findMany({
            where: {
                product: { storeId: store.id }
            },
            include: {
                user: { select: { fullName: true, avatarUrl: true } },
                product: { select: { title: true, id: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, reviews });
    } catch (error) {
        logger.error(`Fetch Seller Reviews Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch customer feedback' });
    }
};

/**
 * Toggle "Featured" status of a review (On portfolio)
 * BUG-REV-05: Admin was blocked by seller ownership check even though route allows ADMIN
 */
exports.toggleFeatureReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const review = await prisma.review.findUnique({
            where: { id },
            include: { product: { include: { store: true } } }
        });

        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        // Allow admin to bypass seller ownership check
        if (req.user.role !== 'ADMIN' && review.product.store.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updated = await prisma.review.update({
            where: { id },
            data: { isFeatured: !review.isFeatured }
        });

        res.json({ success: true, review: updated });
    } catch (error) {
        logger.error(`Toggle Feature Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Seller replies to a review
 * BUG-REV-04: Admin was blocked by seller ownership check even though route allows ADMIN
 */
exports.replyToReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        const userId = req.user.id;

        const review = await prisma.review.findUnique({
            where: { id },
            include: { product: { include: { store: true } } }
        });

        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        // Allow admin to bypass seller ownership check
        if (req.user.role !== 'ADMIN' && review.product.store.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updated = await prisma.review.update({
            where: { id },
            data: {
                reply,
                repliedAt: new Date()
            }
        });

        // Notify Buyer
        await prisma.notification.create({
            data: {
                userId: review.userId,
                title: '🏪 Seller Replied to Your Review',
                body: `The seller of "${review.product.title}" has responded to your feedback.`,
                type: 'INFO',
                linkUrl: `/product.html?id=${review.productId}`
            }
        });

        res.json({ success: true, review: updated });
    } catch (error) {
        logger.error(`Reply Review Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to post reply' });
    }
};

/**
 * Seller appeals a review
 */
exports.appealReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        logger.info(`Seller ${req.user.id} appealed review ${id} for reason: ${reason}`);
        res.json({ success: true, message: 'Review appeal submitted successfully' });
    } catch (error) {
        logger.error(`Appeal Review Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Toggle helpful vote on a review
 */
exports.toggleHelpful = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await reviewService.toggleHelpful(id, userId);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error(`Toggle Helpful Error: ${error.message}`);
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Report a review (fake, spam, etc.)
 */
exports.reportReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, description } = req.body;
        const reporterId = req.user.id;

        const report = await reviewService.reportReview(id, reporterId, reason, description);
        res.status(201).json({ success: true, report });
    } catch (error) {
        logger.error(`Report Review Error: ${error.message}`);
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Get featured reviews for landing page (Public)
 */
exports.getGlobalFeaturedReviews = async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            take: 4,
            where: { rating: 5, isTopReview: true },
            include: {
                user: { select: { fullName: true, avatarUrl: true } },
                product: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, reviews });
    } catch (error) {
        logger.error(`Get Featured Reviews Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
