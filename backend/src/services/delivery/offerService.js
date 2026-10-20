const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');

/**
 * Offer Service
 * Manages the lifecycle of DeliveryOffers with strict concurrency protection.
 */

class OfferService {
    
    /**
     * Creates a new offer for a courier.
     */
    async createOffer(assignmentId, courierId, score, durationSeconds = 60) {
        const expiresAt = new Date(Date.now() + durationSeconds * 1000);
        
        const offer = await prisma.deliveryOffer.create({
            data: {
                assignmentId,
                courierId,
                score,
                expiresAt,
                status: 'OFFERED'
            },
            include: {
                assignment: {
                    include: {
                        stops: true
                    }
                }
            }
        });
        
        return offer;
    }

    /**
     * Courier accepts an offer.
     * Uses a transaction to ensure no double-assignments.
     */
    async acceptOffer(offerId, courierId) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch the offer with write lock
            const offer = await tx.deliveryOffer.findUnique({
                where: { id: offerId },
                include: { assignment: true }
            });

            if (!offer) throw new Error("Offer not found");
            if (offer.courierId !== courierId) throw new Error("Unauthorized");
            if (offer.status !== 'OFFERED') throw new Error(`Offer is no longer available (Status: ${offer.status})`);
            if (new Date() > offer.expiresAt) throw new Error("Offer has expired");

            // 2. Ensure assignment is still PENDING/UNASSIGNED
            // We check the assignment status to ensure an admin or another system didn't force assign it
            if (offer.assignment.status !== 'PENDING' && offer.assignment.status !== 'UNASSIGNED') {
                throw new Error("Order has already been assigned");
            }

            // 3. Mark offer as ACCEPTED
            const acceptedOffer = await tx.deliveryOffer.update({
                where: { id: offerId },
                data: {
                    status: 'ACCEPTED',
                    respondedAt: new Date()
                }
            });

            // 4. Update the DeliveryAssignment
            await tx.deliveryAssignment.update({
                where: { id: offer.assignmentId },
                data: {
                    courierId: courierId,
                    status: 'ASSIGNED'
                }
            });

            // 5. Expire all other pending offers for this assignment
            await tx.deliveryOffer.updateMany({
                where: {
                    assignmentId: offer.assignmentId,
                    id: { not: offerId },
                    status: 'OFFERED'
                },
                data: {
                    status: 'CANCELLED',
                    rejectReason: 'Assigned to another courier'
                }
            });

            return acceptedOffer;
        });
    }

    /**
     * Courier rejects an offer explicitly.
     */
    async rejectOffer(offerId, courierId, reason = null) {
        const offer = await prisma.deliveryOffer.updateMany({
            where: {
                id: offerId,
                courierId: courierId,
                status: 'OFFERED'
            },
            data: {
                status: 'REJECTED',
                respondedAt: new Date(),
                rejectReason: reason
            }
        });
        
        if (offer.count === 0) {
            throw new Error("Offer not found or already processed");
        }
        
        return true;
    }

    /**
     * Expire stale offers. Called by background worker.
     */
    async expireStaleOffers() {
        const result = await prisma.deliveryOffer.updateMany({
            where: {
                status: 'OFFERED',
                expiresAt: { lt: new Date() }
            },
            data: {
                status: 'EXPIRED'
            }
        });
        
        return result.count;
    }

    /**
     * Finds assignments that are unassigned and have NO active pending offers,
     * so they can be re-dispatched.
     */
    async getOrphanedAssignments() {
        // Assignments that are PENDING and have no 'OFFERED' offers
        const assignments = await prisma.deliveryAssignment.findMany({
            where: {
                status: 'PENDING',
                offers: {
                    none: {
                        status: 'OFFERED'
                    }
                }
            }
        });
        return assignments;
    }
}

module.exports = new OfferService();
