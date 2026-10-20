'use strict';

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const PENALTY_CAUSES = {
  UNPACKED_ORDER_24H: {
    code: 'UNPACKED_ORDER_24H',
    name: 'Order Unpacked for >24 Hours',
    points: 10,
    cureDescription: 'Pack the pending order immediately to cure this penalty.'
  },
  UNSHIPPED_ORDER_24H: {
    code: 'UNSHIPPED_ORDER_24H',
    name: 'Order Packed but Unshipped for >24 Hours',
    points: 5,
    cureDescription: 'Hand over the packed parcel to courier partner and confirm tracking.'
  },
  HIGH_DISPUTE_RATE: {
    code: 'HIGH_DISPUTE_RATE',
    name: 'Dispute Rate Exceeded 100% Threshold',
    points: 20,
    cureDescription: 'Resolve open buyer disputes amicably to drop your dispute rate.'
  },
  SELLER_CANCELLATION_SURGE: {
    code: 'SELLER_CANCELLATION_SURGE',
    name: 'Seller Cancelled Paid/Confirmed Orders',
    points: 15,
    cureDescription: 'Avoid unforced cancellations and fulfill incoming paid orders promptly.'
  },
  LATE_DELIVERY_BREACH: {
    code: 'LATE_DELIVERY_BREACH',
    name: 'Carrier Transit Timeline Breach',
    points: 10,
    cureDescription: 'Ensure packages are dispatched promptly within designated fulfillment windows.'
  }
};

class SellerBanningService {
  /**
   * Helper: Parse stored penalty incidents from store.alertMessage
   */
  _parseIncidents(alertMessage) {
    if (!alertMessage) return [];
    try {
      const parsed = JSON.parse(alertMessage);
      return Array.isArray(parsed?.incidents) ? parsed.incidents : [];
    } catch {
      return [];
    }
  }

  /**
   * Helper: Serialize stored penalty incidents into store.alertMessage
   */
  _serializeIncidents(existingAlertMessage, incidents) {
    let base = {};
    try {
      base = JSON.parse(existingAlertMessage || '{}');
    } catch {
      base = {};
    }
    base.incidents = incidents;
    base.lastUpdated = new Date().toISOString();
    return JSON.stringify(base);
  }

  /**
   * Determine risk tier based on banning rate
   */
  getRiskTier(banningRate) {
    const rate = Number(banningRate) || 0;
    if (rate >= 100) return 'SUSPENDED';
    if (rate >= 75) return 'CRITICAL';
    if (rate >= 50) return 'WARNING';
    if (rate >= 25) return 'CAUTION';
    return 'SAFE';
  }

