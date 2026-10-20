const prisma = require('../utils/prismaClient');

class WMapEngineService {
    /**
     * Resolves a text location into a structured NigeriaLocation entry
     * (Mocks geocoding for now)
     */
    async resolveLocation(textInput, type = 'City') {
        if (!textInput) return null;
        
        let loc = await prisma.nigeriaLocation.findFirst({
            where: { address: textInput, type: type }
        });

        if (!loc) {
            // In a real system, call Nominatim/Google Maps Geocoding API here
            // Mocking creation for prototype
            loc = await prisma.nigeriaLocation.create({
                data: {
                    address: textInput,
                    type: type,
                    lat: 6.5244 + (Math.random() * 2), // random lat near Lagos/Ibadan
                    lng: 3.3792 + (Math.random() * 2)  // random lng near Lagos/Ibadan
                }
            });
        }
        return loc;
    }

    /**
     * Builds a delivery route with intermediate waypoints
     * Mocks a routing engine output (e.g. OSRM)
     */
    async buildDeliveryRoute(assignmentId, pickupLocation, dropoffLocation) {
        if (!pickupLocation || !dropoffLocation) return [];

        // In a real system, we would calculate path and extract intermediate LGAs/Cities.
        // For the prototype, if it's Lagos to Ibadan, we mock the specific waypoints.
        let intermediateStops = [];
        
        if (pickupLocation.name.toLowerCase().includes('ibadan') && dropoffLocation.name.toLowerCase().includes('surulere')) {
             intermediateStops = ['Akinyele', 'Oyo', 'Owode', 'Dansaria', 'Daccamca'];
        } else {
             intermediateStops = ['Transit Hub A', 'Transit Hub B'];
        }

        // Delete old waypoints if rebuilding
        await prisma.deliveryStop.deleteMany({
            where: { assignmentId }
        });

        const waypoints = [];
        
        // 1. Pickup
        waypoints.push(await prisma.deliveryStop.create({
            data: {
                assignmentId,
                
                address: `Pickup: ${pickupLocation.name}`,
                lat: pickupLocation.lat,
                lng: pickupLocation.lng,
                sequence: 1,
                type: 'PICKUP',
                status: 'REACHED' // assuming courier is already there or on way
            }
        }));

        // 2. Intermediates
        for (let i = 0; i < intermediateStops.length; i++) {
            let stopName = intermediateStops[i];
            let stopLoc = await this.resolveLocation(stopName, 'Area');
            
            waypoints.push(await prisma.deliveryStop.create({
                data: {
                    assignmentId,
                    
                    address: stopName,
                    lat: stopLoc.lat,
                    lng: stopLoc.lng,
                    sequence: i + 2,
                    type: 'TRANSIT',
                    status: i < 2 ? 'REACHED' : 'PENDING' // Simulate progress
                }
            }));
        }

        // 3. Dropoff
        waypoints.push(await prisma.deliveryStop.create({
            data: {
                assignmentId,
                
                address: `Dropoff: ${dropoffLocation.name}`,
                lat: dropoffLocation.lat,
                lng: dropoffLocation.lng,
                sequence: intermediateStops.length + 2,
                type: 'DROPOFF',
                status: 'PENDING'
            }
        }));

        return waypoints;
    }

    /**
     * Updates courier's live location and logs history
     */
    async updateCourierLocation(courierId, lat, lng) {
        await prisma.courierLocationHistory.create({
            data: { courierId, lat, lng }
        });

        return await prisma.courierProfile.update({
            where: { id: courierId },
            data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() }
        });
    }
}

module.exports = new WMapEngineService();
