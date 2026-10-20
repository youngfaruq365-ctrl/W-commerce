const prisma = require('../../utils/prismaClient');
const crypto = require('crypto');
const logger = require('../../utils/logger');
// We require notificationService here for emitting events
const { dispatchEvents } = require('./dispatchService'); // Optional, to reuse socket event emission

class EarningsService {
    /**
     * Configuration parameters for pricing.
     * In a full implementation, these could be loaded from the DB or env vars.
     */
    getPricingConfig() {
        return {
            baseFee: 500,
            perKm: 100,
            version: 'v1'
        };
    }

    /**
     * Calculates the delivery fee based on estimated distance.
     */
    calculateDeliveryFee(distanceKm) {
        const config = this.getPricingConfig();
        const base = config.baseFee;
        const distFee = Math.max(0, distanceKm) * config.perKm;
        const total = base + distFee;

        return {
            amount: total,
            snapshot: {
                baseFee: base,
                perKm: config.perKm,
                distanceKm: distanceKm,
                pricingVersion: config.version
            }
        };
    }

    /**
     * Generates a unique transaction reference for earnings.
     * e.g., WDE-20260815-8F42K
     */
    generateReference() {
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `WDE-${dateStr}-${randomStr}`;
    }

    /**
     * Processes a delivery completion within a single atomic transaction.
     * Updates assignment, order, creates earning, and adds tracking event.
     */
    async processDeliveryCompletion(assignmentId, courierId, metadata = {}) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch assignment and verify status
            const assignment = await tx.deliveryAssignment.findUnique({
                where: { id: assignmentId },
                include: { order: true, courier: true }
            });

            if (!assignment) throw new Error("Assignment not found");
            if (assignment.status === 'DELIVERED') throw new Error("Already marked as DELIVERED");
            if (assignment.courierId !== courierId) throw new Error("Unauthorized");

            // 2. Check for duplicate earning (Idempotency)
            const existingEarning = await tx.courierEarning.findUnique({
                where: { assignmentId }
            });

            if (existingEarning) {
                logger.warn(`Duplicate earning creation attempted for assignment ${assignmentId}`);
                return existingEarning; // Skip if already created
            }

            // 3. Calculate Fee & Snapshot (if not already locked at acceptance)
            // For Phase 6, we'll calculate it here if missing, but ideally it should be locked earlier.
            let deliveryFeeAmount = 500; // default fallback
            let pricingSnapshot = assignment.pricingSnapshot;

            if (pricingSnapshot) {
                try {
                    const snap = JSON.parse(pricingSnapshot);
                    deliveryFeeAmount = snap.baseFee + (snap.distanceKm * snap.perKm);
                } catch (e) {
                    logger.error("Failed to parse pricing snapshot");
                }
            } else {
                const distanceKm = assignment.estimatedDistance || 0;
                const calc = this.calculateDeliveryFee(distanceKm);
                deliveryFeeAmount = calc.amount;
                pricingSnapshot = JSON.stringify(calc.snapshot);
            }

            // 4. Update Assignment to DELIVERED
            const updatedAssignment = await tx.deliveryAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: 'DELIVERED',
                    customerDeliveryFee: deliveryFeeAmount,
                    pricingSnapshot: pricingSnapshot
                }
            });

            // 5. Update Order to DELIVERED
            await tx.order.update({
                where: { id: assignment.orderId },
                data: { status: 'DELIVERED' }
            });

            // 6. Create Courier Earning (Immutable)
            const earning = await tx.courierEarning.create({
                data: {
                    reference: this.generateReference(),
                    courierId: courierId,
                    assignmentId: assignmentId,
                    amount: deliveryFeeAmount,
                    type: 'DELIVERY_FEE',
                    status: 'CLEARED', // Automatically cleared for this phase
                    description: `Delivery for Order #${assignment.orderId.slice(-6)}`,
                    clearedAt: new Date()
                }
            });

            // 7. Increment Courier's User Balance
            if (assignment.courier && assignment.courier.userId) {
                await tx.user.update({
                    where: { id: assignment.courier.userId },
                    data: {
                        balance: { increment: deliveryFeeAmount }
                    }
                });
            }

            // 8. Insert Tracking Event
            await tx.deliveryTrackingEvent.create({
                data: {
                    assignmentId,
                    status: 'DELIVERED',
                    lat: metadata.lat,
                    lng: metadata.lng,
                    metadata: JSON.stringify({ note: "Atomic delivery completion" })
                }
            });

            return earning;
        });
    }

    /**
     * Gets a timezone-aware summary of a courier's earnings.
     * Uses 'Africa/Lagos' for 'today' boundaries.
     */
    async getEarningsSummary(courierId) {
        // Calculate date boundaries for Africa/Lagos
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Lagos',
            year: 'numeric', month: 'numeric', day: 'numeric'
        });
        const dateStr = formatter.format(now); // MM/DD/YYYY
        
        const todayStart = new Date(`${dateStr} 00:00:00 GMT+0100`);
        const todayEnd = new Date(`${dateStr} 23:59:59 GMT+0100`);
        
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday

        // Aggregate using Prisma
        const [todayAgg, weekAgg, pendingAgg, clearedAgg] = await Promise.all([
            prisma.courierEarning.aggregate({
                _sum: { amount: true },
                where: { courierId, createdAt: { gte: todayStart, lte: todayEnd } }
            }),
            prisma.courierEarning.aggregate({
                _sum: { amount: true },
                where: { courierId, createdAt: { gte: weekStart, lte: todayEnd } }
            }),
            prisma.courierEarning.aggregate({
                _sum: { amount: true },
                where: { courierId, status: 'PENDING' }
            }),
            prisma.courierEarning.aggregate({
                _sum: { amount: true },
                where: { courierId, status: 'CLEARED' }
            })
        ]);

        return {
            today: parseFloat(todayAgg._sum.amount || 0),
            thisWeek: parseFloat(weekAgg._sum.amount || 0),
            pending: parseFloat(pendingAgg._sum.amount || 0),
            cleared: parseFloat(clearedAgg._sum.amount || 0),
            balance: parseFloat(clearedAgg._sum.amount || 0) // Balance available for withdrawal
        };
    }

    /**
     * Gets paginated earnings history.
     */
    async getEarningsHistory(courierId, limit = 50, offset = 0) {
        const earnings = await prisma.courierEarning.findMany({
            where: { courierId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        // Manually fetch assignments for these earnings
        const assignmentIds = earnings.map(e => e.assignmentId).filter(Boolean);
        const assignments = await prisma.deliveryAssignment.findMany({
            where: { id: { in: assignmentIds } },
            include: { stops: true, order: true }
        });

        const assignmentMap = {};
        assignments.forEach(a => assignmentMap[a.id] = a);

        return earnings.map(e => ({
            ...e,
            assignment: e.assignmentId ? assignmentMap[e.assignmentId] : null
        }));
    }
}

module.exports = new EarningsService();
