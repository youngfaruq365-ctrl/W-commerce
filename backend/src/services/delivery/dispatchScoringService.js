const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geoUtils = require('../../utils/geoUtils');

/**
 * Dispatch Scoring Service
 * Responsible for filtering out ineligible couriers and scoring eligible ones.
 */

const MAX_CONCURRENT_ASSIGNMENTS = 2;
const MAX_GPS_AGE_MS = 120 * 1000; // 120 seconds
const STALE_GPS_PENALTY_MS = 30 * 1000; // 30 seconds

class DispatchScoringService {
    /**
     * Filters eligible couriers and scores them for a specific delivery order.
     * @param {Object} deliveryRequirements - { pickupLat, pickupLng, requiredVehicleType, capacityKg }
     * @returns {Array} Sorted list of couriers by score (lowest score = best)
     */
    async rankCouriers(deliveryRequirements) {
        // 1. Get all ONLINE couriers with their active vehicles and active assignments
        const onlineCouriers = await prisma.courierProfile.findMany({
            where: {
                status: 'ONLINE',
                currentLat: { not: null },
                currentLng: { not: null }
            },
            include: {
                activeVehicle: true,
                assignments: {
                    where: {
                        status: {
                            in: ['ASSIGNED', 'COURIER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION']
                        }
                    }
                }
            }
        });

        const scoredCouriers = [];

        // 2. Filter & Score
        for (const courier of onlineCouriers) {
            // -- ELIGIBILITY FILTERS --
            
            // Check max concurrent assignments
            if (courier.assignments.length >= MAX_CONCURRENT_ASSIGNMENTS) {
                continue;
            }

            // Check vehicle compatibility
            if (deliveryRequirements.requiredVehicleType && 
                courier.activeVehicle?.type !== deliveryRequirements.requiredVehicleType) {
                continue;
            }

            // Check GPS freshness
            const now = Date.now();
            const gpsAge = now - new Date(courier.lastLocationAt).getTime();
            if (gpsAge > MAX_GPS_AGE_MS) {
                continue;
            }

            // Check Service Area / Distance cutoff (e.g. max 15km away)
            const distanceMeters = geoUtils.calculateDistanceMeters(
                courier.currentLat, courier.currentLng,
                deliveryRequirements.pickupLat, deliveryRequirements.pickupLng
            );
            if (distanceMeters > 15000) {
                continue;
            }

            // -- SCORING ENGINE --
            // We want the LOWEST score.
            let score = 0;

            // Distance Score: 45% weight (1 meter = 0.45 points)
            score += distanceMeters * 0.45;

            // Load Penalty: 20% weight (Each active assignment adds a massive penalty, equivalent to being 5km away)
            score += courier.assignments.length * 5000; 

            // Stale GPS Penalty
            if (gpsAge > STALE_GPS_PENALTY_MS) {
                // Penalize equivalent to being 2km further away
                score += 2000;
            }

            // Rating Bonus: Higher rating reduces score (equiv to being closer)
            // 5.0 rating = 500 point bonus, 4.0 rating = 0 bonus
            const ratingBonus = Math.max(0, (courier.rating - 4.0) * 500);
            score -= ratingBonus;

            scoredCouriers.push({
                courierId: courier.id,
                userId: courier.userId,
                score,
                distanceMeters,
                gpsAge
            });
        }

        // 3. Sort ascending by score (lowest is best)
        return scoredCouriers.sort((a, b) => a.score - b.score);
    }
}

module.exports = new DispatchScoringService();
