 const prisma = require('../utils/prismaClient');
 const logger = require('../utils/logger');

 const CARRIER_API_KEY = process.env.TRACKING_API_KEY;
 const CARRIER_PROVIDER = process.env.TRACKING_PROVIDER || 'EASYPOST';

 class TrackingService {

     /**
      * Calculate and set estimated delivery date based on order status and shipping info
      * Called when order transitions to SHIPPED or IN_TRANSIT
      */
     async setEstimatedDeliveryDate(orderId) {
         try {
             const order = await prisma.order.findUnique({
                 where: { id: orderId },
                 include: {
                     items: {
                         include: {
                             product: true
                         }
                     }
                 }
             });

             if (!order) return;

             // Use the max estimatedDeliveryDays from all items (most conservative)
             let maxDays = 5; // default
             if (order.items && order.items.length > 0) {
                 maxDays = Math.max(...order.items.map(item => item.product.estimatedDeliveryDays || 5));
             }

             // If already has estimated date and not past, keep it
             if (order.estimatedDeliveryDate && order.estimatedDeliveryDate > new Date()) {
                 return;
             }

             const estimatedDate = new Date();
             estimatedDate.setDate(estimatedDate.getDate() + maxDays);

             await prisma.order.update({
                 where: { id: orderId },
                 data: { estimatedDeliveryDate: estimatedDate }
             });

             logger.info(`[TRACKING] Set estimated delivery for order ${orderId}: ${estimatedDate.toISOString()}`);

         } catch (error) {
             logger.error(`[TRACKING] Failed to set ETA for ${orderId}: ${error.message}`);
         }
     }

     /**
      * Detect delivery delays and flag orders
      * compares estimated delivery vs today, and tracking event recency
      */
     async detectDelays() {
         try {
             const now = new Date();
             const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

             // Find orders that are in transit/out for delivery but have no recent tracking events
             const orders = await prisma.order.findMany({
                 where: {
                     status: { in: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
                     estimatedDeliveryDate: { lt: now }, // past ETA
                     isDeliveryDelayed: false
                 },
                 include: {
                     trackingEvents: {
                         orderBy: { createdAt: 'desc' },
                         take: 1
                     },
                     buyer: true,
                     items: {
                         include: { product: true }
                     }
                 }
             });

             for (const order of orders) {
                 const lastEvent = order.trackingEvents[0];
                 const lastUpdate = lastEvent ? new Date(lastEvent.createdAt) : new Date(order.updatedAt);
                 const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

                 // If no update in last 48 hours, consider delayed
                 if (hoursSinceUpdate > 48) {
                     await prisma.order.update({
                         where: { id: order.id },
                         data: {
                             isDeliveryDelayed: true,
                             delayReason: 'No tracking update for 48+ hours'
                         }
                     });

                     // Notify buyer
                     await prisma.notification.create({
                         data: {
                             userId: order.buyerId,
                             title: '⚠️ Delivery Delay Detected',
                             body: `Order #${order.id.slice(0,8)} is experiencing a delay. We are monitoring it.`,
                             type: 'ALERT',
                             linkUrl: `/order-tracking.html?id=${order.id}`
                         }
                     });

                     logger.info(`[TRACKING] Order ${order.id} flagged as delayed`);
                 }
             }
         } catch (error) {
             logger.error(`[TRACKING] Delay detection error: ${error.message}`);
         }
     }

     /**
      * Get trust timeline for an order (combined events)
      */
     async getTrustTimeline(orderId) {
         try {
             const order = await prisma.order.findUnique({
                 where: { id: orderId },
                 include: {
                     items: { include: { product: { include: { store: true } } } },
                     trackingEvents: { orderBy: { createdAt: 'asc' } },
                     paymentProof: true,
                     dispute: true
                 }
             });

             if (!order) return null;

             const timeline = [];

             // Order placed
             timeline.push({
                 date: order.createdAt,
                 status: 'ORDER_PLACED',
                 title: 'Order Placed',
                 description: `You placed an order for ${order.items.length} item(s)`,
                 icon: 'shopping_bag'
             });

             // Payment confirmed (if payment proof exists or payment status HELD/RELEASED)
             if (order.paymentStatus !== 'PENDING') {
                 timeline.push({
                     date: order.paymentProof?.verifiedAt || order.createdAt,
                     status: 'PAYMENT_CONFIRMED',
                     title: 'Payment Confirmed',
                     description: 'Payment verified and escrow initiated',
                     icon: 'payment'
                 });
             }

             // Packed (when packedAt set)
             if (order.packedAt) {
                 timeline.push({
                     date: order.packedAt,
                     status: 'PACKED',
                     title: 'Seller Packed Item',
                     description: 'Your order has been packed and is ready for shipment',
                     icon: 'box'
                 });
             }

             // Shipped
             if (order.status === 'SHIPPED' || order.shippingAddress) {
                 timeline.push({
                     date: order.readyToShipAt || order.createdAt,
                     status: 'SHIPPED',
                     title: 'Shipped',
                     description: `Package handed to carrier${order.carrier ? ` (${order.carrier})` : ''}`,
                     icon: 'local_shipping'
                 });
             }

             // Tracking events
             for (const event of order.trackingEvents) {
                 timeline.push({
                     date: event.createdAt,
                     status: event.status,
                     title: event.description || event.status,
                     location: event.location,
                     icon: this.getIconForStatus(event.status)
                 });
             }

             // Delivered
             if (order.status === 'DELIVERED' && order.deliveredAt) {
                 timeline.push({
                     date: order.deliveredAt,
                     status: 'DELIVERED',
                     title: 'Delivered',
                     description: 'Package delivered to your address',
                     icon: 'check_circle'
                 });
                 // Escrow release scheduled
                 if (order.escrowReleaseAt) {
                     timeline.push({
                         date: order.escrowReleaseAt,
                         status: 'ESCROW_RELEASE',
                         title: 'Funds Released to Seller',
                         description: 'Payment will be released to seller after 72h',
                         icon: 'account_balance'
                     });
                 }
             }

             // Dispute opened
             if (order.dispute) {
                 timeline.push({
                     date: order.dispute.createdAt,
                     status: 'DISPUTE_OPENED',
                     title: 'Dispute Raised',
                     description: `Reason: ${order.dispute.reason}`,
                     icon: 'warning'
                 });
             }

             // Sort by date
             timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

             return timeline;
         } catch (error) {
             logger.error(`[TRACKING] Timeline error: ${error.message}`);
             return [];
         }
     }

     getIconForStatus(status) {
         const icons = {
             'SHIPPED': 'warehouse',
             'IN_TRANSIT': 'flight',
             'OUT_FOR_DELIVERY': 'delivery_dining',
             'DELIVERED': 'check_circle'
         };
         return icons[status] || 'local_shipping';
     }

     /**
      * Sync tracking from carrier APIs or simulate
      */
     async syncOrderTracking(orderId) {
         try {
             const order = await prisma.order.findUnique({
                 where: { id: orderId },
                 include: { trackingEvents: true }
             });

             if (!order || !order.trackingNumber || !order.carrier) return;

             const lastEvent = order.trackingEvents.sort((a, b) => b.createdAt - a.createdAt)[0];
             const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

             if (lastEvent && lastEvent.createdAt > twoHoursAgo && order.status !== 'DELIVERED') {
                 return;
             }

             if (CARRIER_API_KEY) {
                 if (CARRIER_PROVIDER === 'EASYPOST') {
                     await this.syncEasyPost(order);
                 } else {
                     await this.simulateLogisticsProgress(order, lastEvent);
                 }
             } else {
                 await this.simulateLogisticsProgress(order, lastEvent);
             }

         } catch (error) {
             logger.error(`[TRACKING] Sync failed for ${orderId}: ${error.message}`);
         }
     }

     async syncEasyPost(order) {
         // ... existing code
     }

     async syncShippo(order) {
         // ... existing
     }

     async simulateLogisticsProgress(order, lastEvent) {
         if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return;

         const daysSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
         let newStatus = null; let description = ''; let location = '';

         if (daysSinceOrder > 1 && (!lastEvent || order.status === 'PENDING')) {
             newStatus = 'SHIPPED'; description = 'Arrived at GlobalX Consolidation Center'; location = 'Dubai, UAE (DXB)';
         } else if (daysSinceOrder > 2 && order.status === 'SHIPPED') {
             newStatus = 'IN_TRANSIT'; description = 'Departed facility - In flight'; location = 'International Airspace';
         } else if (daysSinceOrder > 4 && order.status === 'IN_TRANSIT') {
             newStatus = 'OUT_FOR_DELIVERY'; description = 'With local courier for final delivery'; location = 'Local Distribution Center';
         } else if (daysSinceOrder > 5 && order.status === 'OUT_FOR_DELIVERY') {
             newStatus = 'DELIVERED'; description = 'Package delivered'; location = 'Customer Address';
         }

         if (newStatus) {
             await this.upsertEvent(order.id, newStatus, description, location);
             await prisma.order.update({
                 where: { id: order.id },
                 data: { status: newStatus }
             });
             if (newStatus === 'DELIVERED') {
                 await this.onOrderDelivered(order.id);
             }
             logger.info(`[TRACKING] Auto-progressed Order ${order.id} to ${newStatus}`);
         }
     }

     async onOrderDelivered(orderId) {
         // Set deliveredAt, escrowReleaseAt, release notifications
         const deliveredAt = new Date();
         const releaseAt = new Date(deliveredAt.getTime() + 72 * 60 * 60 * 1000);
         await prisma.order.update({
             where: { id: orderId },
             data: {
                 deliveredAt,
                 escrowReleaseAt: releaseAt
             }
         });
         
         const order = await prisma.order.findUnique({
             where: { id: orderId },
             select: { buyerId: true }
         });
         
         if (order && order.buyerId) {
             // Notify buyer
             await prisma.notification.create({
                 data: {
                     userId: order.buyerId,
                     title: '📦 Order Delivered',
                     body: `Your order #${orderId.substring(0,8)} has been delivered.`,
                     type: 'ORDER_UPDATE'
                 }
             });
         }
     }

     async upsertEvent(orderId, status, description, location) {
         const existing = await prisma.trackingEvent.findFirst({
             where: {
                 orderId,
                 status,
                 createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
             }
         });
         if (!existing) {
             await prisma.trackingEvent.create({
                 data: { orderId, status, description: description || status, location: location || 'Transit Point' }
             });
         }
     }
 }

 module.exports = new TrackingService();
