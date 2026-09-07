const dispatchScoringService = require('./dispatchScoringService');
const offerService = require('./offerService');
const logger = require('../../utils/logger');
// We need access to the socket server to emit the offer
// Assuming io is stored globally or passed in. We'll use a hack to get io, 
// or preferably use a messaging service/redis pubsub to decouple.
// For now, we'll assume a global getter or we will broadcast via a local event emitter.

// We will emit events that socketService will listen to.
const EventEmitter = require('events');
class DispatchEventEmitter extends EventEmitter {}
const dispatchEvents = new DispatchEventEmitter();

class DispatchService {
    
    /**
     * Attempts to find a courier and create an offer for a given assignment.
     */
    async dispatchAssignment(assignment) {
        try {
            logger.info(`Dispatching assignment ${assignment.id}`);
            
            // 1. Get pickup location from assignment.stops (we assume sequence 0 is pickup)
            const pickupStop = assignment.stops?.find(s => s.type === 'PICKUP');
            if (!pickupStop || !pickupStop.lat) {
                logger.error(`Cannot dispatch ${assignment.id} - missing pickup coordinates`);
                return false;
            }

            // 2. Score couriers
            const requirements = {
                pickupLat: pickupStop.lat,
                pickupLng: pickupStop.lng,
                requiredVehicleType: null, // Add if order has specific requirements
                capacityKg: null
            };
            
            const rankedCouriers = await dispatchScoringService.rankCouriers(requirements);
            if (rankedCouriers.length === 0) {
                logger.warn(`No eligible couriers found for assignment ${assignment.id}`);
                return false;
            }

            // 3. To avoid re-offering to couriers who just rejected/expired,
            // we should fetch recent offers for this assignment to exclude those couriers.
            const prisma = require('../../utils/prismaClient');
            
            const previousOffers = await prisma.deliveryOffer.findMany({
                where: { assignmentId: assignment.id },
                select: { courierId: true }
            });
            const excludedCourierIds = new Set(previousOffers.map(o => o.courierId));

            // 4. Find best courier not yet offered
            const bestCourier = rankedCouriers.find(c => !excludedCourierIds.has(c.courierId));

            if (!bestCourier) {
                logger.warn(`Exhausted all eligible couriers for assignment ${assignment.id}`);
                return false;
            }

            // 5. Create Offer
            const offer = await offerService.createOffer(
                assignment.id, 
                bestCourier.courierId, 
                bestCourier.score, 
                60 // 60 seconds
            );

            logger.info(`Created offer ${offer.id} for courier ${bestCourier.courierId}`);

            const courierProfile = await prisma.courierProfile.findUnique({
                where: { id: bestCourier.courierId },
                select: { userId: true }
            });

            // 6. Notify Courier via Socket.IO
            dispatchEvents.emit('delivery:offer', {
                userId: courierProfile ? courierProfile.userId : undefined,
                offer
            });

            return true;

        } catch (error) {
            logger.error(`Dispatch Engine Error: ${error.message}`);
            return false;
        }
    }
}

module.exports = {
    dispatchService: new DispatchService(),
    dispatchEvents
};
