const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
// In a real system, you'd use a dispatch service to assign the final-mile courier.
// const courierOfferSvc = require('../services/delivery/courierOfferService');

/**
 * Get all consolidated packages for the hub queue
 */
exports.getHubPackages = async (req, res) => {
    try {
        const packages = await prisma.consolidatedPackage.findMany({
            where: {
                status: {
                    not: 'DELIVERED',
                }
            },
            include: {
                buyer: {
                    select: {
                        id: true,
                        fullName: true,
                    }
                },
                orders: {
                    include: {
                        seller: {
                            include: {
                                store: {
                                    select: {
                                        storeName: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        // Format for frontend
        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            buyerName: pkg.buyer?.fullName || 'Unknown',
            status: pkg.status,
            subOrders: pkg.orders.map(order => ({
                id: order.id,
                seller: {
                    id: order.seller?.id,
                    storeName: order.seller?.store?.storeName || 'Unknown Store',
                },
                // If the seller's courier delivered it to the hub, it's 'DELIVERED' in the DB
                hubStatus: (['DELIVERED', 'COMPLETED', 'PACKED', 'SHIPPED'].includes(order.status)) ? 'ARRIVED' : 'IN_TRANSIT',
            }))
        }));

        res.json({ success: true, packages: formattedPackages });
    } catch (error) {
        logger.error(`[HubController] Error fetching packages: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Consolidate a package and dispatch it to the final courier
 */
exports.consolidatePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const pkg = await prisma.consolidatedPackage.findUnique({
            where: { id },
            include: { orders: true }
        });

        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        if (pkg.status === 'DISPATCHED') {
            return res.status(400).json({ success: false, message: 'Package already dispatched' });
        }

        // Verify all sub-orders have arrived
        const allArrived = pkg.orders.every(order => ['DELIVERED', 'COMPLETED', 'PACKED', 'SHIPPED'].includes(order.status));
        if (!allArrived) {
            return res.status(400).json({ success: false, message: 'Not all items have arrived at the hub yet.' });
        }

        // Update package status to DISPATCHED (simulate courier assignment)
        await prisma.consolidatedPackage.update({
            where: { id },
            data: {
                status: 'DISPATCHED',
            }
        });

        logger.info(`[HubController] Consolidated Package ${id} dispatched.`);
        
        // In a full implementation, you would:
        // 1. Create a DeliveryAssignment from Hub to Buyer's address
        // 2. dispatchToNextCourier(assignmentId)
        // 3. Mark sub-orders as 'IN_TRANSIT' (to buyer)
        
        // For Phase 6 scope, just mark it DISPATCHED.

        res.json({ success: true, message: 'Package consolidated and dispatched.' });
    } catch (error) {
        logger.error(`[HubController] Error consolidating package ${id}: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Join Universe Hub Waitlist
 */
exports.joinWaitlist = async (req, res) => {
    try {
        const { marketplace } = req.body;
        // Basic implementation: record the waitlist entry
        await prisma.notification.create({
            data: {
                userId: req.user ? req.user.id : 'unknown',
                title: 'Waitlist Joined',
                body: `You joined the waitlist for ${marketplace}`,
                type: 'SYSTEM'
            }
        });
        logger.info(`User ${req.user ? req.user.id : 'unknown'} joined waitlist for ${marketplace}`);
        res.json({ success: true, message: 'Successfully joined waitlist' });
    } catch (error) {
        logger.error(`[HubController] Error joining waitlist: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