  /**
   * Apply a penalty incident and alert seller
   */
  async applyPenalty({ storeId, sellerId, causeCode, orderId = null, orderNumber = null, customPoints = null, reason = null }) {
    try {
      const store = storeId
        ? await prisma.store.findUnique({ where: { id: storeId }, include: { user: true } })
        : await prisma.store.findUnique({ where: { sellerId }, include: { user: true } });

      if (!store) {
        logger.warn(`[SELLER BANNING] Cannot apply penalty: Store not found for storeId=${storeId}, sellerId=${sellerId}`);
        return null;
      }

      const cause = PENALTY_CAUSES[causeCode] || {
        code: causeCode || 'GENERAL_COMPLIANCE_VIOLATION',
        name: reason || 'Compliance Guideline Violation',
        points: customPoints || 10,
        cureDescription: 'Review seller standards and resolve outstanding customer issues.'
      };

      const points = customPoints !== null ? customPoints : cause.points;
      const currentRate = store.banningRate || 0;
      const newRate = Math.min(100, Math.max(0, currentRate + points));
      const previousTier = this.getRiskTier(currentRate);
      const newTier = this.getRiskTier(newRate);

      const incidents = this._parseIncidents(store.alertMessage);
      const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newIncident = {
        id: incidentId,
        causeCode: cause.code,
        causeName: cause.name,
        points,
        orderId,
        orderNumber: orderNumber || (orderId ? orderId.slice(0, 8) : null),
        appliedAt: new Date().toISOString(),
        status: 'ACTIVE',
        reason: reason || cause.name,
        cureInstructions: cause.cureDescription
      };

      incidents.unshift(newIncident);
      // Keep up to 25 latest incidents
      const trimmedIncidents = incidents.slice(0, 25);
      const serializedMessage = this._serializeIncidents(store.alertMessage, trimmedIncidents);

      const updateData = {
        banningRate: newRate,
        alertMessage: serializedMessage,
        hasPendingAlerts: newRate > 0,
        lastAlertAt: new Date()
      };

      if (newRate >= 100) {
        updateData.approvalStatus = 'SUSPENDED';
        updateData.rejectionReason = `Store automatically suspended due to Banning Rate reaching 100% (Latest incident: ${cause.name}).`;
      }

      await prisma.store.update({
        where: { id: store.id },
        data: updateData
      });

      logger.info(`[SELLER BANNING] Applied ${cause.code} (+${points}%) to store ${store.storeName} (${store.id}). Rate: ${currentRate}% -> ${newRate}%`);

      // 1. Proactive Notification: Penalty Cause Alert
      await prisma.notification.create({
        data: {
          userId: store.sellerId,
          title: `🚨 Banning Rate Alert: +${points}% (${cause.name})`,
          body: `Your store received a +${points}% penalty${orderNumber ? ` for Order #${orderNumber}` : ''}. Your Banning Rate is now ${newRate}%. Cure: ${cause.cureDescription}`,
          type: 'ALERT',
          linkUrl: '/seller-dashboard.html?tab=analytics'
        }
      }).catch(err => logger.error(`[SELLER BANNING] Notification error: ${err.message}`));

      // 2. High-Severity Zone Warnings
      if (newTier === 'SUSPENDED' && previousTier !== 'SUSPENDED') {
        await prisma.notification.create({
          data: {
            userId: store.sellerId,
            title: '⛔ Store Suspended: Banning Rate 100%',
            body: `Your store has reached 100% banning rate and is currently suspended from customer purchases. Submit an appeal or cure open orders to restore access.`,
            type: 'ALERT',
            linkUrl: '/seller-dashboard.html?tab=disputes'
          }
        }).catch(() => {});
      } else if (newTier === 'CRITICAL' && previousTier !== 'CRITICAL') {
        await prisma.notification.create({
          data: {
            userId: store.sellerId,
            title: `⚠️ Critical Banning Risk: ${newRate}%`,
            body: `Your store is at critical risk of automatic suspension (reaching ${newRate}%). Please pack and ship all pending orders immediately.`,
            type: 'ALERT',
            linkUrl: '/seller-dashboard.html?tab=analytics'
          }
        }).catch(() => {});
      }

      return {
        success: true,
        incident: newIncident,
        previousRate: currentRate,
        newRate,
        riskTier: newTier,
        isSuspended: newRate >= 100
      };
    } catch (err) {
      logger.error(`[SELLER BANNING] applyPenalty error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Cure an eligible penalty (e.g., seller packed an overdue order)
   */
  async curePenalty({ sellerId, incidentId, orderId }) {
    try {
      const store = await prisma.store.findUnique({
        where: { sellerId },
        include: { user: true }
      });
      if (!store) throw new Error('Seller store not found');

      const incidents = this._parseIncidents(store.alertMessage);
      const targetIndex = incidents.findIndex(inc =>
        (incidentId && inc.id === incidentId) ||
        (orderId && inc.orderId === orderId && inc.status === 'ACTIVE')
      );

      if (targetIndex === -1) {
        throw new Error('Active penalty incident not found for this order/ID.');
      }

      const target = incidents[targetIndex];
      if (target.status !== 'ACTIVE') {
        throw new Error('This penalty incident has already been cured or resolved.');
      }

      // Verify the order has actually been cured (packed or shipped)
      if (target.orderId) {
        const order = await prisma.order.findUnique({ where: { id: target.orderId } });
        if (order) {
          if (target.causeCode === 'UNPACKED_ORDER_24H' && order.status === 'PAID') {
            throw new Error(`Order #${order.id.slice(0, 8)} is still in PAID status. Please click "Pack Order" first.`);
          }
          if (target.causeCode === 'UNSHIPPED_ORDER_24H' && ['PAID', 'PACKED'].includes(order.status)) {
            throw new Error(`Order #${order.id.slice(0, 8)} is not shipped yet. Please confirm courier handover first.`);
          }
        }
      }

      target.status = 'CURED';
      target.curedAt = new Date().toISOString();

      const pointsDeducted = target.points || 5;
      const currentRate = store.banningRate || 0;
      const newRate = Math.max(0, currentRate - pointsDeducted);

      const updateData = {
        banningRate: newRate,
        alertMessage: this._serializeIncidents(store.alertMessage, incidents),
        hasPendingAlerts: newRate > 0
      };

      // If store was suspended for banning rate and is now < 100%, restore to APPROVED
      if (store.approvalStatus === 'SUSPENDED' && newRate < 100) {
        updateData.approvalStatus = 'APPROVED';
        updateData.rejectionReason = null;
      }

