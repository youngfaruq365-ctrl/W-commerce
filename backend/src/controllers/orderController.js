 const prisma = require('../utils/prismaClient');
 const socketService = require('../services/socketService');
 const logger = require('../utils/logger');
 const trackingService = require('../services/trackingService');
const inventoryService = require('../services/inventoryService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const RecommendationService = require('../services/recommendationService');
const flashDealService = require('../services/flashDealService');
const repeatPurchaseService = require('../services/repeatPurchaseService');

const ORDER_TRANSITIONS = {
    PENDING: ['PAID', 'PACKED', 'CANCELLED'],
    PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
    AWAITING_DIRECT_PAYMENT: ['PAID', 'CANCELLED'],
    PAID: ['PACKED', 'SHIPPED', 'CANCELLED', 'DISPUTED'],
    PACKED: ['CONFIRMED', 'SHIPPED', 'CANCELLED', 'DISPUTED', 'AWAITING_COURIER', 'HANDED_TO_COURIER', 'IN_TRANSIT'],
    AWAITING_COURIER: ['SHIPPED', 'IN_TRANSIT', 'HANDED_TO_COURIER', 'CANCELLED', 'DISPUTED'],
    CONFIRMED: ['SHIPPED', 'CANCELLED', 'DISPUTED', 'IN_TRANSIT'],
    SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'DISPUTED', 'OUT_FOR_DELIVERY'],
    HANDED_TO_COURIER: ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED'],
    IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DISPUTED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'DISPUTED'],
    DELIVERED: ['COMPLETED', 'DISPUTED'],
    COMPLETED: [],
    DISPUTED: ['COMPLETED', 'CANCELLED'],
    CANCELLED: []
};

function canTransitionOrderStatus(currentStatus, nextStatus) {
    const normalizedCurrent = String(currentStatus || 'PENDING').toUpperCase();
    const normalizedNext = String(nextStatus || '').toUpperCase();
    if (normalizedCurrent === normalizedNext) return true;
    const allowed = ORDER_TRANSITIONS[normalizedCurrent] || [];
    return allowed.includes(normalizedNext);
}


const checkoutV2Service = require('../services/checkoutV2Service');

