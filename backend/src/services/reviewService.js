const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

class ReviewService {
    /**
     * Toggle helpful vote on a review
     */
    async toggleHelpful(reviewId, userId) {
        const existing = await prisma.reviewLike.findUnique({
            where: { reviewId_userId: { reviewId, userId } }
        });

        if (existing) {
            await prisma.reviewLike.delete({
                where: { id: existing.id }
            });
            await prisma.review.update({
                where: { id: reviewId },
                data: { helpfulCount: { decrement: 1 } }
            });
            return { liked: false };
        } else {
            await prisma.reviewLike.create({
                data: { reviewId, userId, isHelpful: true }
            });
            await prisma.review.update({
                where: { id: reviewId },
                data: { helpfulCount: { increment: 1 } }
            });
            return { liked: true };
        }
    }

    /**
     * Report a review (fake, spam, etc.)
     */
    async reportReview(reviewId, reporterId, reason, description = '') {
        const report = await prisma.reviewReport.create({
            data: {
                reviewId,
                reporterId,
                reason,
                description
            }
        });

        // Increment report count on review
        await prisma.review.update({
            where: { id: reviewId },
            data: { reportCount: { increment: 1 } }
        });

        // If too many reports, flag for admin review
        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (review && review.reportCount >= 5) {
            // Send alert to admin (could create admin notification)
            logger.warn(`[REVIEW] Review ${reviewId} has ${review.reportCount} reports - flagging for admin`);
        }

        return report;
    }

    /**
     * Recalculate top reviews for a product
     * Called periodically or on new review/like
     */
    async recalcTopReviews(productId) {
        const reviews = await prisma.review.findMany({
            where: { productId },
            orderBy: [
                { helpfulCount: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 10
        });

        // Reset previous top flags for this product
        await prisma.review.updateMany({
            where: { productId, isTopReview: true },
            data: { isTopReview: false }
        });

        // Set top flag for top 3?
        const topCount = Math.min(3, reviews.length);
        for (let i = 0; i < topCount; i++) {
            await prisma.review.update({
                where: { id: reviews[i].id },
                data: { isTopReview: true }
            });
        }

        logger.info(`[REVIEW] Updated top reviews for product ${productId} (${topCount} featured)`);
    }

    /**
     * Get product rating summary with verified buyer percentages
     */
    async getRatingSummary(productId) {
        const reviews = await prisma.review.findMany({
            where: { productId }
        });

        const total = reviews.length;
        if (total === 0) {
            return { average: 0, total: 0, distribution: {5:0,4:0,3:0,2:0,1:0} };
        }

        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avg = Math.round((sum / total) * 10) / 10;

        const distribution = {5:0,4:0,3:0,2:0,1:0};
        reviews.forEach(r => {
            distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });

        // Verified purchase % (always 100% for this platform as enforced)
        const verifiedPercent = 100;

        return { average: avg, total, distribution, verifiedPercent };
    }
}

module.exports = new ReviewService();
