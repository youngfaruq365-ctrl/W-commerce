const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const msg = (err, fallback) => (err && err.message) ? err.message : fallback;

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
            store: { select: { storeName: true, country: true, user: { select: { phone: true } } } },
            buyer: { select: { fullName: true, phone: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = todaysAssignments.filter(a => a.status === 'DELIVERED' && new Date(a.updatedAt) >= today);
    const pending   = todaysAssignments.filter(a => a.status !== 'DELIVERED' && a.status !== 'CANCELLED' && a.status !== 'FAILED');

    const earningsToday = completed.reduce((sum, a) => sum + (a.customerDeliveryFee ?? 0) * 0.8, 0);

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
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        courierId: null,
        status: 'PENDING',
      },
      include: {
        order: {
          include: {
            items: { include: { product: { select: { title: true } } } },
            store: { select: { storeName: true, country: true, user: { select: { phone: true } } } },
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

// POST /api/v1/delivery/courier/accept/:orderId
exports.acceptDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const profile = await getCourierProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'Courier profile not found' });

    const assignment = await prisma.deliveryAssignment.findUnique({ where: { orderId } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    if (assignment.courierId && assignment.courierId !== profile.id) {
      return res.status(409).json({ success: false, message: 'Order already assigned to another courier' });
    }

    const updated = await prisma.deliveryAssignment.update({
      where: { orderId },
      data: { courierId: profile.id, status: 'COURIER_ACCEPTED' },
      include: {
        order: {
          include: {
            store: { select: { storeName: true, country: true, user: { select: { phone: true } } } },
            buyer: { select: { fullName: true, phone: true } },
            items: { include: { product: { select: { title: true } } } },
          }
        }
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'SHIPPED' },
    });

    res.json({ success: true, data: formatOrder(updated) });
  } catch (err) {
    logger.error(`acceptDelivery: ${msg(err, 'Unknown error')}`);
    res.status(500).json({ success: false, message: msg(err, 'Error accepting delivery') });
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

    const payout = (updated.customerDeliveryFee ?? 0) * 0.8;
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

    const deliveryEarnings = assignments.reduce((s, a) => s + Number(a.customerDeliveryFee ?? 0) * 0.8, 0);
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
