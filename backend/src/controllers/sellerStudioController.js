const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const socketService = require('../services/socketService');

/**
 * Geocode an address string to { lat, lng } using Nominatim (OSM).
 * Returns null if geocoding fails.
 */
async function geocodeAddress(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'GlobalX-Platform/1.0 (support@globalx.app)' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (err) {
        logger.warn(`Geocoding failed for "${address}": ${err.message}`);
    }
    return null;
}

exports.requestFreight = async (req, res) => {
    try {
        const { pickupLocation, dropoffAddress, deliveryFee, pickupTime, deliverRate, weight, volume, waypoints } = req.body;
        const sellerId = req.user.id;

        // Geocode both addresses concurrently (Nominatim OSM - free, no API key)
        const [pickupCoords, dropoffCoords] = await Promise.all([
            geocodeAddress(pickupLocation),
            geocodeAddress(dropoffAddress)
        ]);

        if (pickupCoords) {
            logger.info(`Geocoded pickup "${pickupLocation}" → lat:${pickupCoords.lat}, lng:${pickupCoords.lng}`);
        } else {
            logger.warn(`Could not geocode pickup: "${pickupLocation}"`);
        }
        if (dropoffCoords) {
            logger.info(`Geocoded dropoff "${dropoffAddress}" → lat:${dropoffCoords.lat}, lng:${dropoffCoords.lng}`);
        } else {
            logger.warn(`Could not geocode dropoff: "${dropoffAddress}"`);
        }

        // Create a dummy order for the freight request
        const order = await prisma.order.create({
            data: {
                buyerId: sellerId,
                sellerId: sellerId,
                totalAmount: Number(deliveryFee) || 0,
                shippingCost: Number(deliveryFee) || 0,
                taxAmount: 0,
                shippingAddress: dropoffAddress,
                status: 'PACKED',
                orderType: 'FREIGHT',
            }
        });

        // Parse custom waypoints if provided, otherwise generate default ones from pickup/dropoff
        let waypointData = [];
        if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
            waypointData = waypoints.map((wp, index) => ({
                address: wp.name || wp.address || (index === 0 ? pickupLocation : (index === waypoints.length - 1 ? dropoffAddress : `Stop ${index}`)),
                type: wp.type || (index === 0 ? 'PICKUP' : (index === waypoints.length - 1 ? 'DROPOFF' : 'TRANSIT')),
                lat: wp.lat,
                lng: wp.lng,
                sequence: index + 1
            }));
        } else {
            // Default waypoints using geocoded coords
            if (pickupCoords) {
                waypointData.push({ address: pickupLocation, type: 'PICKUP', lat: pickupCoords.lat, lng: pickupCoords.lng, sequence: 1 });
            }
            if (dropoffCoords) {
                waypointData.push({ address: dropoffAddress, type: 'DROPOFF', lat: dropoffCoords.lat, lng: dropoffCoords.lng, sequence: 2 });
            }
        }

        // Create the delivery assignment, storing resolved coordinates and waypoints
        const assignment = await prisma.deliveryAssignment.create({
            data: {
                orderId: order.id,
                status: 'PENDING',
                customerDeliveryFee: Number(deliveryFee) || 0,
                pickupLat:  pickupCoords?.lat  ?? null,
                pickupLng:  pickupCoords?.lng  ?? null,
                dropoffLat: dropoffCoords?.lat ?? null,
                dropoffLng: dropoffCoords?.lng ?? null,
                pricingSnapshot: JSON.stringify({
                    pickupLocation: pickupLocation,
                    pickupTime: pickupTime,
                    deliverRate: Number(deliverRate) || 0,
                    weight: weight,
                    volume: volume
                }),
                stops: {
                    create: waypointData
                }
            },
            include: { stops: true }
        });

        return res.status(200).json({
            success: true,
            message: 'Freight quote generated and added to queue',
            assignment,
            geocoded: {
                pickup: pickupCoords,
                dropoff: dropoffCoords
            }
        });
    } catch (error) {
        logger.error(`Error in requestFreight: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getFreightRequests = async (req, res) => {
    try {
        const sellerId = req.user.id;
        
        // Find orders created as FREIGHT by this seller
        const orders = await prisma.order.findMany({
            where: { sellerId, orderType: 'FREIGHT' },
            select: { id: true, totalAmount: true, shippingAddress: true, createdAt: true, status: true }
        });
        
        const orderIds = orders.map(o => o.id);
        
        // Find corresponding assignments and their offers
        const assignments = await prisma.deliveryAssignment.findMany({
            where: { orderId: { in: orderIds } },
            include: {
                stops: {
                    orderBy: { sequence: 'asc' }
                },
                offers: {
                    include: {
                        courier: {
                            include: { user: { select: { fullName: true } } }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        // Merge them for the frontend
        const merged = assignments.map(a => {
            const ord = orders.find(o => o.id === a.orderId);
            return { ...a, orderDetails: ord };
        });
        
        return res.status(200).json({ success: true, data: merged });
    } catch (error) {
        logger.error(`Error in getFreightRequests: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.acceptFreightOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const sellerId = req.user.id;
        
        const offer = await prisma.deliveryOffer.findUnique({
            where: { id: offerId },
            include: {
                assignment: {
                    include: { order: true }
                }
            }
        });
        
        if (!offer || offer.assignment.order.sellerId !== sellerId) {
            return res.status(404).json({ success: false, message: 'Offer not found or unauthorized' });
        }
        
        if (offer.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Offer is no longer pending' });
        }
        
        // 1. Update Offer
        await prisma.deliveryOffer.update({
            where: { id: offerId },
            data: { status: 'ACCEPTED' }
        });
        
        // 2. Update Assignment with new fee and courier
        await prisma.deliveryAssignment.update({
            where: { id: offer.assignment.id },
            data: {
                courierId: offer.courierId,
                status: 'COURIER_ACCEPTED',
                customerDeliveryFee: offer.proposedFee || offer.assignment.customerDeliveryFee
            }
        });
        
        // 3. Update Order status
        await prisma.order.update({
            where: { id: offer.assignment.orderId },
            data: { 
                status: 'SHIPPED',
                shippingCost: offer.proposedFee || offer.assignment.customerDeliveryFee
            }
        });
        
        // 4. Notify Courier via socket
        const io = socketService.getIO();
        if (io) {
            // we need the courier user ID. The courier profile has userId.
            const courierProfile = await prisma.courierProfile.findUnique({
                where: { id: offer.courierId },
                select: { userId: true }
            });
            if (courierProfile?.userId) {
                io.to(courierProfile.userId).emit('notification', {
                    title: 'Freight Offer Accepted!',
                    message: `Your counter-offer of $${offer.proposedFee} was accepted by the seller!`,
                    type: 'OFFER_ACCEPTED',
                    assignmentId: offer.assignment.id,
                    timestamp: new Date().toISOString()
                });
                
                // Add persistent notification
                await prisma.notification.create({
                    data: {
                        userId: courierProfile.userId,
                        title: 'Freight Offer Accepted!',
                        body: `Your counter-offer of ₦${offer.proposedFee} was accepted by the seller for order #${offer.assignment.orderId.substring(0,6)}!`,
                        type: 'OFFER_ACCEPTED',
                        isRead: false
                    }
                });
            }
        }
        
        return res.status(200).json({ success: true, message: 'Offer accepted successfully' });
    } catch (error) {
        logger.error(`Error in acceptFreightOffer: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.rejectFreightOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const sellerId = req.user.id;
        
        const offer = await prisma.deliveryOffer.findUnique({
            where: { id: offerId },
            include: { assignment: { include: { order: true } } }
        });
        
        if (!offer || offer.assignment.order.sellerId !== sellerId) {
            return res.status(404).json({ success: false, message: 'Offer not found or unauthorized' });
        }
        
        await prisma.deliveryOffer.update({
            where: { id: offerId },
            data: { status: 'REJECTED' }
        });
        
        // Notify Courier
        const io = socketService.getIO();
        if (io) {
            const courierProfile = await prisma.courierProfile.findUnique({
                where: { id: offer.courierId }, select: { userId: true }
            });
            if (courierProfile?.userId) {
                io.to(courierProfile.userId).emit('notification', {
                    title: 'Freight Offer Rejected',
                    message: `Your counter-offer for order #${offer.assignment.orderId.substring(0,6)} was declined.`,
                    type: 'OFFER_REJECTED',
                    timestamp: new Date().toISOString()
                });
                
                // Add persistent notification
                await prisma.notification.create({
                    data: {
                        userId: courierProfile.userId,
                        title: 'Freight Offer Rejected',
                        body: `Your counter-offer for order #${offer.assignment.orderId.substring(0,6)} was declined by the seller.`,
                        type: 'OFFER_REJECTED',
                        isRead: false
                    }
                });
            }
        }
        
        return res.status(200).json({ success: true, message: 'Offer rejected' });
    } catch (error) {
        logger.error(`Error in rejectFreightOffer: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.savePreferences = async (req, res) => {
    try {
        const { alerts, categories } = req.body;
        const sellerId = req.user.id;
        const store = await prisma.store.findFirst({ where: { sellerId } });
        if (store) {
            const currentSettings = (store.themeSettings && typeof store.themeSettings === 'object') ? store.themeSettings : {};
            await prisma.store.update({
                where: { id: store.id },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        requestPreferences: { alerts: Boolean(alerts), categories: Array.isArray(categories) ? categories : [] }
                    }
                }
            });
        }
        return res.status(200).json({ success: true, message: 'Preferences saved' });
    } catch (error) {
        logger.error(`Error in savePreferences: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.generateStore = async (req, res) => {
    try {
        const { theme, plan } = req.body;
        const sellerId = req.user.id;
        const store = await prisma.store.findFirst({ where: { sellerId } });
        if (store) {
            const currentSettings = (store.themeSettings && typeof store.themeSettings === 'object') ? store.themeSettings : {};
            await prisma.store.update({
                where: { id: store.id },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        selectedTheme: theme || currentSettings.selectedTheme || 'modern',
                        requestedPlan: plan || currentSettings.requestedPlan || 'PRO'
                    }
                }
            });
        }
        return res.status(200).json({ success: true, message: 'Store configuration updated successfully' });
    } catch (error) {
        logger.error(`Error in generateStore: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.withdrawFunds = async (req, res) => {
    try {
        const { amount, bank, pin } = req.body;
        const bcrypt = require('bcryptjs');

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid withdrawal amount is required' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.withdrawPin) {
            return res.status(403).json({ success: false, message: 'PIN_NOT_SET', details: 'Please set your withdrawal PIN first' });
        }
        const isValidPin = await bcrypt.compare(pin || '', user.withdrawPin);
        if (!isValidPin) {
            return res.status(401).json({ success: false, message: 'Invalid withdrawal PIN' });
        }
        if (Number(user.balance || 0) < numericAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { balance: { decrement: numericAmount } }
            }),
            prisma.payout.create({
                data: {
                    sellerId: user.id,
                    amount: numericAmount,
                    status: 'PENDING',
                    method: bank || 'BANK_TRANSFER'
                }
            })
        ]);

        return res.status(200).json({ success: true, message: 'Withdrawal processed' });
    } catch (error) {
        logger.error(`Error in withdrawFunds: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.exportOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { dateRange = 'All Time', format = 'CSV' } = req.body;
        const where = { sellerId };

        if (dateRange === 'Last 7 Days') {
            where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        } else if (dateRange === 'Last 30 Days') {
            where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        }

        const orders = await prisma.order.findMany({
            where,
            include: { buyer: { select: { fullName: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500
        });

        const header = 'Order ID,Date,Buyer,Email,Status,Total Amount';
        const rows = orders.map(o =>
            `"${o.id}","${o.createdAt.toISOString()}","${(o.buyer?.fullName || 'Guest').replace(/"/g, '""')}","${o.buyer?.email || ''}","${o.status}","${o.totalAmount || 0}"`
        );
        const csvContent = [header, ...rows].join('\n');

        return res.status(200).json({
            success: true,
            message: 'Export generated',
            format,
            count: orders.length,
            csvContent
        });
    } catch (error) {
        logger.error(`Error in exportOrders: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.importBuyers = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { buyers = [] } = req.body;
        const store = await prisma.store.findFirst({ where: { sellerId } });
        if (store && Array.isArray(buyers) && buyers.length > 0) {
            const currentSettings = (store.themeSettings && typeof store.themeSettings === 'object') ? store.themeSettings : {};
            const existingCrm = Array.isArray(currentSettings.importedBuyers) ? currentSettings.importedBuyers : [];
            await prisma.store.update({
                where: { id: store.id },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        importedBuyers: [...existingCrm, ...buyers.slice(0, 500)]
                    }
                }
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Buyers imported successfully',
            importedCount: Array.isArray(buyers) ? buyers.length : 0
        });
    } catch (error) {
        logger.error(`Error in importBuyers: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