      await prisma.store.update({
        where: { id: store.id },
        data: updateData
      });

      // Send positive notification
      await prisma.notification.create({
        data: {
          userId: store.sellerId,
          title: `✅ Penalty Cured (-${pointsDeducted}%)`,
          body: `Great job! You resolved the issue for ${target.causeName}. Your banning rate is now reduced to ${newRate}%.`,
          type: 'INFO',
          linkUrl: '/seller-dashboard.html?tab=analytics'
        }
      }).catch(() => {});

      logger.info(`[SELLER BANNING] Cured incident ${target.id} (-${pointsDeducted}%) for store ${store.storeName}. Rate: ${currentRate}% -> ${newRate}%`);

      return {
        success: true,
        curedIncident: target,
        previousRate: currentRate,
        newRate,
        riskTier: this.getRiskTier(newRate)
      };
    } catch (err) {
      logger.error(`[SELLER BANNING] curePenalty error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get detailed banning status, cause breakdown, and recovery steps
   */
  async getBanningStatus(sellerId) {
    try {
      const store = await prisma.store.findUnique({
        where: { sellerId },
        include: { user: true }
      });

      if (!store) {
        return {
          banningRate: 0,
          riskTier: 'SAFE',
          incidents: [],
          disputeMetrics: { totalOrders: 0, totalDisputes: 0, disputeRate: 0 },
          cureActions: [],
          recoveryChecklist: []
        };
      }

      const banningRate = store.banningRate || 0;
      const riskTier = this.getRiskTier(banningRate);
      const incidents = this._parseIncidents(store.alertMessage);

      // Calculate dispute metrics
      const [totalOrders, totalDisputes] = await Promise.all([
        prisma.order.count({ where: { sellerId } }),
        prisma.dispute.count({ where: { sellerId } })
      ]);

      const disputeRate = totalOrders > 0 ? Math.round((totalDisputes / totalOrders) * 1000) / 10 : 0;

      // Extract actionable pending orders that triggered penalties
      const activeIncidents = incidents.filter(i => i.status === 'ACTIVE');
      const cureActions = activeIncidents.map(inc => ({
        incidentId: inc.id,
        causeCode: inc.causeCode,
        causeName: inc.causeName,
        orderId: inc.orderId,
        orderNumber: inc.orderNumber,
        points: inc.points,
        appliedAt: inc.appliedAt,
        actionPrompt: inc.cureInstructions
      }));

      // Recommendations to recover or keep rate at 0%
      const recoveryChecklist = [
        {
          id: 'pack_orders',
          title: 'Pack Orders Within 24 Hours',
          description: 'Orders left unpacked for >24 hours incur an automatic +10% penalty.',
          status: activeIncidents.some(i => i.causeCode === 'UNPACKED_ORDER_24H') ? 'ATTENTION_NEEDED' : 'HEALTHY'
        },
        {
          id: 'ship_orders',
          title: 'Handover to Courier Promptly',
          description: 'Packed orders unshipped for >24 hours incur a +5% penalty.',
          status: activeIncidents.some(i => i.causeCode === 'UNSHIPPED_ORDER_24H') ? 'ATTENTION_NEEDED' : 'HEALTHY'
        },
        {
          id: 'resolve_disputes',
          title: 'Maintain Dispute Rate Below 100%',
          description: 'A 100% dispute-to-order ratio adds an immediate +20% penalty.',
          status: disputeRate >= 80 ? 'ATTENTION_NEEDED' : 'HEALTHY'
        },
        {
          id: 'avoid_cancellations',
          title: 'Zero Seller-Initiated Cancellations',
          description: 'Cancelling paid customer orders triggers surge penalties (+15%).',
          status: 'HEALTHY'
        }
      ];

      return {
        storeId: store.id,
        storeName: store.storeName,
        approvalStatus: store.approvalStatus,
        banningRate,
        riskTier,
        isSuspended: store.approvalStatus === 'SUSPENDED' || banningRate >= 100,
        rejectionReason: store.rejectionReason,
        disputePenaltyAppliedAt: store.disputePenaltyAppliedAt,
        incidents,
        activeIncidentsCount: activeIncidents.length,
        cureActions,
        disputeMetrics: {
          totalOrders,
          totalDisputes,
          disputeRate,
          contributesToPenalty: disputeRate >= 100
        },
        recoveryChecklist
      };
    } catch (err) {
      logger.error(`[SELLER BANNING] getBanningStatus error: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new SellerBanningService();
