const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const socketService = require('../services/socketService');

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const msg = (err, fallback) => (process.env.NODE_ENV !== 'production' && err && err.message) ? err.message : fallback;

async function getCourierProfile(userId) {
  return await prisma.courierProfile.findUnique({
    where: { userId },
    include: { activeVehicle: true, user: true }
  });
}

function formatOrder(a) {
  return {
    orderId: a.orderId,
    storeName: a.order?.store?.storeName ?? '',
    storeAddress: a.order?.store?.country ?? '',
    storePhone: a.order?.store?.user?.phone ?? '',
    customerName: a.order?.buyer?.fullName ?? '',
    customerPhone: a.order?.buyer?.phone ?? '',
    customerAddress: a.order?.shippingAddress ?? '',
    itemsCount: a.order?.items?.length ?? 0,
    amount: a.order?.totalAmount ?? 0,
    deliveryFee: a.customerDeliveryFee ?? 0,
    payout: (a.customerDeliveryFee ?? 0) * 0.8,
    status: a.status,
    createdAt: a.createdAt,
    notes: '',
  };
}

// GET /api/v1/delivery/courier/dashboard
exports.getCourierDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await getCourierProfile(userId);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysAssignments = await prisma.deliveryAssignment.findMany({
      where: {
        courierId: profile.id,
        OR: [
          { status: { in: ['IN_TRANSIT', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'EN_ROUTE_TO_PICKUP', 'COURIER_ACCEPTED', 'ASSIGNED'] } },
          { status: 'DELIVERED', updatedAt: { gte: today } }
        ]
      },
      include: {
        order: {
          include: {
            items: { include: { product: { select: { title: true, images: true } } } },
            buyer: { select: { fullName: true, phone: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = todaysAssignments.filter(a => a.status === 'DELIVERED' && new Date(a.updatedAt) >= today);
    const pending   = todaysAssignments.filter(a => a.status !== 'DELIVERED' && a.status !== 'CANCELLED' && a.status !== 'FAILED');

    const todayEarningsRecord = await prisma.courierEarning.aggregate({
      where: {
        courierId: profile.id,
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });
    const earningsToday = todayEarningsRecord._sum.amount || 0;

    res.json({
      success: true,
      data: {
        courier: {
          fullName: profile.user?.fullName,
          avatarUrl: profile.user?.avatarUrl,
          courierRating: profile.rating,
          courierVehicle: profile.activeVehicle?.make ?? profile.activeVehicle?.type,
          courierPlate: profile.activeVehicle?.plateNumber,
        },
        earningsToday,
        deliveriesCompleted: completed.length,
        pending: pending.map(formatOrder),
        status: pending.length > 0 ? 'busy' : profile.status.toLowerCase(),
      },
    });
  } catch (err) {
    logger.error(`getCourierDashboard: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching dashboard') });
  }
};

// GET /api/v1/delivery/courier/queue
exports.getDeliveryQueue = async (req, res) => {
  try {
    const profile = await getCourierProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

    // Enforce 1 delivery per week limit for free tier
    if (req.user.subscriptionTier !== 'COURIER_PRO') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      
      const recentDeliveriesCount = await prisma.deliveryAssignment.count({
        where: {
          courierId: profile.id,
          updatedAt: { gte: startOfWeek }
        }
      });
      
      if (recentDeliveriesCount >= 1) {
        return res.json({ success: true, data: [], limitReached: true });
      }
    }

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        courierId: null,
        status: 'PENDING',
      },
      include: {
        stops: {
          orderBy: { sequence: 'asc' }
        },
        order: {
          include: {
            items: { include: { product: { select: { title: true } } } },
            buyer: { select: { fullName: true, phone: true } },
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    res.json({ success: true, data: assignments });
  } catch (err) {
    logger.error(`getDeliveryQueue: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching queue') });
  }
};


// POST /api/v1/delivery/:id/accept
exports.acceptDelivery = async (req, res) => {
  try {
    const { id } = req.params; // assignment id
    const profile = await getCourierProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

    const assignment = await prisma.deliveryAssignment.findUnique({ where: { id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    if (assignment.courierId && assignment.courierId !== profile.id) {
      return res.status(409).json({ success: false, message: 'Order already assigned to another courier' });
    }
    if (assignment.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Assignment is already ${assignment.status}` });
    }

    // Enforce 1 delivery per week limit for free tier
    if (req.user.subscriptionTier !== 'COURIER_PRO') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      
      const recentDeliveriesCount = await prisma.deliveryAssignment.count({
        where: {
          courierId: profile.id,
          updatedAt: { gte: startOfWeek }
        }
      });
      
      if (recentDeliveriesCount >= 1) {
        return res.status(403).json({ success: false, message: 'Weekly limit reached. Upgrade to Courier Pro to accept more deliveries.' });
      }
    }

    const updated = await prisma.deliveryAssignment.update({
      where: { id },
      data: { courierId: profile.id, status: 'COURIER_ACCEPTED' },
      include: {
        order: {
          include: {
            buyer: { select: { fullName: true, phone: true } },
            items: { include: { product: { select: { title: true } } } },
          }
        }
      },
    });

    await prisma.order.update({
      where: { id: updated.orderId },
      data: { status: 'SHIPPED' },
    });

    // Create courier earning upon acceptance
    try {
        const snap = updated.pricingSnapshot
            ? (() => { try { return JSON.parse(updated.pricingSnapshot); } catch { return {}; } })()
            : {};
        let deliveryFeeAmount = Number(snap.baseFee || 0) + (Number(snap.distanceKm || 0) * Number(snap.perKm || 0));
        if (isNaN(deliveryFeeAmount) || deliveryFeeAmount === 0) {
            deliveryFeeAmount = Number(snap.amount || updated.customerDeliveryFee || 500);
        }
        // Fallback: use baseFee from pricing config if still 0
        if (!deliveryFeeAmount || deliveryFeeAmount <= 0) {
            deliveryFeeAmount = 500;
        }

        // Idempotency: skip if earning already exists for this assignment
        const existingEarning = await prisma.courierEarning.findUnique({
            where: { assignmentId: updated.id }
        });

        if (!existingEarning) {
            const earningsService = require('../services/delivery/earningsService');
            const reference = (typeof earningsService.generateReference === 'function')
                ? earningsService.generateReference()
                : require('crypto').randomUUID();

            await prisma.courierEarning.create({
                data: {
                    reference,
                    courierId: profile.id,
                    assignmentId: updated.id,
                    type: 'DELIVERY_FEE',
                    amount: deliveryFeeAmount,
                    currency: 'NGN',
                    status: 'CLEARED',
                    clearedAt: new Date(),
                    description: `Delivery for Order #${(updated.orderId || 'UNKNOWN').slice(-6)}`
                }
            });

            await prisma.user.update({
                where: { id: req.user.id },
                data: { balance: { increment: deliveryFeeAmount } }
            });
            logger.info(`acceptDelivery: Earning ₦${deliveryFeeAmount} created for assignment ${updated.id}`);
        } else {
            logger.warn(`acceptDelivery: Earning already exists for assignment ${updated.id}, skipping.`);
        }
    } catch (e) {
        logger.error(`acceptDelivery: Earning creation failed: ${e.message}`);
    }

    // Notify the seller in real-time via Socket.IO
    if (updated.order?.sellerId) {
      const io = socketService.getIO();
      if (io) {
        io.to(updated.order.sellerId).emit('notification', {
          title: 'Delivery Accepted',
          message: `A courier has accepted your delivery request for order #${updated.orderId.substring(0, 6)}`,
          type: 'DELIVERY_ACCEPTED',
          orderId: updated.orderId,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ success: true, data: formatOrder(updated) });
  } catch (err) {
    logger.error(`acceptDelivery: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error accepting delivery') });
  }
};

// POST /api/v1/delivery/:id/negotiate
exports.negotiateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposedFee, notes } = req.body;
    const userId = req.user.id;

    if (!proposedFee) {
      return res.status(400).json({ success: false, message: 'Proposed fee is required' });
    }

    const profile = await getCourierProfile(userId);
    if (!profile) {
      return res.status(403).json({ success: false, message: 'Only registered couriers can negotiate.' });
    }

    // Is it available?
    const assignment = await prisma.deliveryAssignment.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, sellerId: true } }
      }
    });

    if (!assignment || assignment.status !== 'PENDING' || assignment.courierId) {
      return res.status(400).json({ success: false, message: 'This delivery is no longer available.' });
    }

    // Create the offer
    const offer = await prisma.deliveryOffer.create({
      data: {
        assignmentId: assignment.id,
        courierId: profile.id,
        status: 'PENDING',
        isCounterOffer: true,
        proposedFee: Number(proposedFee),
        notes: notes || null
      }
    });

    // Notify seller
    if (assignment.order?.sellerId) {
      const io = socketService.getIO();
      if (io) {
        io.to(assignment.order.sellerId).emit('notification', {
          title: 'Freight Counter Offer',
          message: `A courier has proposed a new fee of $${proposedFee} for order #${assignment.order.id.substring(0, 6)}`,
          type: 'FREIGHT_COUNTER_OFFER',
          orderId: assignment.order.id,
          timestamp: new Date().toISOString()
        });
        
        io.to(assignment.order.sellerId).emit('freight_counter_offer', {
          offerId: offer.id,
          assignmentId: assignment.id,
          proposedFee
        });
      }
    }

    res.json({ success: true, message: 'Counter offer submitted successfully', data: offer });
  } catch (err) {
    logger.error(`negotiateDelivery: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error submitting counter offer') });
  }
};

// POST /api/v1/delivery/courier/complete/:orderId
exports.completeDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const profile = await getCourierProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

    const assignment = await prisma.deliveryAssignment.findUnique({ where: { orderId } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    if (assignment.courierId !== profile.id) {
      return res.status(403).json({ success: false, message: 'Not your delivery' });
    }

    const updated = await prisma.deliveryAssignment.update({
      where: { orderId },
      data: { status: 'DELIVERED' },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    const payout = updated.customerDeliveryFee ?? 0;

    // payout handled in acceptDelivery

    res.json({ success: true, data: { orderId, payout, status: 'DELIVERED' } });
  } catch (err) {
    logger.error(`completeDelivery: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error completing delivery') });
  }
};

// GET /api/v1/delivery/courier/earnings?period=today|week|month
exports.getCourierEarnings = async (req, res) => {
  try {
    const profile = await getCourierProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });
    const period = req.query.period || 'week';

    const now = new Date();
    let from;
    if (period === 'today') {
      from = new Date(now); from.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      from = new Date(now); from.setDate(now.getDate() - 7);
    } else {
      from = new Date(now); from.setDate(now.getDate() - 30);
    }

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        courierId: profile.id,
        status: 'DELIVERED',
        updatedAt: { gte: from },
      },
      select: { customerDeliveryFee: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    const deliveryEarnings = assignments.reduce((s, a) => s + (Number(a.customerDeliveryFee ?? 0) * 0.8), 0);
    const totalDeliveries  = assignments.length;

    const dailyMap = {};
    assignments.forEach(a => {
      const day = a.updatedAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(a.customerDeliveryFee ?? 0) * 0.8;
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });

    res.json({
      success: true,
      data: {
        availableBalance: wallet?.gongAvailable ?? 0,
        deliveryEarnings,
        tips: 0,
        bonuses: 0,
        total: deliveryEarnings,
        totalDeliveries,
        dailyBreakdown: dailyMap,
        period,
      },
    });
  } catch (err) {
    logger.error(`getCourierEarnings: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching earnings') });
  }
};

// POST /api/v1/delivery/courier/status
exports.updateCourierStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    await prisma.courierProfile.update({
      where: { userId: req.user.id },
      data: { status: isOnline ? 'ONLINE' : 'OFFLINE' },
    });
    res.json({ success: true, data: { isOnline: isOnline ?? false } });
  } catch (err) {
    logger.error(`updateCourierStatus: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error updating status') });
  }
};

// GET /api/v1/delivery/dispatch/drivers
exports.getActiveDrivers = async (req, res) => {
  try {
    const drivers = await prisma.courierProfile.findMany({
      where: { status: 'ONLINE' },
      select: {
        id: true, rating: true, status: true,
        user: { select: { fullName: true, avatarUrl: true } },
        activeVehicle: { select: { type: true, plateNumber: true, make: true } },
        assignments: { where: { status: 'IN_TRANSIT' }, select: { id: true } },
      },
    });
    res.json({ success: true, data: drivers.map((d) => ({
      id: d.id, name: d.user?.fullName, avatarUrl: d.user?.avatarUrl,
      vehicle: d.activeVehicle?.make ?? d.activeVehicle?.type, rating: d.rating,
      status: 'active', activeOrders: d.assignments?.length ?? 0,
    })) });
  } catch (err) {
    logger.error(`getActiveDrivers: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching drivers') });
  }
};

// POST /api/v1/delivery/dispatch/assign  { orderId, courierId }
exports.assignOrder = async (req, res) => {
  try {
    const { orderId, courierId } = req.body;
    if (!orderId || !courierId) return res.status(400).json({ success: false, message: 'orderId and courierId required' });
    const assignment = await prisma.deliveryAssignment.findUnique({ where: { orderId } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    
    const updated = await prisma.deliveryAssignment.update({ 
      where: { orderId }, 
      data: { courierId, status: 'ASSIGNED' } 
    });
    await prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } });
    res.json({ success: true, data: { orderId: updated.orderId, courierId, status: updated.status } });
  } catch (err) {
    logger.error(`assignOrder: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error assigning order') });
  }
};

// GET /api/v1/delivery/fleet/analytics
exports.getFleetAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [totalDeliveries, revAgg, activeFleet, recentAssignments] = await Promise.all([
      prisma.deliveryAssignment.count({ where: { status: 'DELIVERED', updatedAt: { gte: thirtyDaysAgo } } }),
      prisma.deliveryAssignment.aggregate({ _sum: { customerDeliveryFee: true }, where: { status: 'DELIVERED', updatedAt: { gte: thirtyDaysAgo } } }),
      prisma.courierProfile.count({ where: { status: 'ONLINE' } }),
      prisma.deliveryAssignment.findMany({ where: { status: 'DELIVERED', updatedAt: { gte: thirtyDaysAgo } }, select: { updatedAt: true }, orderBy: { updatedAt: 'asc' } }),
    ]);
    const trendMap = {};
    recentAssignments.forEach((a) => { const d = a.updatedAt.toISOString().slice(0,10); trendMap[d] = (trendMap[d]||0)+1; });
    res.json({ success: true, data: { totalDeliveries, revenueGenerated: revAgg._sum.customerDeliveryFee ?? 0, activeFleet, dailyTrend: trendMap } });
  } catch (err) {
    logger.error(`getFleetAnalytics: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching fleet analytics') });
  }
};

// GET /api/v1/delivery/fleet/drivers
exports.getDriverRoster = async (req, res) => {
  try {
    const drivers = await prisma.courierProfile.findMany({
      select: {
        id: true, status: true, rating: true, totalDeliveries: true, createdAt: true,
        user: { select: { fullName: true, avatarUrl: true } },
        activeVehicle: { select: { type: true, plateNumber: true, make: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: drivers.map((d) => ({
      id: d.id, name: d.user?.fullName, avatarUrl: d.user?.avatarUrl,
      vehicle: d.activeVehicle?.make ?? d.activeVehicle?.type ?? '', plate: d.activeVehicle?.plateNumber ?? '',
      rating: d.rating ?? 0,
      status: d.status.toLowerCase(),
      totalDeliveries: d.totalDeliveries,
    })) });
  } catch (err) {
    logger.error(`getDriverRoster: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error fetching roster') });
  }
};

// POST /api/v1/delivery/:id/rate-courier
exports.rateCourier = async (req, res) => {
  try {
    const { id } = req.params; // assignment id
    const { rating, comment } = req.body;
    const sellerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        OR: [
          { id: id },
          { orderId: id }
        ]
      },
      include: {
        order: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    }

    if (assignment.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Can only rate completed deliveries' });
    }

    if (assignment.order?.sellerId !== sellerId) {
      return res.status(403).json({ success: false, message: 'Only the seller of this order can rate the courier' });
    }

    if (!assignment.courierId) {
       return res.status(400).json({ success: false, message: 'No courier assigned' });
    }

    // Check if already rated
    const existingReview = await prisma.courierReview.findUnique({
      where: { assignmentId: assignment.id }
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Courier already rated for this delivery' });
    }

    const review = await prisma.courierReview.create({
      data: {
        courierId: assignment.courierId,
        sellerId,
        assignmentId: assignment.id,
        rating,
        comment
      }
    });

    // Update Courier Average Rating
    const allReviews = await prisma.courierReview.findMany({
      where: { courierId: assignment.courierId },
      select: { rating: true }
    });

    if (allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await prisma.courierProfile.update({
        where: { id: assignment.courierId },
        data: { rating: avg }
      });
    }

    res.json({ success: true, message: 'Courier rated successfully', data: review });
  } catch (err) {
    logger.error(`rateCourier: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error rating courier') });
  }
};

// POST /api/v1/delivery/:id/report-incident
exports.reportDeliveryIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, photoUrl, blocksDelivery } = req.body;
    
    // Create the incident report
    const incident = await prisma.deliveryIncident.create({
      data: {
        assignmentId: id,
        type: type || 'OTHER',
        description,
        photoUrl
      }
    });

    if (blocksDelivery) {
      // If courier opted to block the delivery, update status
      const { updateDeliveryStatus } = require('../services/delivery/deliveryService.js');
      await updateDeliveryStatus(id, 'BLOCKED_TRANSIT', {
        courierId: req.user.id,
        reason: type + ' - ' + description
      });
    }

    // Notify admins (assuming admin role or a global admin room)
    const socketService = require('../services/socketService.js');
    const io = socketService.getIO();
    if (io) {
      // Emit to a specific admin channel or generic admin room if configured
      io.emit('admin_notification', {
        title: 'Delivery Incident Reported',
        message: `Courier reported ${type} on assignment ${id}`,
        type: 'DELIVERY_INCIDENT',
        incidentId: incident.id,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, data: incident });
  } catch (err) {
    logger.error(`reportDeliveryIncident: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error reporting incident') });
  }
};