// Create New Order
exports.createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, isConsolidated } = req.body;
        const buyerId = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in order' });
        }

         const { marketplaceOrder: newOrder, summary } = await checkoutV2Service.processCheckoutV2({
            buyerId: buyerId,
            items,
            fromCart: false,
            addressData: shippingAddress,
            isConsolidated,
            paymentMethod: paymentMethod || 'CARD'
        });

        // Reconstruct purchasedProducts for post-order events
        const purchasedProducts = items.map(item => ({
            id: String(item.id || item.productId),
            productId: item.productId,
            name: 'Product', // Assuming name isn't critical for basic tracking if not provided
            quantity: item.quantity,
            price: item.price
        }));

        const orderItemsData = purchasedProducts.map(p => ({ productId: p.productId || p.id })); // simplified array for urgency update

        // 3. Create Transaction Record for initial payment intent
        await prisma.transaction.create({
            data: {
                userId: buyerId,
                type: 'PURCHASE',
                amount: summary.grandTotal,
                currency: summary.currency,
                status: 'PENDING',
                referenceId: newOrder.id,
                description: `Order #${newOrder.id.substring(0, 8)} - Pending Payment`
            }
        });

        const order = newOrder;

         // Update product urgency for each product in the order
         for (const item of orderItemsData) {
             inventoryService.updateProductUrgency(item.productId).catch(err =>
                 logger.error(`[INVENTORY] Urgency update failed for ${item.productId}: ${err.message}`)
             );
         }

        // LIVE HEARTBEAT: Broadcast activity
        const buyer = await prisma.user.findUnique({
            where: { id: buyerId },
            include: { addresses: { where: { isDefault: true }, take: 1 } }
        });
        const buyerName = buyer ? buyer.fullName : 'A user';
        const country = buyer?.country || buyer?.addresses?.[0]?.country || 'Global';

        // Fetch product names for broadcast
        const productIds = items.map(i => String(i.id || i.productId));
        const productsBought = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { title: true, isFlashSale: true }
        });

        const hasFlash = productsBought.some(p => p.isFlashSale);
        const firstTitle = productsBought[0]?.title || 'item';
        const dealText = hasFlash ? '⚡ SECURED FLASH DEAL:' : '🛍️ NEW ORDER:';

        socketService.broadcastActivity(`${buyerName} from ${country} ${dealText} ${firstTitle}${items.length > 1 ? ' and more' : ''}!`);

        for (const product of purchasedProducts) {
            await RecommendationService.trackUserInteraction(buyerId, product.id, 'PURCHASE', {
                source: 'checkout',
                weight: Math.max(product.quantity, 1)
            });

            if (product.isFlashSale) {
                const flashDeal = await prisma.flashDeal.findFirst({
                    where: {
                        productId: product.id,
                        isActive: true,
                        endDate: { gt: new Date() }
                    },
                    orderBy: { endDate: 'asc' }
                });

                if (flashDeal) {
                    await flashDealService.trackDealConversion(
                        flashDeal.id,
                        buyerId,
                        product.priceAtTime * product.quantity,
                        { orderId: order.id, quantity: product.quantity }
                    );
                }
            }
        }

        logger.info(`Order created: ${order.id} by User ${buyerId}`);

        res.status(201).json({ success: true, order });

    } catch (error) {
        logger.error(`Create Order Error: ${error.message}`);
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

// Seller: Get all orders for my store
exports.getSellerOrders = async (req, res) => {
    try {
        const store = await prisma.store.findUnique({
            where: { sellerId: req.user.id }
        });

        if (!store) {
            return res.json({ success: true, orders: [] });
        }

        const [legacyOrders, fulfillmentOrders] = await Promise.all([
            prisma.order.findMany({
                where: {
                    items: {
                        some: {
                            product: { storeId: store.id }
                        }
                    },
                    // Exclude cancelled and refunded orders
                    status: { notIn: ['CANCELLED', 'REFUNDED'] },
                    paymentStatus: { not: 'FAILED' },
                    // For online payment methods, do not show pending unpaid checkouts to sellers
                    NOT: {
                        AND: [
                            { paymentMethod: { in: ['PAYSTACK', 'CARD', 'STRIPE', 'FLUTTERWAVE'] } },
                            { paymentStatus: 'PENDING' }
                        ]
                    },
                    // Avoid duplicating multi-seller parent orders:
                    // Show either single-seller orders (no children) or this seller's specific sub-order
                    OR: [
                        { parentOrderId: { not: null }, sellerId: req.user.id },
                        { parentOrderId: null, subOrders: { none: {} } }
                    ]
                },
                include: {
                    buyer: { select: { fullName: true, email: true } },
                    items: { 
                        where: { product: { storeId: store.id } },
                        include: { product: { include: { images: true } } } 
                    },
                    deliveryAssignment: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.fulfillmentOrder.findMany({
                where: {
                    sellerId: req.user.id,
                    status: { notIn: ['CANCELLED', 'REFUNDED'] },
                    paymentStatus: { not: 'FAILED' },
                    NOT: {
                        AND: [
                            { marketplaceOrder: { paymentMethod: { in: ['PAYSTACK', 'CARD', 'STRIPE', 'FLUTTERWAVE'] } } },
                            { paymentStatus: 'PENDING' }
                        ]
                    }
                },
                include: {
                    buyer: { select: { fullName: true, email: true } },
                    items: { include: { product: { include: { images: true } } } },
                    marketplaceOrder: { select: { shippingSnapshot: true, paymentMethod: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        
        function mapFulfillmentToLegacy(fo) {
            return {
                ...fo,
                totalAmount: fo.grandTotal || fo.subtotal,
                paymentMethod: fo.marketplaceOrder?.paymentMethod || 'Unknown',
                shippingAddress: fo.marketplaceOrder?.shippingSnapshot || null,
                status: fo.status === 'DELIVERED' ? 'DELIVERED' : fo.status,
                items: fo.items.map(item => ({
                    ...item,
                    product: item.product
                }))
            };
        }

        const mergedOrders = [...legacyOrders, ...fulfillmentOrders.map(mapFulfillmentToLegacy)]
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, orders: mergedOrders });
    } catch (error) {
        logger.error(`Get Seller Orders Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



// Buyer: Get my order history
exports.getBuyerOrders = async (req, res) => {
    try {
        const [orders, marketplaceOrders] = await Promise.all([
            prisma.order.findMany({
                where: { buyerId: req.user.id, parentOrderId: null },
                include: {
                    items: { include: { product: { include: { store: true, images: true } } } },
                    subOrders: {
                        include: {
                            items: { include: { product: { include: { store: true, images: true } } } },
                            trackingEvents: true
                        }
                    },
                    trackingEvents: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.marketplaceOrder.findMany({
                where: { buyerId: req.user.id },
                include: {
                    fulfillmentOrders: {
                        include: {
                            items: { include: { product: { include: { store: true, images: true } } } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        function mapMarketplaceToLegacy(mo) {
            const items = mo.fulfillmentOrders ? mo.fulfillmentOrders.flatMap(fo => fo.items) : [];
            return {
                ...mo,
                _source: 'marketplace',
                items,
                trackingEvents: [],
                status: mo.status === 'DELIVERED' ? 'DELIVERED' : mo.status
            };
        }

        // Tag legacy orders with their source
        const taggedOrders = orders.map(o => ({ ...o, _source: 'legacy' }));

        // Build a set of legacy order IDs so we don't double-show an order
        // that was created in both tables (e.g. checkout created a legacy Order AND a MarketplaceOrder
        // for the same transaction). We match by: same buyerId, same createdAt minute, same total amount.
        const legacyFingerprints = new Set(
            taggedOrders.map(o => {
                const minute = Math.floor(new Date(o.createdAt).getTime() / 60000);
                return `${minute}_${String(o.totalAmount || o.total || 0)}`;
            })
        );

        const deduplicatedMarketplace = marketplaceOrders
            .map(mapMarketplaceToLegacy)
            .filter(mo => {
                const minute = Math.floor(new Date(mo.createdAt).getTime() / 60000);
                const fp = `${minute}_${String(mo.totalAmount || mo.total || 0)}`;
                // Exclude this MarketplaceOrder if a legacy Order with the same fingerprint already exists
                return !legacyFingerprints.has(fp);
            });

        const mergedOrders = [...taggedOrders, ...deduplicatedMarketplace]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Background Sync: Check tracking for active orders (non-blocking)
        const activeOrders = mergedOrders.filter(o => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status));
        activeOrders.forEach(order => {
            trackingService.syncOrderTracking(order.id).catch(err =>
                logger.error(`[BG SYNC] Order ${order.id} sync error: ${err.message}`)
            );
        });

        res.json({ success: true, orders: mergedOrders });
    } catch (error) {
        logger.error(`Get Buyer Orders Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getBuyAgainSuggestions = async (req, res) => {
    try {
        const suggestions = await repeatPurchaseService.getBuyAgainSuggestions(
            req.user.id,
            Number(req.query.limit || 6)
        );

        res.json({ success: true, suggestions });
    } catch (error) {
        logger.error(`Get Buy Again Suggestions Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load buy again suggestions' });
    }
};

exports.reorderOrder = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const order = await prisma.order.findFirst({
            where: {
                id: req.params.id,
                buyerId
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                store: true,
                                images: {
                                    where: { isPrimary: true },
                                    select: { url: true },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        let cart = await prisma.cart.findUnique({ where: { userId: buyerId } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId: buyerId } });
        }

        const unavailable = [];

        for (const item of order.items) {
            const product = item.product;
            if (!product) continue;

            const quantityToAdd = Math.min(Number(product.stock || 0), item.quantity);
            if (quantityToAdd <= 0) {
                const comparison = await RecommendationService.getComparison(product.id);
                unavailable.push({
                    productId: product.id,
                    title: product.title,
                    reason: 'OUT_OF_STOCK',
                    alternatives: (comparison?.products || [])
                        .filter((candidate) => candidate.id !== product.id)
                        .slice(0, 3)
                });
                continue;
            }

            const existingItem = await prisma.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    productId: product.id,
                    variants: item.variants || null
                }
            });

            if (existingItem) {
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: Math.min(existingItem.quantity + quantityToAdd, Number(product.stock || quantityToAdd))
                    }
                });
            } else {
                await prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        productId: product.id,
                        quantity: quantityToAdd,
                        variants: item.variants || null
                    }
                });
            }

            if (quantityToAdd < item.quantity) {
                unavailable.push({
                    productId: product.id,
                    title: product.title,
                    reason: 'LIMITED_STOCK',
                    requestedQty: item.quantity,
                    addedQty: quantityToAdd
                });
            }
        }

        const fullCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: {
                        product: {
                            include: { store: true }
                        }
                    }
                }
            }
        });

        res.json({
            success: true,
            cart: fullCart,
            unavailable
        });
    } catch (error) {
        logger.error(`Reorder Order Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to reorder items' });
    }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status, trackingNumber, carrier } = req.body;
        const normalizedStatus = String(status || '').toUpperCase();

        const existingOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: { include: { store: true, images: true } } } },
                buyer: true
            }
        });

        if (existingOrder) {
            let isAuthorized = false;
            if (req.user.role === 'ADMIN') {
                isAuthorized = true;
            } else if (req.user.role === 'SELLER') {
                isAuthorized = existingOrder.items.some(item => item.product?.store?.sellerId === req.user.id);
            }

            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
            }

            // Idempotency: If the order is already in the requested status, succeed immediately
            if (existingOrder.status === normalizedStatus) {
                return res.json({
                    success: true,
                    message: `Order is already ${normalizedStatus}`,
                    order: existingOrder
                });
            }

            if (!canTransitionOrderStatus(existingOrder.status, normalizedStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status transition from ${existingOrder.status} to ${normalizedStatus}`
                });
            }

            if (['PAID', 'DELIVERED'].includes(normalizedStatus) && req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: `Sellers are not allowed to manually set status to ${normalizedStatus}`
                });
            }

            const paymentPatch = {};
            if (normalizedStatus === 'PAID') paymentPatch.paymentStatus = 'HELD';
            if (normalizedStatus === 'COMPLETED' && String(existingOrder.paymentMethod || '').toUpperCase() === 'COD') {
                paymentPatch.paymentStatus = 'RELEASED';
            }
            if (normalizedStatus === 'DISPUTED') paymentPatch.paymentStatus = 'DISPUTED';

            await prisma.order.update({
                where: { id: orderId },
                data: { status: normalizedStatus, ...paymentPatch }
            });

            if (existingOrder.parentOrderId) {
                const siblings = await prisma.order.findMany({ where: { parentOrderId: existingOrder.parentOrderId } });
                const allSameStatus = siblings.every(s => (s.id === orderId ? normalizedStatus : s.status) === normalizedStatus);
                if (allSameStatus) {
                    await prisma.order.update({
                        where: { id: existingOrder.parentOrderId },
                        data: { status: normalizedStatus, ...paymentPatch }
                    });
                }
            }

            if (normalizedStatus === 'SHIPPED' || normalizedStatus === 'IN_TRANSIT') {
                trackingService.setEstimatedDeliveryDate(orderId);
            }
            
            if (normalizedStatus === 'SHIPPED' && String(existingOrder.paymentMethod || '').toUpperCase() === 'COD') {
                try {
                    await require('../services/checkoutService').triggerShippingFeePayment(orderId);
                } catch(e) { logger.warn(`COD fee trigger failed: ${e.message}`); }
            }

            try {
                const orderEventService = require('../services/orderEventService');
                orderEventService.emitOrderUpdated({
                    orderId,
                    buyerId: existingOrder.buyerId,
                    sellerIds: existingOrder.items.map(i => i.product?.store?.sellerId).filter(Boolean)
                });
                if (existingOrder.parentOrderId) {
                    orderEventService.emitOrderUpdated({
                        orderId: existingOrder.parentOrderId,
                        buyerId: existingOrder.buyerId
                    });
                }
            } catch(e) {}
            if (normalizedStatus === 'SHIPPED' && String(existingOrder.paymentMethod || '').toUpperCase() === 'COD') {
                try {
                    for (const item of existingOrder.items) {
                        if (item.productId) {
                            await prisma.product.update({
                                where: { id: item.productId },
                                data: { soldCount: { increment: item.quantity } }
                            });
                        }
                    }
                } catch (err) {
                    logger.error(`Failed to update soldCount on shipment: ${err.message}`);
                }
            }

            logger.info(`Order status update: ${orderId} -> ${normalizedStatus} by User ${req.user.id}`);
        } else {
            // Try V2 FulfillmentOrder
            let fo = await prisma.fulfillmentOrder.findFirst({
                where: {
                    id: orderId,
                    sellerId: req.user.id
                },
                include: { buyer: true, marketplaceOrder: true, items: true }
            });
            
            if (fo) {
                if (fo.status === normalizedStatus || (normalizedStatus === 'SHIPPED' && ['SHIPPED', 'IN_TRANSIT', 'AWAITING_COURIER'].includes(fo.status))) {
                    return res.json({ success: true, message: `Order is already ${fo.status}`, order: fo });
                }

                if (status === 'SHIPPED') {
                    const fulfillmentService = require('../services/fulfillmentService');
                    
                    if (fo.status === 'PACKED') {
                        // Fast forward to AWAITING_COURIER to appease strict state machine
                        fo = await fulfillmentService.requestCourier({ fulfillmentOrderId: fo.id, sellerId: req.user.id });
                    }
                    
                    const updatedFo = await fulfillmentService.handover({
                        fulfillmentOrderId: fo.id,
                        sellerId: req.user.id,
                        trackingNumber: trackingNumber || 'N/A',
                        carrier: carrier || 'N/A'
                    });

                    // Increment soldCount for COD orders, as they aren't paid through the gateway
                    if (String(fo.marketplaceOrder?.paymentMethod || '').toUpperCase() === 'COD') {
                        try {
                            for (const item of fo.items) {
                                if (item.productId) {
                                    await prisma.product.update({
                                        where: { id: item.productId },
                                        data: { soldCount: { increment: item.quantity } }
                                    });
                                }
                            }
                        } catch (err) {
                            logger.error(`Failed to update soldCount on V2 shipment: ${err.message}`);
                        }
                    }

                    return res.json({ success: true, message: 'Order status updated', order: updatedFo });
                }
                
                return res.json({ success: true, message: 'Order status updated (V2 fallback)', order: fo });
            }
            
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // --- REAL NOTIFICATIONS START ---
        const emailOrder = existingOrder;
        const buyerObj = existingOrder ? existingOrder.buyer : null;
        
        const recipientEmail = buyerObj?.email;
        const recipientPhone = buyerObj?.phone;
        const buyerName = buyerObj?.fullName || 'Valued Customer';

        // Email
        if (recipientEmail && emailOrder) {
            emailService.sendOrderStatusUpdate(
                recipientEmail,
                buyerName,
                orderId,
                status
            ).catch(err => logger.error(`Email err: ${err.message}`));
        }

        // SMS (Only on SHIPPED/DELIVERED/CANCELLED for cost)
        if (recipientPhone && emailOrder) {
            if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
                smsService.sendOrderStatusUpdate(
                    recipientPhone,
                    buyerName,
                    orderId,
                    status
                ).catch(err => logger.error(`SMS err: ${err.message}`));
            }
        }
        // --- REAL NOTIFICATIONS END ---

        // 4. Status Specific Actions
        if (normalizedStatus === 'PAID') {
            // Update associated Transaction record if it exists
            await prisma.transaction.updateMany({
                where: { referenceId: orderId, status: 'PENDING' },
                data: { status: 'COMPLETED' }
            });

            // Notify Buyer
            await prisma.notification.create({
                data: {
                    userId: existingOrder.buyerId,
                    title: 'Payment Confirmed',
                    body: `Your payment for order #${orderId.substring(0, 8)} has been verified.`,
                    type: 'ORDER',
                    linkUrl: 'buyer-profile.html'
                }
            });
        }

        if (normalizedStatus === 'SHIPPED') {
            // Auto-create tracking event
            await prisma.trackingEvent.create({
                data: {
                    orderId: orderId,
                    status: 'SHIPPED',
                    location: 'Seller Warehouse',
                    description: 'Order has been picked up by the courier.'
                }
            });

            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

            // Create notification for each admin
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        title: 'Order Shipped',
                        body: `Order #${orderId.substring(0, 8)} has been marked as SHIPPED.`,
                        type: 'ORDER',
                        linkUrl: `admin-dashboard.html` // Or specific order view
                    }))
                });
            }

            // Notify Buyer
            await prisma.notification.create({
                data: {
                    userId: existingOrder.buyerId,
                    title: 'Order Shipped',
                    body: `Order #${orderId.substring(0, 8)} is on its way! Track it in your profile.`,
                    type: 'ORDER',
                    linkUrl: 'buyer-profile.html'
                }
            });
        }

        if (normalizedStatus === 'DELIVERED') {
            const now = new Date();
            const escrowReleaseAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from delivery

            // Set delivery timestamp and schedule escrow auto-release
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    deliveredAt: now,
                    escrowReleaseAt: escrowReleaseAt
                }
            });

            // Update EscrowPayment with scheduled release
            try {
                await prisma.escrowPayment.updateMany({
                    where: { orderId },
                    data: { releaseScheduledAt: escrowReleaseAt }
                });
            } catch (e) { /* ignore if no escrow record */ }

            await prisma.trackingEvent.create({
                data: {
                    orderId: orderId,
                    status: 'DELIVERED',
                    location: 'Customer Address',
                    description: 'Package delivered to recipient.'
                }
            });

            // Notify Buyer - tell them about the 72h window
            await prisma.notification.create({
                data: {
                    userId: existingOrder.buyerId,
                    title: 'Order Delivered',
                    body: `Your order #${orderId.substring(0, 8)} has been delivered. Please confirm receipt to release funds. You have 48 hours to raise a dispute if there are any issues.`,
                    type: 'ORDER',
                    linkUrl: 'buyer-profile.html'
                }
            });
        }

        res.json({ success: true, message: `Status updated to ${normalizedStatus}` });
    } catch (error) {
        logger.error(`Update Order Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Raise a Dispute
exports.raiseDispute = async (req, res) => {
    try {
        const { orderId, reason, description, evidenceUrls } = req.body;
        const buyerId = req.user.id;

        // Verify order exists and belongs to buyer
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: { include: { images: true } } } } }
        });

        if (!order || order.buyerId !== buyerId) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Determine Seller (simplified: first seller in order)
        // BUG-ORDER-02: Guard empty items and resolve storeId -> sellerId safely
        if (!order.items || order.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order has no items' });
        }
        const storeId = order.items[0].product?.storeId;
        if (!storeId) {
            return res.status(400).json({ success: false, message: 'Cannot determine seller for this order' });
        }
        const sellerStore = await prisma.store.findUnique({ where: { id: storeId } });
        if (!sellerStore) {
            return res.status(400).json({ success: false, message: 'Seller store not found' });
        }

        const dispute = await prisma.dispute.create({
            data: {
                orderId,
                buyerId,
                sellerId: sellerStore.sellerId,
                reason,
                description,
                evidenceUrls: JSON.stringify(evidenceUrls || []),
                status: 'OPEN'
            }
        });

        // Update Order status (both fulfillment and payment)
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'DISPUTED',
                paymentStatus: 'DISPUTED'
            }
        });

        // Freeze escrow payment if it exists
        try {
            await prisma.escrowPayment.updateMany({
                where: { orderId, status: 'HELD' },
                data: {
                    status: 'DISPUTED',
                    disputedAt: new Date()
                }
            });
        } catch (e) { /* ignore if no escrow record */ }

        logger.warn(`Dispute raised on Order ${orderId}: ${reason}. Escrow funds FROZEN.`);

        res.status(201).json({ success: true, dispute });

    } catch (error) {
        logger.error(`Raise Dispute Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Single Order Details
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        let order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: { include: { images: true } } } },
                buyer: { select: { fullName: true, email: true, phone: true } },
            }
        });

        if (!order && id && id.length >= 4) {
            order = await prisma.order.findFirst({
                where: {
                    OR: [
                        { id: { contains: id } },
                        { trackingNumber: id }
                    ]
                },
                include: {
                    items: { include: { product: { include: { images: true } } } },
                    buyer: { select: { fullName: true, email: true, phone: true } },
                }
            });
        }

        if (!order && id) {
            const payAIOrder = await prisma.payAIOrder.findFirst({
                where: {
                    OR: [
                        { id },
                        { orderNumber: id },
                        { trackingNumber: id },
                        ...(id.length >= 4 ? [{ id: { contains: id } }, { orderNumber: { contains: id } }] : [])
                    ]
                },
                include: { events: true }
            });

            if (payAIOrder) {
                let items = [];
                try {
                    items = typeof payAIOrder.itemsSnapshot === 'string' ? JSON.parse(payAIOrder.itemsSnapshot) : (payAIOrder.itemsSnapshot || []);
                } catch (_) {}

                // Attempt to resolve missing product images
                for (const it of items) {
                    if (!it.imageUrl && it.productId) {
                        try {
                            const prod = await prisma.product.findUnique({
                                where: { id: it.productId },
                                include: { images: true }
                            });
                            if (prod?.images?.[0]?.url) {
                                it.imageUrl = prod.images[0].url;
                            }
                        } catch (_) {}
                    }
                    if (!it.imageUrl && it.title) {
                        try {
                            const prod = await prisma.product.findFirst({
                                where: { title: { contains: it.title } },
                                include: { images: true }
                            });
                            if (prod?.images?.[0]?.url) {
                                it.imageUrl = prod.images[0].url;
                            }
                        } catch (_) {}
                    }
                }

                // Resolve shipping address & buyer info
                let shippingAddress = null;
                if (payAIOrder.shippingAddress) {
                    if (typeof payAIOrder.shippingAddress === 'object') {
                        shippingAddress = payAIOrder.shippingAddress;
                    } else {
                        try {
                            shippingAddress = JSON.parse(payAIOrder.shippingAddress);
                        } catch (_) {
                            shippingAddress = { street: payAIOrder.shippingAddress };
                        }
                    }
                }

                let buyer = null;
                if (payAIOrder.userId) {
                    const user = await prisma.user.findUnique({
                        where: { id: payAIOrder.userId },
                        include: { addresses: true }
                    });
                    if (user) {
                        buyer = {
                            id: user.id,
                            fullName: user.fullName || user.username || 'Buyer',
                            email: user.email,
                            phone: user.phone
                        };
                        if (!shippingAddress) {
                            const defaultAddress = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
                            if (defaultAddress) {
                                shippingAddress = {
                                    fullName: user.fullName || 'Buyer',
                                    phone: user.phone,
                                    street: defaultAddress.street,
                                    city: defaultAddress.city,
                                    state: defaultAddress.state,
                                    zipCode: defaultAddress.postalCode,
                                    country: defaultAddress.country || 'Nigeria'
                                };
                            }
                        }
                    }
                }

                if (!shippingAddress) {
                    shippingAddress = {
                        fullName: buyer?.fullName || 'Buyer',
                        phone: buyer?.phone || '',
                        street: 'Verified Delivery Destination',
                        city: 'Recorded at Checkout',
                        state: '',
                        zipCode: '',
                        country: 'Nigeria'
                    };
                }

                const subtotalNum = Number(payAIOrder.subtotal || 0);
                const shippingCostNum = Number(payAIOrder.shippingCost || 0);
                const dutiesAndTaxesNum = Number(payAIOrder.dutiesAndTaxes || 0);
                const grandTotalNum = Number(payAIOrder.grandTotal || 0) || (subtotalNum + shippingCostNum + dutiesAndTaxesNum);

                order = {
                    ...payAIOrder,
                    buyer,
                    shippingAddress,
                    subtotal: subtotalNum,
                    shippingCost: shippingCostNum,
                    dutiesAndTaxes: dutiesAndTaxesNum,
                    totalAmount: grandTotalNum,
                    grandTotal: grandTotalNum,
                    total: grandTotalNum,
                    currency: payAIOrder.currency || 'USD',
                    paymentMethod: payAIOrder.paymentProvider || 'PAYPAL',
                    paymentStatus: payAIOrder.paymentStatus || 'PAID',
                    status: payAIOrder.fulfillmentStatus || 'CONFIRMED',
                    items: items.map((it, idx) => ({
                        id: it.id || it.productId || `item-${idx}`,
                        price: Number(it.price || 0),
                        quantity: Number(it.quantity || 1),
                        imageUrl: it.imageUrl || null,
                        productName: it.title || 'Marketplace Item',
                        product: {
                            id: it.productId,
                            title: it.title || 'Marketplace Item',
                            images: it.imageUrl ? [{ url: it.imageUrl }] : []
                        }
                    }))
                };
            }
        }

        if (order) {
            // Standard order normalization
            if (order.shippingAddress && typeof order.shippingAddress === 'string') {
                try {
                    order.shippingAddress = JSON.parse(order.shippingAddress);
                } catch (_) {
                    order.shippingAddress = { street: order.shippingAddress };
                }
            } else if (!order.shippingAddress && order.buyerId) {
                const user = await prisma.user.findUnique({
                    where: { id: order.buyerId },
                    include: { addresses: true }
                });
                if (user) {
                    const defaultAddress = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
                    if (defaultAddress) {
                        order.shippingAddress = {
                            fullName: user.fullName || order.buyer?.fullName || 'Buyer',
                            phone: user.phone || '',
                            street: defaultAddress.street,
                            city: defaultAddress.city,
                            state: defaultAddress.state,
                            zipCode: defaultAddress.postalCode,
                            country: defaultAddress.country || 'Nigeria'
                        };
                    }
                }
            }
            if (!order.shippingAddress) {
                order.shippingAddress = {
                    fullName: order.buyer?.fullName || 'Buyer',
                    phone: order.buyer?.phone || '',
                    street: 'Standard Delivery Destination',
                    city: 'Recorded at Checkout',
                    state: '',
                    zipCode: '',
                    country: 'Nigeria'
                };
            }
            order.totalAmount = Number(order.totalAmount || order.grandTotal || order.total || 0);
            order.shippingCost = Number(order.shippingCost || 0);
            if (!order.subtotal) {
                order.subtotal = order.items?.length > 0
                    ? order.items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0)
                    : Math.max(0, order.totalAmount - order.shippingCost);
            }
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const isBuyer = order.buyerId === userId || order.userId === userId;
        const isSeller = order.sellerId === userId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isBuyer && !isSeller && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, order });
    } catch (error) {
        logger.error(`Get Order Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Order Tracking
exports.getOrderTracking = async (req, res) => {
     try {
         const { id } = req.params;
         const userId = req.user.id;

         const order = await prisma.order.findUnique({
             where: { id },
             include: {
                 trackingEvents: { orderBy: { createdAt: 'asc' } },
                 items: { include: { product: { include: { store: true, images: true } } } },
                 buyer: { select: { id: true, fullName: true } }
             }
         });

         if (!order) {
             return res.status(404).json({ success: false, message: 'Order not found' });
         }

         // Authorization: buyer, seller, or admin
         const isBuyer = order.buyerId === userId;
         const isSeller = order.items && order.items.some(i => i.product.store.sellerId === userId);
         if (!isBuyer && !isSeller && req.user.role !== 'ADMIN') {
             return res.status(403).json({ success: false, message: 'Not authorized' });
         }

         res.json({
             success: true,
             orderId: order.id,
             status: order.status,
             trackingNumber: order.trackingNumber || null,
             carrier: order.carrier || null,
             estimatedDelivery: order.estimatedDeliveryDate || null,
             events: order.trackingEvents
         });
     } catch (error) {
         logger.error(`Get Order Tracking Error: ${error.message}`);
         res.status(500).json({ success: false, message: 'Server error' });
     }
 };

 // Get Trust Timeline for an order
 exports.getTrustTimeline = async (req, res) => {
     try {
         const { id } = req.params;
         const userId = req.user.id;

         const order = await prisma.order.findUnique({
             where: { id },
             include: {
                 items: { include: { product: { include: { store: true, images: true } } } },
                 buyer: true,
                 trackingEvents: { orderBy: { createdAt: 'asc' } },
                 dispute: true,
                 paymentProof: true,
                 escrowPayment: true
             }
         });

         if (!order) {
             return res.status(404).json({ success: false, message: 'Order not found' });
         }

         // Authorization: buyer, seller, or admin
         const isBuyer = order.buyerId === userId;
         const isSeller = order.items && order.items.some(i => i.product.store.sellerId === userId);
         if (!isBuyer && !isSeller && req.user.role !== 'ADMIN') {
             return res.status(403).json({ success: false, message: 'Not authorized' });
         }

         const timeline = [];

         // Order placed
         timeline.push({
             date: order.createdAt,
             status: 'ORDER_PLACED',
             title: 'Order Placed',
             description: `Order placed for ${order.items.length} item(s). Total: $${parseFloat(order.totalAmount).toFixed(2)}`,
             icon: 'shopping_bag'
         });

         // Payment confirmation
         if (order.paymentStatus !== 'PENDING') {
             timeline.push({
                 date: order.paymentProof?.verifiedAt || order.createdAt,
                 status: 'PAYMENT_CONFIRMED',
                 title: 'Payment Confirmed',
                 description: 'Payment verified and escrow initiated',
                 icon: 'payment'
             });
         }

         // Seller packed
         if (order.packedAt) {
             timeline.push({
                 date: order.packedAt,
                 status: 'PACKED',
                 title: 'Seller Packed',
                 description: 'Seller packed your items and prepared shipment',
                 icon: 'box'
             });
         }

         // Shipped
         if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
             timeline.push({
                 date: order.readyToShipAt || order.createdAt,
                 status: 'SHIPPED',
                 title: 'Shipped',
                 description: `Package handed to carrier${order.carrier ? ` - ${order.carrier}` : ''}${order.trackingNumber ? ` (${order.trackingNumber})` : ''}`,
                 icon: 'local_shipping'
             });
         }

         // Tracking events
         for (const ev of order.trackingEvents) {
             timeline.push({
                 date: ev.createdAt,
                 status: ev.status,
                 title: ev.description || ev.status,
                 location: ev.location,
                 icon: exports.getTrackingIcon(ev.status)
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
                     status: 'ESCROW_SCHEDULED',
                     title: 'Funds Release Scheduled',
                     description: 'Payment will be released to seller in 48 hours',
                     icon: 'schedule'
                 });
             }
         }

         // Dispute
         if (order.dispute) {
             timeline.push({
                 date: order.dispute.createdAt,
                 status: 'DISPUTE_OPENED',
                 title: 'Dispute Raised',
                 description: `Reason: ${order.dispute.reason}`,
                 icon: 'gavel'
             });
         }

         // Sort by date chronologically
         timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

         res.json({ success: true, timeline });
     } catch (error) {
         logger.error(`Trust Timeline Error: ${error.message}`);
         res.status(500).json({ success: false, message: 'Server error' });
     }
 };

 // Helper for icon mapping
 exports.getTrackingIcon = (status) => {
     const map = {
         'HUB_RECEIVED': 'warehouse',
         'IN_TRANSIT': 'flight',
         'OUT_FOR_DELIVERY': 'delivery_dining',
         'DELIVERED': 'check_circle'
     };
     return map[status] || 'local_shipping';
 };

exports.addTrackingEvent = async (req, res) => {
    try {
        const { orderId, status, location, description } = req.body;

        // 1. Fetch Order with Items to Verify Ownership/Role
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: { include: { store: true, images: true } } } } }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // 2. Authorization Check
        let isAuthorized = false;
        if (req.user.role === 'ADMIN') {
            isAuthorized = true;
        } else if (req.user.role === 'SELLER') {
            isAuthorized = order.items.some(item => item.product.store.sellerId === req.user.id);
        }

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'Not authorized to add tracking for this order' });
        }

        // 3. Create Tracking Event
        const event = await prisma.trackingEvent.create({
            data: {
                orderId,
                status,
                location: location || 'Warehouse',
                description: description || `Order updated to ${status}`
            }
        });

        // 4. Update Order status if it's a major status change
        // BUG-ORDER-01: Was writing status directly, bypassing canTransitionOrderStatus and the
        // PAID/DELIVERED seller-exclusion guard. A seller could POST tracking event with status: 'PAID'
        // to self-approve their own order.
        const majorStatuses = ['SHIPPED', 'HUB_RECEIVED', 'CANCELLED', 'DISPUTED'];
        // PAID and DELIVERED are intentionally excluded — only updateOrderStatus (admin-gated) can set these
        if (majorStatuses.includes(status)) {
            if (!canTransitionOrderStatus(order.status, status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status transition from ${order.status} to ${status}`
                });
            }
            await prisma.order.update({
                where: { id: orderId },
                data: { status }
            });
        } else if (['PAID', 'DELIVERED'].includes(status) && req.user.role !== 'ADMIN') {
            // Silently skip the status update but still record the tracking event
            logger.warn(`[TRACKING] Seller ${req.user.id} attempted to set order ${orderId} to ${status} via tracking event — blocked`);
        }

        logger.info(`Tracking event added: Order ${orderId}, Status ${status}`);

        res.status(201).json({ success: true, event });
    } catch (error) {
        logger.error(`Add Tracking Event Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// Create Direct (Decentralized) Order
exports.createDirectOrder = async (req, res) => {
    try {
        const { items, sellerName, shippingAddress, paymentMethod } = req.body;
        const buyerId = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided.' });
        }

        // 1. Verify Seller & Products
        const store = await prisma.store.findFirst({ where: { storeName: sellerName } });
        if (!store) return res.status(404).json({ success: false, message: 'Seller not found.' });

        let subtotal = 0;
        const orderItemsData = [];
        const purchasedProducts = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.id || item.productId } });
            if (!product || product.storeId !== store.id) {
                continue; // Skip items not belonging to this seller
            }

            // BUG-ORDER-03: Validate qty — client could send 0.001 or -5 to manipulate price
            const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
            if (product.stock < qty) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product "${product.title}" (available: ${product.stock})`
                });
            }

            const currentPrice = (product.isFlashSale && product.flashPrice)
                ? parseFloat(product.flashPrice)
                : parseFloat(product.price);

            subtotal += currentPrice * qty;
            orderItemsData.push({
                productId: product.id,
                quantity: qty,
                priceAtTime: currentPrice
            });
            purchasedProducts.push({
                id: product.id,
                quantity: qty,
                priceAtTime: currentPrice,
                isFlashSale: product.isFlashSale
            });
        }

        if (orderItemsData.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid items found for this seller.' });
        }

        // Simplistic shipping for direct orders (often handled in external gateway, but we track it)
        const shippingCost = 15.00;
        const taxRate = 0.08;
        const totalAmount = (subtotal + shippingCost) * (1 + taxRate);

        // 2. Create Order
        const order = await prisma.order.create({
            data: {
                buyerId,
                totalAmount,
                shippingCost,
                taxAmount: (subtotal + shippingCost) * taxRate,
                paymentMethod: paymentMethod || 'DIRECT_DECENTRALIZED',
                status: 'AWAITING_DIRECT_PAYMENT',
                sellerId: store.sellerId,
                items: { create: orderItemsData },
                shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress || {})
            }
        });

        for (const product of purchasedProducts) {
            await RecommendationService.trackUserInteraction(buyerId, product.id, 'PURCHASE', {
                source: 'direct_checkout',
                weight: Math.max(product.quantity, 1)
            });

            if (product.isFlashSale) {
                const flashDeal = await prisma.flashDeal.findFirst({
                    where: {
                        productId: product.id,
                        isActive: true,
                        endDate: { gt: new Date() }
                    },
                    orderBy: { endDate: 'asc' }
                });

                if (flashDeal) {
                    await flashDealService.trackDealConversion(
                        flashDeal.id,
                        buyerId,
                        product.priceAtTime * product.quantity,
                        { orderId: order.id, quantity: product.quantity }
                    );
                }
            }
        }

        // 3. Notify Hub for Tracking (Simulated)
        socketService.broadcastActivity(`🔗 NEW DIRECT ORDER: ${sellerName} has a new direct checkout request!`);

        res.status(201).json({ 
            success: true, 
            orderId: order.id,
            sellerBankDetails: {
                bankName: store.bankName,
                accountNumber: store.accountNumber,
                accountName: store.accountName,
                bankCode: store.bankCode
            }
        });

    } catch (error) {
        logger.error(`Create Direct Order Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Confirm receipt of order — releases escrow funds to seller
exports.confirmReceipt = async (req, res) => {
    try {
        const { orderId } = req.body;
        const buyerId = req.user.id;

        // Try to find legacy Order
        let order = await prisma.order.findUnique({ where: { id: orderId } });
        let isMarketplaceOrder = false;

        // If not found, try MarketplaceOrder
        if (!order) {
            const mo = await prisma.marketplaceOrder.findUnique({
                where: { id: orderId },
                include: { fulfillmentOrders: true }
            });
            if (mo) {
                order = mo;
                isMarketplaceOrder = true;
            }
        }

        // If not found, check PayAI Order
        if (!order) {
            const payaiOrder = await prisma.payAIOrder.findFirst({
                where: {
                    OR: [
                        { id: orderId },
                        { orderNumber: orderId }
                    ]
                }
            });
            if (payaiOrder) {
                if (payaiOrder.userId && payaiOrder.userId !== buyerId && req.user?.role !== 'ADMIN') {
                    return res.status(403).json({ success: false, message: 'Not authorized' });
                }
                const paypalPaymentService = require('../services/payai/paypalPaymentService');
                const releaseResult = await paypalPaymentService.releaseSellerPayout({
                    orderId: payaiOrder.id,
                    triggerSource: 'BUYER_CONFIRMATION'
                });
                return res.json({
                    success: true,
                    order: payaiOrder,
                    payout: releaseResult,
                    message: 'Receipt confirmed. Seller payout released in Naira (NGN).'
                });
            }
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.buyerId !== buyerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'HANDED_TO_COURIER'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order is not in a confirmable state' });
        }
        // Prevent double-release
        if (['RELEASED', 'DISPUTED'].includes(order.paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm receipt — payment is already ${order.paymentStatus.toLowerCase()}`
            });
        }

        const escrowLedgerService = require('../services/escrowLedgerService');

        if (isMarketplaceOrder) {
            // Update MarketplaceOrder
            await prisma.marketplaceOrder.update({
                where: { id: orderId },
                data: { status: 'COMPLETED', paymentStatus: 'RELEASED' }
            });

            // Update all FulfillmentOrders
            await prisma.fulfillmentOrder.updateMany({
                where: { marketplaceOrderId: orderId },
                data: { status: 'COMPLETED', paymentStatus: 'RELEASED' }
            });

            // Release escrow payments for each FulfillmentOrder
            const foIds = order.fulfillmentOrders.map(fo => fo.id);
            if (foIds.length > 0) {
                await prisma.escrowPayment.updateMany({
                    where: { fulfillmentOrderId: { in: foIds }, status: 'HELD' },
                    data: { status: 'RELEASED', releasedAt: new Date() }
                });

                for (const fo of order.fulfillmentOrders) {
                    try {
                        await escrowLedgerService.releaseToSeller({
                            orderId: fo.id,
                            buyerId: order.buyerId,
                            sellerId: fo.sellerId,
                            amount: fo.grandTotal,
                            triggerSource: 'BUYER_CONFIRMATION'
                        });
                    } catch (e) {
                        logger.error(`Escrow release error for FO ${fo.id}: ${e.message}`);
                    }
                }
            }
        } else {
            // Legacy Order logic
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'COMPLETED', paymentStatus: 'RELEASED' }
            });

            try {
                await prisma.escrowPayment.updateMany({
                    where: { orderId, status: 'HELD' },
                    data: { status: 'RELEASED', releasedAt: new Date() }
                });
                
                await escrowLedgerService.releaseToSeller({
                    orderId: order.id,
                    buyerId: order.buyerId,
                    sellerId: order.sellerId,
                    amount: order.totalAmount,
                    triggerSource: 'BUYER_CONFIRMATION'
                });
            } catch (e) { 
                logger.error(`Escrow release error in confirmReceipt: ${e.message}`);
            }
        }

        // Notify seller and emit events
        try {
            const notificationV2Service = require('../services/notificationV2Service');
            const orderEventService = require('../services/orderEventService');
            
            let sellerIds = [];
            if (isMarketplaceOrder) {
                sellerIds = order.fulfillmentOrders.map(fo => fo.sellerId).filter(Boolean);
            } else if (order.sellerId) {
                sellerIds = [order.sellerId];
            }
            
            for (const sId of sellerIds) {
                await notificationV2Service.notify(sId, {
                    type: 'ORDER_CONFIRMED',
                    title: '✅ Buyer Confirmed Receipt',
                    body: `Order #${orderId.slice(0, 8).toUpperCase()} has been confirmed. Funds will be released to your wallet.`,
                    linkUrl: '/seller/wallet'
                }).catch(() => {});
            }

            orderEventService.emitOrderUpdated({
                orderId,
                buyerId,
                sellerIds
            });
        } catch (e) { logger.error(`[OrderController] confirmReceipt emit error: ${e.message}`); }

        logger.info(`Buyer ${buyerId} confirmed receipt for Order ${orderId}`);
        res.json({ success: true, order });

    } catch (error) {
        logger.error(`Confirm Receipt Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Upload payment proof for bank transfer / manual payment orders
exports.uploadProofOnOrder = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const buyerId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.buyerId !== buyerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const proofUrl = `/uploads/${req.file.filename}`;
        const { transactionRef, bankName, accountNumber } = req.body;

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PENDING_VERIFICATION',
                proofUrl: proofUrl
            }
        });

        const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
        const seller = order.sellerId ? await prisma.user.findUnique({ where: { id: order.sellerId } }) : null;

        try {
            // Use an upsert in case the user re-uploads proof
            await prisma.paymentProof.upsert({
                where: { orderId: orderId },
                update: {
                    bankName: bankName || 'Direct Transfer',
                    accountNumber: accountNumber || '',
                    transactionRef: transactionRef || 'N/A',
                    proofImageUrl: proofUrl
                },
                create: {
                    orderId: orderId,
                    buyerId: buyerId,
                    buyerName: buyer?.fullName || 'Buyer',
                    sellerId: order.sellerId || '',
                    sellerName: seller?.storeName || seller?.fullName || 'Seller',
                    amount: order.totalAmount || 0,
                    currency: order.currency || 'USD',
                    bankName: bankName || 'Direct Transfer',
                    accountNumber: accountNumber || '',
                    transactionRef: transactionRef || 'N/A',
                    proofImageUrl: proofUrl
                }
            });
        } catch (e) {
            console.warn(`Could not create/update PaymentProof record: ${e.message}`);
        }

        // Notify seller to verify
        try {
            await prisma.notification.create({
                data: {
                    userId: order.sellerId,
                    title: '🧾 Payment Proof Uploaded',
                    body: `Buyer uploaded proof for Order #${orderId.slice(0, 8).toUpperCase()}. Please verify.`,
                    type: 'ORDER'
                }
            });
        } catch (e) { /* non-critical */ }

        logger.info(`Payment proof uploaded for Order ${orderId} by Buyer ${buyerId}`);
        res.json({ success: true, order: updated, proofUrl });

    } catch (error) {
        logger.error(`Upload Proof Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Approve a buyer's payment proof — marks order as PAID
exports.approvePaymentProof = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const sellerId = req.user.id;

        const order = await prisma.order.findUnique({ 
            where: { id: orderId },
            include: { items: true }
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.sellerId !== sellerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (!['PENDING_VERIFICATION'].includes(order.paymentStatus)) {
            return res.status(400).json({ success: false, message: 'No payment proof pending approval for this order' });
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
                status: 'PAID'
            },
            include: { items: true }
        });

        // Increment soldCount for products in the order
        for (const item of updated.items) {
            if (item.productId) {
                try {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { soldCount: { increment: item.quantity } }
                    });
                } catch (err) {
                    logger.error(`Failed to update soldCount for product ${item.productId}: ${err.message}`);
                }
            }
        }

        // Notify buyer
        try {
            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    title: '✅ Payment Approved',
                    body: `Your payment for Order #${orderId.slice(0, 8).toUpperCase()} has been verified. Your order is now being processed.`,
                    type: 'ORDER'
                }
            });
        } catch (e) { /* non-critical */ }

        logger.info(`Seller ${sellerId} approved payment proof for Order ${orderId}`);
        res.json({ success: true, order: updated });

    } catch (error) {
        logger.error(`Approve Payment Proof Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Reject a buyer's payment proof — reverts to PENDING
exports.rejectPaymentProof = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const { reason } = req.body;
        const sellerId = req.user.id;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.sellerId !== sellerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        // BUG-ORDER-05: Was missing state guard — seller could reject proof after order COMPLETED
        // or even after funds were already released, reverting paymentStatus to PENDING
        if (!['PENDING_VERIFICATION'].includes(order.paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'No payment proof pending rejection for this order'
            });
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PENDING',
                proofUrl: null
            }
        });

        // Notify buyer with rejection reason
        try {
            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    title: '❌ Payment Proof Rejected',
                    body: `Your payment proof for Order #${orderId.slice(0, 8).toUpperCase()} was rejected. ${reason ? `Reason: ${reason}` : 'Please re-upload a valid proof.'}`,
                    type: 'ORDER'
                }
            });
        } catch (e) { /* non-critical */ }

        logger.warn(`Seller ${sellerId} rejected payment proof for Order ${orderId}. Reason: ${reason}`);
        res.json({ success: true, order: updated });

    } catch (error) {
        logger.error(`Reject Payment Proof Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Request shipping address from buyer
exports.requestOrderAddress = async (req, res) => {
    try {
        const orderId = req.params.id;
        const sellerId = req.user.id;

        let order = await prisma.order.findUnique({
            where: { id: orderId }
        });
        
        let hasAddress = false;

        if (order) {
            if (order.sellerId !== sellerId) {
                return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            }
            hasAddress = !!order.shippingAddress;
        } else {
            order = await prisma.fulfillmentOrder.findUnique({
                where: { id: orderId },
                include: { marketplaceOrder: true }
            });
            if (!order || order.sellerId !== sellerId) {
                return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            }
            hasAddress = !!(order.marketplaceOrder && order.marketplaceOrder.shippingSnapshot);
        }

        if (hasAddress) {
            return res.status(400).json({ success: false, message: 'Order already has a shipping address' });
        }

        // Create notification for buyer
        const notification = await prisma.notification.create({
            data: {
                userId: order.buyerId,
                title: '📍 Shipping Address Required',
                body: `The seller has requested a shipping address for Order #${orderId.slice(0, 8).toUpperCase()}. Please submit it to proceed with processing.`,
                type: 'ACTION_REQUIRED',
                linkUrl: `/buyer/dashboard?tab=orders&action=provide_address&orderId=${orderId}`
            }
        });

        res.json({ success: true, message: 'Address request sent to buyer' });
    } catch (error) {
        logger.error(`Request Order Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Update shipping address for order
exports.updateOrderAddress = async (req, res) => {
    try {
        const orderId = req.params.id;
        const buyerId = req.user.id;
        const { shippingAddress } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }

        let order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (order) {
            if (order.buyerId !== buyerId) {
                return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            }
            const addressString = typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress);
            order = await prisma.order.update({
                where: { id: orderId },
                data: { shippingAddress: addressString }
            });
            
            await prisma.notification.create({
                data: {
                    userId: order.sellerId,
                    title: '📍 Address Provided',
                    body: `The buyer has provided the shipping address for Order #${orderId.slice(0, 8).toUpperCase()}.`,
                    type: 'ORDER'
                }
            });
            return res.json({ success: true, order, message: 'Shipping address updated successfully' });
        } else {
            // Check fulfillment order
            order = await prisma.fulfillmentOrder.findUnique({
                where: { id: orderId },
                include: { marketplaceOrder: true }
            });
            
            if (!order || order.buyerId !== buyerId) {
                return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            }
            
            const addressString = typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress);
            await prisma.marketplaceOrder.update({
                where: { id: order.marketplaceOrderId },
                data: { shippingSnapshot: addressString }
            });
            
            await prisma.notification.create({
                data: {
                    userId: order.sellerId,
                    title: '📍 Address Provided',
                    body: `The buyer has provided the shipping address for Order #${orderId.slice(0, 8).toUpperCase()}.`,
                    type: 'ORDER'
                }
            });
            return res.json({ success: true, order, message: 'Shipping address updated successfully' });
        }
    } catch (error) {
        logger.error(`Update Order Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
