'use strict';

/**
 * Domain Event Handlers — Phase 7
 *
 * Registers event handlers on the domain event bus.
 * Called once at server startup.
 *
 * Each handler is a simple async function that receives the event object.
 * Handlers run asynchronously — they MUST NOT throw unhandled errors.
 *
 * This module is the ONLY place where "what happens when X occurs" is defined.
 * All notification, logging, and side-effect logic lives here, not scattered
 * across individual service files.
 */

const domainEvents    = require('./domainEventService');
const notificationV2  = require('./notificationV2Service'); // Phase 9
const logger          = require('../utils/logger');
const prisma          = require('../utils/prismaClient');
const emailService    = require('./emailService');
const messagingService = require('./messagingService');

// ─── Registration ─────────────────────────────────────────────────────────────

function registerEventHandlers() {
    logger.info('[EventHandlers] Registering domain event handlers...');

    // ── Order lifecycle ─────────────────────────────────────────────────────

    domainEvents.on('ORDER_CREATED', async (event) => {
        const { buyerId, marketplaceOrderId, sellerIds, itemCount, grandTotal } = event.data;
        const shortId = marketplaceOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        // Notify buyer
        await _notify(buyerId, {
            type:    'ORDER_CREATED',
            title:   'Order Placed ✅',
            body:    `Order #${shortId} has been placed with ${itemCount || '?'} items. ₦${Number(grandTotal || 0).toLocaleString()} — awaiting payment.`,
            linkUrl: `/orders/${marketplaceOrderId}`,
        });

        // Notify each seller
        if (Array.isArray(sellerIds)) {
            for (const sellerId of sellerIds) {
                await _notify(sellerId, {
                    type:    'INCOMING_ORDER',
                    title:   'Incoming Order 🔔',
                    body:    `New order #${shortId} received. Awaiting buyer payment confirmation.`,
                    linkUrl: `/seller/orders`,
                });
            }
        }
    }, 'order-created-notifications');

    domainEvents.on('ORDER_CANCELLED', async (event) => {
        const { buyerId, marketplaceOrderId, reason } = event.data;
        const shortId = marketplaceOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(buyerId, {
            type:    'ORDER_CANCELLED',
            title:   'Order Cancelled',
            body:    `Order #${shortId} was cancelled. ${reason || 'Items have been restocked.'}`,
            linkUrl: `/orders/${marketplaceOrderId}`,
        });
    }, 'order-cancelled-notification');

    // ── Payment lifecycle ───────────────────────────────────────────────────

    domainEvents.on('PAYMENT_CONFIRMED', async (event) => {
        const { buyerId, marketplaceOrderId, amount } = event.data;
        const shortId = marketplaceOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        // Notify buyer
        await _notify(buyerId, {
            type:    'PAYMENT_CONFIRMED',
            title:   'Payment Confirmed ✅',
            body:    `₦${Number(amount || 0).toLocaleString()} received for order #${shortId}. Sellers are preparing your items.`,
            linkUrl: `/orders/${marketplaceOrderId}`,
        });

        try {
            // Fetch order details for seller notifications (address, product details, images)
            const order = await prisma.order.findUnique({
                where: { id: marketplaceOrderId },
                include: {
                    items: { include: { product: { include: { images: true } } } },
                    buyer: true
                }
            });

            if (order && order.items && order.items.length > 0) {
                // Group items by seller
                const itemsBySeller = {};
                for (const item of order.items) {
                    const sellerId = item.product?.storeId || item.sellerId; // Fallback if storeId isn't on product
                    if (!sellerId) continue;
                    if (!itemsBySeller[sellerId]) itemsBySeller[sellerId] = [];
                    itemsBySeller[sellerId].push(item);
                }

                // Send enriched notification to each seller
                for (const [sellerId, items] of Object.entries(itemsBySeller)) {
                    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
                    if (!seller) continue;

                    const addressText = order.shippingAddress || 'No Address Provided';
                    
                    for (const item of items) {
                        const productTitle = item.product?.title || 'Unknown Product';
                        const productImageUrl = item.product?.images?.[0]?.url || 'https://placehold.co/100x100/111/333?text=No+Image';
                        const details = `Order #${shortId} | Qty: ${item.quantity} | Total: ₦${item.priceAtTime}`;

                        const messageContent = `🎉 **New Paid Order**\n\n**Product:** ${productTitle}\n**Details:** ${details}\n\n📍 **Deliver To:**\n${addressText}\n\nPlease prepare this item for shipping as soon as possible.`;

                        const htmlEmail = `
                            <h2>New Order Received: #${shortId}</h2>
                            <p>You have received a new paid order for the following item:</p>
                            <div style="display:flex; gap:16px; margin: 20px 0;">
                                <img src="${productImageUrl}" alt="product" width="100" height="100" style="object-fit:cover; border-radius:8px;" />
                                <div>
                                    <h3>${productTitle}</h3>
                                    <p>${details}</p>
                                </div>
                            </div>
                            <div style="background:#f4f4f5; padding:16px; border-radius:8px; margin-top:20px;">
                                <strong>Delivery Address:</strong><br/>
                                <pre style="font-family:inherit;">${addressText}</pre>
                            </div>
                        `;

                        // 1. Send Email
                        if (seller.email) {
                            await emailService.sendEmail({
                                to: seller.email,
                                subject: `New Order #${shortId} - Delivery Requested`,
                                html: htmlEmail
                            }).catch(err => logger.error(`Failed to send order email: ${err.message}`));
                        }

                        // 2. In-App Notification
                        await _notify(sellerId, {
                            type: 'INCOMING_ORDER_PAID',
                            title: 'Order Paid & Ready to Ship 📦',
                            body: `Order #${shortId} is paid. Deliver to: ${addressText}`,
                            linkUrl: `/seller/orders`,
                            imageUrl: productImageUrl
                        });

                        // 3. App Message Box (System Message from Buyer to Seller)
                        await messagingService.sendMessage({
                            senderId: buyerId,
                            receiverId: sellerId,
                            content: messageContent,
                            isSystemMessage: true,
                            orderId: marketplaceOrderId,
                            productId: item.productId
                        }).catch(err => logger.error(`Failed to send order message: ${err.message}`));
                    }
                }
            }
        } catch (error) {
            logger.error(`[PAYMENT_CONFIRMED] Failed to process seller notifications: ${error.message}`);
        }
    }, 'payment-confirmed-notification');

    domainEvents.on('PAYMENT_FAILED', async (event) => {
        const { buyerId, marketplaceOrderId } = event.data;
        const shortId = marketplaceOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(buyerId, {
            type:    'PAYMENT_FAILED',
            title:   'Payment Failed ❌',
            body:    `Payment for order #${shortId} could not be processed. Please try again.`,
            linkUrl: `/orders/${marketplaceOrderId}`,
        });
    }, 'payment-failed-notification');

    // ── Fulfillment lifecycle ───────────────────────────────────────────────

    domainEvents.on('FULFILLMENT_CONFIRMED', async (event) => {
        const { buyerId, fulfillmentOrderId, sellerId } = event.data;
        const shortId = fulfillmentOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(buyerId, {
            type:    'FULFILLMENT_CONFIRMED',
            title:   'Order Confirmed by Seller',
            body:    `A seller has confirmed order #${shortId} and is preparing your items.`,
            linkUrl: `/orders`,
        });
    }, 'fulfillment-confirmed-notification');

    domainEvents.on('FULFILLMENT_SHIPPED', async (event) => {
        const { buyerId, fulfillmentOrderId, trackingNumber, carrier } = event.data;
        const shortId = fulfillmentOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(buyerId, {
            type:    'FULFILLMENT_SHIPPED',
            title:   'Order Shipped 📦',
            body:    `Order #${shortId} is on its way!${trackingNumber ? ` Tracking: ${trackingNumber}` : ''}${carrier ? ` via ${carrier}` : ''}`,
            linkUrl: `/orders`,
        });
    }, 'fulfillment-shipped-notification');

    domainEvents.on('FULFILLMENT_DELIVERED', async (event) => {
        const { buyerId, fulfillmentOrderId } = event.data;
        const shortId = fulfillmentOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(buyerId, {
            type:    'FULFILLMENT_DELIVERED',
            title:   'Order Delivered 🎉',
            body:    `Order #${shortId} has been delivered! If everything looks good, confirm receipt to release seller payment.`,
            linkUrl: `/orders`,
        });
    }, 'fulfillment-delivered-notification');

    // ── Escrow lifecycle ────────────────────────────────────────────────────

    domainEvents.on('ESCROW_RELEASED', async (event) => {
        const { sellerId, fulfillmentOrderId, sellerAmount } = event.data;
        const shortId = fulfillmentOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        await _notify(sellerId, {
            type:    'ESCROW_RELEASED',
            title:   'Funds Released 💰',
            body:    `₦${Number(sellerAmount || 0).toLocaleString()} released for order #${shortId}.`,
            linkUrl: `/seller/earnings`,
        });
    }, 'escrow-released-notification');

    // ── Dispute lifecycle ───────────────────────────────────────────────────

    domainEvents.on('DISPUTE_OPENED', async (event) => {
        const { sellerId, buyerId, fulfillmentOrderId, reason } = event.data;
        const shortId = fulfillmentOrderId?.substring(0, 8).toUpperCase() || 'N/A';

        // Notify seller
        await _notify(sellerId, {
            type:    'DISPUTE_OPENED',
            title:   'Dispute Raised ⚠️',
            body:    `Buyer opened a dispute on order #${shortId}: "${reason || 'No reason given'}". Please respond within 48 hours.`,
            linkUrl: `/seller/orders/${fulfillmentOrderId}`,
        });

        // Notify admin
        await _notify('PLATFORM', {
            type:    'DISPUTE_OPENED',
            title:   'New Dispute Requires Attention',
            body:    `Dispute on FO #${shortId}. Reason: ${reason || 'Not specified'}`,
            linkUrl: `/admin/disputes`,
        });
    }, 'dispute-opened-notifications');

    // ── Wildcard: analytics event logger ────────────────────────────────────

    domainEvents.on('*', async (event) => {
        logger.debug(
            `[DomainEvent] ${event.eventType} | ${event.aggregateType}:${event.aggregateId} | actor:${event.actorId || 'SYSTEM'}`
        );
    }, 'global-event-logger');

    logger.info('[EventHandlers] All domain event handlers registered ✅');
}

// ─── Internal notification helper (delegates to notificationV2Service) ────────

async function _notify(userId, { type, title, body, linkUrl, actionUrl, imageUrl, orderId, metadata }) {
    await notificationV2.notify(userId, {
        type,
        title,
        body,
        channel:   'in_app',
        actionUrl: actionUrl || linkUrl || null,
        linkUrl:   linkUrl   || actionUrl || null,
        imageUrl:  imageUrl  || null,
        orderId:   orderId   || null,
        metadata:  metadata  || null,
    });
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = { registerEventHandlers };
