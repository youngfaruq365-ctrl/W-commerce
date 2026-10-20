const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');


// Stripe API Helper (No dependency version)
// Consolidated API Client (Replaces inline helpers)
const ApiClient = require('../utils/apiClient');

// Payment Wrappers for backward compatibility
// Payment Wrappers for backward compatibility
const stripeRequest = (endpoint, method, data, headers) => ApiClient.stripe(endpoint, method, data, headers);
const paystackRequest = (endpoint, method, data, headers) => ApiClient.paystack(endpoint, method, data, headers);

const exchangeRates = require('../utils/exchangeRates');
const { finalizeSubscription } = require('../services/subscriptionService');

// Helper to clear only purchased items from the cart
const checkoutService = require('../services/checkoutService');

async function clearPurchasedCartItems(userId, items) {
    try {
        const cart = await prisma.cart.findUnique({ where: { userId } });
        const purchasedProductIds = items.map(i => i.productId);
        if (cart && purchasedProductIds.length > 0) {
            await prisma.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                    productId: { in: purchasedProductIds }
                }
            });
            logger.info(`[PAYMENT] Cleared purchased items from Cart for User ${userId}`);
        }
    } catch (e) {
        logger.error(`[PAYMENT] Failed to clear cart items for User ${userId}: ${e.message}`);
    }
}

exports.createPaymentIntent = async (req, res) => {
    try {
        const { items, currency = 'usd', shippingAddress, isConsolidated, region = 'US', promoCode, gateway, gamificationReward } = req.body;
        const userId = req.user.id;
        const idempotencyKey = req.headers['idempotency-key'];

        // 1. Dry run to calculate amount and check stock before creating intent
        const { parentOrder: dryOrder, totalAmountUSD, isExistingOrder, sellerCount } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: gateway || 'CARD',
            initialStatus: 'PENDING',
            idempotencyKey,
            dryRun: true,
            gamificationReward
        });

        if (isExistingOrder && dryOrder.stripePaymentId) {
            return res.json({ success: true, provider: 'EXISTING', clientSecret: dryOrder.stripePaymentId, orderId: dryOrder.id, amountUSD: totalAmountUSD });
        }
        
        const primarySellerId = dryOrder.sellerId;
        const selectedGateway = gateway ? gateway.toUpperCase() : (currency === 'NGN' || process.env.DEFAULT_PROVIDER === 'PAYSTACK' ? 'PAYSTACK' : 'STRIPE');

        let providerResponse = null;
        let paymentReference = null;

        // 2. Initialize Intent
        if (selectedGateway === 'FLUTTERWAVE') {
            const amountInNaira = Math.round(totalAmountUSD * (currency === 'USD' ? exchangeRates.getRate('USD', 'NGN') : 1));
            // Reference will be generated after order commit
            providerResponse = { provider: 'FLUTTERWAVE', amount: amountInNaira };
        } else if (selectedGateway === 'PAYSTACK') {
            const amountInKobo = Math.round(totalAmountUSD * (currency === 'USD' ? exchangeRates.getRate('USD', 'NGN') : 1) * 100);
            const userEmail = req.user.email;
            let paystackData = {
                email: userEmail,
                amount: amountInKobo,
                currency: 'NGN',
                reference: 'GX-TEMP-' + Date.now(), // Temp reference, order ID unknown yet
                bearer: 'account',
                metadata: { userId: userId },
                callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5175'}/cart`
            };

            let transaction;
            let splitPaymentInitialized = false;

            if (primarySellerId && sellerCount === 1) {
                const store = await prisma.store.findFirst({ where: { sellerId: primarySellerId } });
                if (store && store.paystackSubaccountCode) {
                    const paystackSubaccountService = require('../services/paystackSubaccountService');
                    try {
                        transaction = await paystackSubaccountService.createSplitPayment({
                            email: userEmail,
                            amount: amountInKobo,
                            subaccountCode: store.paystackSubaccountCode,
                            metadata: { userId: userId, split_payment: true },
                            callbackUrl: paystackData.callback_url
                        });
                        paystackData.reference = transaction.reference;
                        splitPaymentInitialized = true;
                    } catch (splitErr) {
                        logger.error(`[PAYSTACK] Split payment failed to initialize, falling back: ${splitErr.message}`);
                    }
                }
            }

            if (!splitPaymentInitialized) {
                const response = await paystackRequest('/transaction/initialize', 'POST', paystackData);
                transaction = response.data;
            }
            paymentReference = paystackData.reference;
            providerResponse = { provider: 'PAYSTACK', reference: paymentReference, authorization_url: transaction.authorization_url, amount: totalAmountUSD };
        } else {
            if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
            const amountInCents = Math.round(totalAmountUSD * 100);
            const stripeHeaders = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};

            const intent = await stripeRequest('/payment_intents', 'POST', {
                amount: amountInCents,
                currency: currency.toLowerCase(),
                'metadata[userId]': userId,
                description: `GlobalX Order (Pending Commit)`
            }, stripeHeaders);
            
            paymentReference = intent.id;
            providerResponse = { provider: 'STRIPE', clientSecret: intent.client_secret, amountUSD: totalAmountUSD };
        }

        // 3. Commit order (decrements stock)
        const { parentOrder: order } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: gateway || 'CARD',
            initialStatus: 'PENDING',
            idempotencyKey
        });

        // 4. Update order with reference and provider metadata with orderId
        if (selectedGateway === 'FLUTTERWAVE') {
            paymentReference = 'FLW-' + order.id;
            providerResponse.reference = paymentReference;
            await prisma.order.update({ where: { id: order.id }, data: { stripePaymentId: paymentReference, paymentMethod: 'FLUTTERWAVE' } });
        } else if (selectedGateway === 'PAYSTACK') {
            // Update the intent metadata on paystack to have the orderId? Usually not possible for active link without new call.
            // But we can store orderId in DB.
            await prisma.order.update({ where: { id: order.id }, data: { stripePaymentId: paymentReference, paymentMethod: 'PAYSTACK' } });
        } else {
            // Update Stripe intent with orderId
            await stripeRequest(`/payment_intents/${paymentReference}`, 'POST', {
                'metadata[orderId]': order.id,
                description: `GlobalX Order #${order.id.substring(0, 8)}`
            });
            await prisma.order.update({ where: { id: order.id }, data: { stripePaymentId: paymentReference, paymentMethod: 'STRIPE' } });
        }
        
        providerResponse.orderId = order.id;
        res.json({ success: true, ...providerResponse });
    } catch (error) {
        logger.error(`Payment Intent Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Payment init failed', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.createBankTransferOrder = async (req, res) => {
    try {
        const { items, shippingAddress, isConsolidated, region = 'US', promoCode } = req.body;
        const userId = req.user.id;

        const { parentOrder: order, totalAmountUSD } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: 'BANK_TRANSFER',
            initialStatus: 'AWAITING_TRANSFER',
            gamificationReward: req.body.gamificationReward
        });

        // 4. Return Regional Bank Details
        const bankDetails = getBankDetails(region);

        await clearPurchasedCartItems(userId, items);

        res.json({
            success: true,
            orderId: order.id,
            totalAmountUSD,
            bankDetails,
            message: 'Bank transfer order created. Please upload proof of payment within 24 hours.'
        });
    } catch (error) {
        logger.error(`Bank Transfer Init Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to initialize bank transfer', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.payWithWallet = async (req, res) => {
    try {
        const { items, shippingAddress, isConsolidated, region = 'US', promoCode } = req.body;
        const userId = req.user.id;

        const result = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: 'WALLET',
            initialStatus: 'PAID',
            gamificationReward: req.body.gamificationReward
        });

        await clearPurchasedCartItems(userId, items);

        // Increment soldCount safely
        const orderItems = (result.parentOrder && Array.isArray(result.parentOrder.items))
            ? result.parentOrder.items
            : (Array.isArray(items) ? items : []);

        for (const item of orderItems) {
            const prodId = item.productId || item.id;
            const quantity = Number(item.quantity || item.qty || 1);
            if (prodId && quantity > 0) {
                await prisma.product.update({
                    where: { id: prodId },
                    data: { soldCount: { increment: quantity } }
                }).catch(err => {
                    logger.error(`Failed to update soldCount for wallet purchase: ${err.message}`);
                });
            }
        }

        res.json({
            success: true,
            orderId: result.parentOrder?.id,
            order: result.parentOrder,
            newBalance: result.updatedUser?.balance,
            message: 'Order placed successfully using wallet balance.'
        });

    } catch (error) {
        logger.error(`Wallet Payment Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message || 'Failed to process wallet payment', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.createCodOrder = async (req, res) => {
    try {
        const { items, shippingAddress, isConsolidated, region = 'NG', promoCode, gamificationReward } = req.body;
        const userId = req.user.id;

        const { parentOrder: order, totalAmountUSD } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: 'COD',
            initialStatus: 'PENDING',
            gamificationReward
        });

        await clearPurchasedCartItems(userId, items);

        res.json({
            success: true,
            orderId: order.id,
            order,
            totalAmountUSD,
            message: 'Cash on delivery order created successfully.'
        });
    } catch (error) {
        logger.error(`COD Order Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message || 'Failed to create COD order' });
    }
};

exports.createFlutterwaveIntent = async (req, res) => {
    req.body = { ...req.body, gateway: 'FLUTTERWAVE' };
    return exports.createPaymentIntent(req, res);
};

function getBankDetails(region) {
    switch (region) {
        case 'NG':
            return {
                bankName: 'Zenith Bank',
                accountName: 'GlobalX Marketplace Ltd',
                accountNumber: '1012233445',
                currency: 'NGN',
                instructions: 'Please include your Order ID in the transfer narration.'
            };
        case 'MENA':
            return {
                bankName: 'Emirates NBD',
                accountName: 'GlobalX Logistics DXB',
                accountNumber: 'AE0011223344556677',
                currency: 'AED',
                instructions: 'Use Swift/IBAN for faster processing.'
            };
        case 'UK':
            return {
                bankName: 'Barclays UK',
                accountName: 'GlobalX European Hub',
                sortCode: '20-00-00',
                accountNumber: '88776655',
                currency: 'GBP'
            };
        default:
            return {
                bankName: 'J.P. Morgan Chase',
                accountName: 'GlobalX Technologies LLC',
                routingNumber: '021000021',
                accountNumber: '9988776655',
                currency: 'USD'
            };
    }
}

// Upload Proof of Payment
exports.uploadPaymentProof = async (req, res) => {
    try {
        const { orderId, proofUrl } = req.body;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // BUG-PAY-03: Was missing ownership check — any authenticated buyer could upload
        // proof for any order, hijacking another buyer's payment verification flow.
        if (order.buyerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to upload proof for this order' });
        }

        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'PENDING_VERIFICATION',
                paymentStatus: 'PROOF_SUBMITTED',
                proofUrl: proofUrl,
                stripePaymentId: `TRANSFER_PROOF_${Date.now()}` // Use this as temporary ref
            }
        });

        // Log transaction as pending
        await prisma.transaction.create({
            data: {
                userId: req.user.id,
                type: 'PURCHASE',
                amount: order.totalAmount,
                currency: 'USD',
                status: 'PENDING',
                referenceId: orderId,
                description: `Bank Transfer Proof Uploaded. Pending Admin Review.`
            }
        });

        // Notify Seller via Socket
        if (order.sellerId) {
            const socketService = require('../services/socketService');
            const io = socketService.getIO();
            if (io) {
                io.to(order.sellerId).emit('payment_proof:new');
                io.to(order.sellerId).emit('new_notification');
            }
        }

        res.json({ success: true, message: 'Proof of payment uploaded successfully. Our team will verify it shortly.' });

    } catch (error) {
        logger.error(`Upload Proof Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to upload proof', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.getSellerProofs = async (req, res) => {
    try {
        const sellerId = req.user.id;
        
        const orders = await prisma.order.findMany({
            where: {
                sellerId: sellerId,
                proofUrl: { not: null }
            },
            include: {
                buyer: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const proofs = orders.map(order => ({
            id: order.id,
            orderId: order.id,
            buyerName: order.buyer ? order.buyer.fullName : 'Unknown Buyer',
            transactionRef: order.stripePaymentId || 'N/A',
            amount: order.totalAmount,
            status: ['PROOF_SUBMITTED', 'PENDING_VERIFICATION'].includes(order.paymentStatus) ? 'PENDING' : 
                    (order.paymentStatus === 'PENDING' || order.status === 'CANCELLED') ? 'REJECTED' : 'APPROVED',
            proofImageUrl: order.proofUrl
        }));

        res.json({ success: true, proofs });
    } catch (error) {
        logger.error(`Get Seller Proofs Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch proofs' });
    }
};

exports.verifyPaymentProof = async (req, res) => {
    try {
        const { proofId } = req.params;
        const { action, rejectReason } = req.body;
        const sellerId = req.user.id;

        const order = await prisma.order.findUnique({ where: { id: proofId } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.sellerId !== sellerId) return res.status(403).json({ success: false, message: 'Not authorized' });

        if (action === 'APPROVE') {
            await exports.finalizeOrder(order.id, order.stripePaymentId, order.totalAmount, order.buyerId, 'DIRECT_BANK');
            // Notify buyer
            try {
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        title: '✅ Payment Approved',
                        body: `Your payment for Order #${order.id.slice(0, 8).toUpperCase()} has been verified.`,
                        type: 'ORDER'
                    }
                });
            } catch (e) { /* non-critical */ }
            res.json({ success: true, message: 'Payment approved successfully.' });
        } else if (action === 'REJECT') {
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'PENDING',
                    proofUrl: null
                }
            });
            // Notify buyer
            try {
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        title: '❌ Payment Proof Rejected',
                        body: `Your payment proof for Order #${order.id.slice(0, 8).toUpperCase()} was rejected. ${rejectReason ? `Reason: ${rejectReason}` : 'Please re-upload a valid proof.'}`,
                        type: 'ORDER'
                    }
                });
            } catch (e) { /* non-critical */ }
            res.json({ success: true, message: 'Payment proof rejected. Buyer has been notified.' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid action' });
        }
    } catch (error) {
        logger.error(`Verify Proof Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to verify proof' });
    }
};

exports.createCodOrder = async (req, res) => {
    try {
        const { items, shippingAddress, isConsolidated, region = 'US', promoCode } = req.body;
        const userId = req.user.id;

        const { parentOrder: order, totalAmountUSD } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: 'COD',
            initialStatus: 'PENDING',
            gamificationReward: req.body.gamificationReward
        });

        await clearPurchasedCartItems(userId, items);

        res.json({
            success: true,
            orderId: order.id,
            totalAmountUSD,
            message: 'Cash on delivery order created successfully.'
        });
    } catch (error) {
        logger.error(`COD Order Init Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to create COD order', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.createFlutterwavePayment = async (req, res) => {
    try {
        const { items, currency = 'NGN', shippingAddress, isConsolidated, region = 'NG', promoCode } = req.body;
        const userId = req.user.id;

        const { parentOrder: order, totalAmountUSD } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: 'FLUTTERWAVE',
            initialStatus: 'PENDING',
            gamificationReward: req.body.gamificationReward
        });

        const reference = 'FLW-' + order.id;
        res.json({
            success: true,
            provider: 'FLUTTERWAVE',
            reference,
            orderId: order.id,
            amount: totalAmountUSD
        });
    } catch (error) {
        logger.error(`Flutterwave Payment Init Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to initialize Flutterwave payment', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};


// Real-time duty/tax estimation per region (Simulating Avalara/Tax API)
exports.calculateTax = async (req, res) => {
    try {
        const { subtotal, shipping, region } = req.body;

        // Apply Platform Discount (Consistent with Order Controller)
        const discount = (subtotal > 150) ? 10.00 : ((subtotal > 80) ? 5.00 : 0);

        // Standard tax rate lookup
        const rate = getTaxRate(region);

        // Tax calculated on discounted total + shipping
        const taxableAmount = Math.max(0, subtotal + shipping - discount);
        const tax = taxableAmount * rate;

        let breakdown = "Standard International Tax";
        if (region === 'EU') breakdown = `${(rate * 100).toFixed(0)}% VAT + Import Duties (DDP)`;
        if (region === 'UK') breakdown = `${(rate * 100).toFixed(0)}% VAT + Customs Entry Fee`;
        if (region === 'MENA') breakdown = `5% VAT + Local Hub Surcharge`;
        if (region === 'USA') breakdown = `State Sales Tax (Estimated Local Avg)`;
        if (region === 'NG') breakdown = `${(rate * 100).toFixed(0)}% VAT (Nigeria)`;

        logger.info(`[TAX] Region: ${region}, Rate: ${rate}, Discount: ${discount}, Total Tax: ${tax}`);

        res.json({
            success: true,
            taxAmount: tax,
            discount: discount,
            breakdown,
            service: 'GlobalX Integrated Tax Engine'
        });
    } catch (e) {
        logger.error(`Tax Calculation Error: ${e.message}`);
        res.status(500).json({ success: false, message: 'Tax calculation failed' });
    }
};

function getTaxRate(region) {
    switch (region) {
        case 'EU': return 0.21; // Avg VAT
        case 'UK': return 0.20;
        case 'MENA': return 0.05;
        case 'AFRICA': return 0.15;
        case 'NG': return 0.075; // Nigeria VAT 7.5%
        default: return 0.08; // US Avg
    }
}


// ============================================
// ESCROW MANAGEMENT (Core Business Logic)
// ============================================

/**
 * Release Escrow - Transfer funds from platform to seller.
 * Can be triggered by:
 *   1. Buyer confirming delivery
 *   2. 72-hour auto-release after delivery (cron)
 *   3. Admin manual release
 * 
 * Nigerian compliance: Uses Paystack Transfers API for bank payouts.
 */
exports.releaseEscrow = async (req, res) => {
    try {
        const { orderId, triggerSource = 'ADMIN_MANUAL' } = req.body;

        const result = await processEscrowRelease(orderId, triggerSource);

        if (!result.success) {
            return res.status(result.statusCode || 400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error(`Escrow Release Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Escrow release failed', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Buyer Confirms Delivery Ã¢Â†Â’ Triggers immediate escrow release.
 */
exports.confirmDelivery = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { escrowPayment: true }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.buyerId !== userId) return res.status(403).json({ success: false, message: 'Not your order' });

        // Can only confirm if order is DELIVERED or SHIPPED (buyer saying "I got it")
        if (!['DELIVERED', 'SHIPPED', 'HUB_RECEIVED'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Cannot confirm delivery for order in ${order.status} status.` });
        }

        // Update order to DELIVERED + mark delivery timestamp
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'DELIVERED',
                deliveredAt: new Date()
            }
        });

        // Create tracking event
        await prisma.trackingEvent.create({
            data: {
                orderId,
                status: 'DELIVERY_CONFIRMED',
                location: 'Buyer Confirmed',
                description: 'Buyer confirmed receipt of package.'
            }
        });

        logger.info(`[ESCROW] Buyer ${userId} confirmed delivery for Order ${orderId}. Releasing funds.`);

        // Immediately release escrow
        const releaseResult = await processEscrowRelease(orderId, 'BUYER_CONFIRM');

        res.json({
            success: true,
            message: 'Delivery confirmed. Seller payment is being processed.',
            escrowStatus: releaseResult.success ? 'RELEASED' : 'RELEASE_PENDING',
            sellerAmount: releaseResult.sellerAmount || null
        });

    } catch (error) {
        logger.error(`Confirm Delivery Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to confirm delivery' });
    }
};

/**
 * Internal: Process escrow release for an order.
 * Calculates commission, initiates Paystack Transfer, updates records.
 * Called by: confirmDelivery, releaseEscrow, cron auto-release.
 */
async function processEscrowRelease(orderId, triggerSource = 'SYSTEM_AUTO') {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            escrowPayment: true,
            items: {
                include: {
                    product: {
                        include: { store: true }
                    }
                }
            }
        },
    });

    if (!order) return { success: false, statusCode: 404, message: 'Order not found' };

    // Prevent double-release
    if (order.paymentStatus === 'RELEASED') {
        return { success: true, message: 'Funds already released', sellerAmount: Number(order.sellerAmount) };
    }

    if (order.paymentStatus === 'DISPUTED') {
        return { success: false, statusCode: 400, message: 'Order is under dispute. Admin must resolve before release.' };
    }

    if (order.paymentStatus !== 'HELD') {
        return { success: false, statusCode: 400, message: `Cannot release escrow. Current payment status: ${order.paymentStatus}` };
    }

    // Calculate amounts
    const totalAmount = Number(order.totalAmount);
    const COMMISSION_RATE = Number(order.commissionRate) || parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');
    const commissionAmount = Number(order.commissionAmount) || (totalAmount * COMMISSION_RATE);
    const sellerAmount = Number(order.sellerAmount) || (totalAmount - commissionAmount);

    // Determine seller
    const sellerIds = [...new Set(order.items.map(item => item.product?.store?.sellerId).filter(Boolean))];
    const primarySellerId = order.sellerId || (sellerIds.length === 1 ? sellerIds[0] : null);

    if (!primarySellerId) {
        logger.error(`[ESCROW] No seller found for Order ${orderId}`);
        return { success: false, statusCode: 400, message: 'No seller identified for this order' };
    }

    // Try Paystack Transfer
    let transferResult = null;
    try {
        const paystackService = require('../services/paystackSubaccountService');
        const store = await prisma.store.findFirst({ where: { sellerId: primarySellerId } });

        if (store?.paystackRecipientCode) {
            // Assume sellerAmount is already in the platform's native currency (NGN)
            // Just convert to kobo.
            const amountInKobo = Math.round(sellerAmount * 100);

            transferResult = await paystackService.initiateTransfer({
                recipientCode: store.paystackRecipientCode,
                amount: amountInKobo,
                reason: `GlobalX Escrow Release - Order #${orderId.substring(0, 8)}`,
                reference: `GX-ESC-${orderId.substring(0, 12)}-${Date.now()}`
            });

            logger.info(`[ESCROW] Ã°ÂŸÂ’Â¸ Paystack transfer initiated: ${transferResult.transfer_code || 'pending'}`);
        } else {
            logger.warn(`[ESCROW] No Paystack recipient for seller ${primarySellerId}. Crediting wallet balance.`);
        }
    } catch (transferErr) {
        logger.error(`[ESCROW] Paystack transfer failed: ${transferErr.message}. Falling back to wallet credit.`);
    }

    const now = new Date();

    // Update Order
    await prisma.order.update({
        where: { id: orderId },
        data: {
            paymentStatus: 'RELEASED',
            status: order.status === 'DELIVERED' ? 'COMPLETED' : order.status,
            escrowReleasedAt: now
        }
    });

    // Update EscrowPayment record
    if (order.escrowPayment) {
        await prisma.escrowPayment.update({
            where: { id: order.escrowPayment.id },
            data: {
                status: 'RELEASED',
                releasedAt: now,
                releaseTriggeredBy: triggerSource,
                payoutReference: transferResult?.transfer_code || null,
                payoutMethod: transferResult ? 'PAYSTACK_TRANSFER' : 'WALLET_CREDIT'
            }
        });
    }

    // Credit seller — if WALLET payment, use escrowLedgerService which also releases the WalletHold
    if (order.paymentMethod === 'WALLET') {
        try {
            const escrowLedgerService = require('../services/escrowLedgerService');
            await escrowLedgerService.releaseToSeller({
                orderId,
                buyerId:       order.buyerId,
                sellerId:      primarySellerId,
                amount:        order.totalAmount,
                triggerSource,
            });
            logger.info(`[ESCROW] WalletHold released and seller credited via escrowLedgerService for Order ${orderId}`);
        } catch (err) {
            logger.error(`[ESCROW] escrowLedgerService.releaseToSeller failed: ${err.message}. Falling back to direct credit.`);
            // Fallback: direct wallet credit
            if (!transferResult) {
                await prisma.user.update({
                    where: { id: primarySellerId },
                    data: { balance: { increment: sellerAmount } }
                });
            }
        }
    } else {
        // Non-wallet payment (Paystack, bank transfer, etc.)
        if (!transferResult) {
            await prisma.user.update({
                where: { id: primarySellerId },
                data: { balance: { increment: sellerAmount } }
            });
        }
    }

    // Log Transaction: ESCROW_RELEASE for seller
    await prisma.transaction.create({
        data: {
            userId: primarySellerId,
            type: 'ESCROW_RELEASE',
            amount: sellerAmount,
            currency: 'USD',
            status: transferResult ? 'PENDING' : 'COMPLETED',
            referenceId: orderId,
            description: `Escrow released (${triggerSource}). Commission: $${commissionAmount.toFixed(2)} (${(COMMISSION_RATE * 100).toFixed(0)}%). ${transferResult ? `Transfer: ${transferResult.transfer_code}` : 'Credited to wallet.'}`
        }
    });

    // Log Transaction: COMMISSION for platform
    await prisma.transaction.create({
        data: {
            userId: primarySellerId,
            type: 'PURCHASE',
            amount: commissionAmount,
            currency: 'USD',
            status: 'COMPLETED',
            referenceId: orderId,
            description: `Platform commission (${(COMMISSION_RATE * 100).toFixed(0)}%) on Order #${orderId.substring(0, 8)}`
        }
    });

    // Notify seller
    await prisma.notification.create({
        data: {
            userId: primarySellerId,
            title: 'Ã°ÂŸÂ’Â° Payment Released!',
            body: `$${sellerAmount.toFixed(2)} from Order #${orderId.substring(0, 8)} has been released to you${transferResult ? ' via bank transfer' : ' to your wallet'}. Platform fee: $${commissionAmount.toFixed(2)}.`,
            type: 'INFO',
            linkUrl: 'seller-dashboard.html'
        }
    });

    logger.info(`[ESCROW] Released $${sellerAmount.toFixed(2)} to seller ${primarySellerId} for Order ${orderId} (Trigger: ${triggerSource})`);

    return { success: true, message: 'Escrow released successfully' };
}

/**
 * Escrow Release Logic (Multi-Seller / FulfillmentOrder Architecture)
 * - Releases funds for a single seller's fulfillment order.
 * - Called by cron or admin manually.
 */
async function processFulfillmentEscrowRelease(fulfillmentOrderId, triggerSource = 'SYSTEM_AUTO') {
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        include: {
            escrowPayment: true,
            items: {
                include: {
                    product: {
                        include: { store: true }
                    }
                }
            }
        }
    });

    if (!fo) return { success: false, statusCode: 404, message: 'FulfillmentOrder not found' };

    // Prevent double-release
    if (fo.paymentStatus === 'RELEASED') {
        return { success: true, message: 'Funds already released', sellerAmount: Number(fo.sellerAmount) };
    }

    if (fo.paymentStatus === 'DISPUTED') {
        return { success: false, statusCode: 400, message: 'Order is under dispute. Admin must resolve before release.' };
    }

    if (fo.paymentStatus !== 'HELD') {
        return { success: false, statusCode: 400, message: `Cannot release escrow. Current payment status: ${fo.paymentStatus}` };
    }

    // Calculate amounts
    const totalAmount = Number(fo.grandTotal);
    const COMMISSION_RATE = Number(fo.commissionRate) || parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');
    const commissionAmount = Number(fo.commissionAmount) || (totalAmount * COMMISSION_RATE);
    const sellerAmount = Number(fo.sellerAmount) || (totalAmount - commissionAmount);

    const primarySellerId = fo.sellerId;

    if (!primarySellerId) {
        logger.error(`[ESCROW] No seller found for FO ${fulfillmentOrderId}`);
        return { success: false, statusCode: 400, message: 'No seller identified for this order' };
    }

    // Try Paystack Transfer
    let transferResult = null;
    try {
        const paystackService = require('../services/paystackSubaccountService');
        const store = await prisma.store.findFirst({ where: { sellerId: primarySellerId } });

        if (store?.paystackRecipientCode) {
            const amountInKobo = Math.round(sellerAmount * 100);

            transferResult = await paystackService.initiateTransfer({
                recipientCode: store.paystackRecipientCode,
                amount: amountInKobo,
                reason: `GlobalX Escrow Release - FO #${fulfillmentOrderId.substring(0, 8)}`,
                reference: `GX-FO-ESC-${fulfillmentOrderId.substring(0, 10)}-${Date.now()}`
            });

            logger.info(`[ESCROW] 💸 Paystack transfer initiated: ${transferResult.transfer_code || 'pending'}`);
        } else {
            logger.warn(`[ESCROW] No Paystack recipient for seller ${primarySellerId}. Crediting wallet balance.`);
        }
    } catch (transferErr) {
        logger.error(`[ESCROW] Paystack transfer failed: ${transferErr.message}. Falling back to wallet credit.`);
    }

    const now = new Date();

    // Update FulfillmentOrder
    await prisma.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data: {
            paymentStatus: 'RELEASED',
            status: fo.status === 'DELIVERED' ? 'COMPLETED' : fo.status
        }
    });

    // Update EscrowPayment record
    if (fo.escrowPayment) {
        await prisma.escrowPayment.update({
            where: { id: fo.escrowPayment.id },
            data: {
                status: 'RELEASED',
                releasedAt: now,
                releaseTriggeredBy: triggerSource,
                payoutReference: transferResult?.transfer_code || null,
                payoutMethod: transferResult ? 'PAYSTACK_TRANSFER' : 'WALLET_CREDIT'
            }
        });
    }

    // Credit seller balance
    if (!transferResult) {
        await prisma.user.update({
            where: { id: primarySellerId },
            data: { balance: { increment: sellerAmount } }
        });
    }

    // Log Transaction
    await prisma.transaction.create({
        data: {
            userId: primarySellerId,
            type: 'ESCROW_RELEASE',
            amount: sellerAmount,
            currency: 'USD',
            status: transferResult ? 'PENDING' : 'COMPLETED',
            referenceId: fulfillmentOrderId,
            description: `Escrow released (${triggerSource}). Commission: $${commissionAmount.toFixed(2)} (${(COMMISSION_RATE * 100).toFixed(0)}%). ${transferResult ? `Transfer: ${transferResult.transfer_code}` : 'Credited to wallet.'}`
        }
    });

    await prisma.transaction.create({
        data: {
            userId: primarySellerId,
            type: 'PURCHASE',
            amount: commissionAmount,
            currency: 'USD',
            status: 'COMPLETED',
            referenceId: fulfillmentOrderId,
            description: `Platform commission (${(COMMISSION_RATE * 100).toFixed(0)}%) on FO #${fulfillmentOrderId.substring(0, 8)}`
        }
    });

    // Notify seller
    await prisma.notification.create({
        data: {
            userId: primarySellerId,
            title: '💰 Payment Released!',
            body: `$${sellerAmount.toFixed(2)} from Order #${fulfillmentOrderId.substring(0, 8)} has been released to you${transferResult ? ' via bank transfer' : ' to your wallet'}. Platform fee: $${commissionAmount.toFixed(2)}.`,
            type: 'INFO',
            linkUrl: 'seller-dashboard.html'
        }
    });

    logger.info(`[ESCROW] Released $${sellerAmount.toFixed(2)} to seller ${primarySellerId} for FO ${fulfillmentOrderId} (Trigger: ${triggerSource})`);

    return { success: true, message: 'Escrow released successfully' };
}
            
async function finalizeOrder(orderId, reference, amount, userId, provider = 'PAYSTACK') {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!order) return;

        const updatedOrder = await prisma.order.updateMany({
            where: { id: orderId, paymentStatus: 'PENDING' },
            data: {
                paymentStatus: 'PAID',
                status: 'PROCESSING',
                stripePaymentId: reference,
                paymentMethod: provider,
                escrowReleaseAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        if (updatedOrder.count === 0) return;

        // Cascade to subOrders
        await prisma.order.updateMany({
            where: { parentOrderId: orderId },
            data: {
                paymentStatus: 'PAID',
                status: 'PROCESSING'
            }
        });

        await prisma.transaction.create({
            data: {
                userId: order.buyerId || userId,
                type: 'PURCHASE',
                amount: Number(amount) || 0,
                currency: 'NGN',
                status: 'COMPLETED',
                referenceId: orderId,
                description: `Payment for Order #${orderId.substring(0, 8)} via ${provider}`
            }
        });

        // Clear Cart
        await clearPurchasedCartItems(order.buyerId || userId, order.items);
        
        // Notify Seller and Update Dashboard Events
        const notificationV2 = require('../services/notificationV2Service');
        const socketService = require('../services/socketService');
        const analyticsController = require('./analyticsController');
        const io = socketService.getIO();

        // Find all sellers involved (parent and child orders)
        const childOrders = await prisma.order.findMany({ where: { parentOrderId: orderId } });
        const sellerIdsToNotify = new Set();
        if (order.sellerId) sellerIdsToNotify.add(order.sellerId);
        for (const child of childOrders) {
            if (child.sellerId) sellerIdsToNotify.add(child.sellerId);
        }

        for (const sId of sellerIdsToNotify) {
            await notificationV2.notify(sId, {
                type: 'ORDER_PAID',
                title: 'New Paid Order',
                body: `Payment received for order #${orderId.substring(0,8)}. Please prepare for shipping.`,
                actionUrl: `/seller/orders`
            }).catch(() => {});

            if (io) {
                io.to(sId).emit('seller_dashboard_update');
                io.to(sId).emit('order:updated', { orderId });
            }

            if (analyticsController.recordEvent) {
                await analyticsController.recordEvent(sId, 'SALE', { orderId, amount });
            }
        }

        // Notify Buyer and Admin
        if (io) {
            io.to(order.buyerId || userId).emit('order:updated', { orderId });
            io.to('role:ADMIN').emit('admin_dashboard_update');
        }

        // Increment soldCount for products in the order
        for (const item of order.items) {
            if (item.productId && item.quantity) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { soldCount: { increment: item.quantity } }
                }).catch(err => {
                    logger.error(`Failed to update soldCount for product ${item.productId}: ${err.message}`);
                });
            }
        }
        
    } catch (e) {
        logger.error(`[PAYMENT] Finalize error for ${orderId}: ${e.message}`);
    }
}

exports.finalizeOrder = finalizeOrder;

/**
 * Verify Paystack Transaction (Manual verification endpoint)
 */
exports.verifyTransaction = async (req, res) => {
    try {
        const { reference } = req.params;

        if (reference.startsWith('WCOM-MNF-')) {
            const monnifyController = require('./monnifyController');
            return monnifyController.verifyMonnifyTransaction(req, res);
        }

        const paystackResponse = await paystackRequest(`/transaction/verify/${reference}`);

        if (paystackResponse.status && paystackResponse.data) {
            const data = paystackResponse.data;

            if (data.status === 'success') {
                // BUG-PAY-02: Was using data.metadata.userId directly — attacker could forge
                // metadata.userId to credit a subscription/order to another user's account.
                // Now: re-derive userId from the order in the DB instead of trusting metadata.
                const metaType = data.metadata?.type;
                let userId = null;
                let actualOrderId = null;

                if (metaType === 'ACCESS_FEE' || metaType === 'PRO_BUYER_SUBSCRIPTION') {
                    // For subscription payments, find the user via their email (Paystack customer)
                    const customerEmail = data.customer?.email;
                    if (customerEmail) {
                        const userRecord = await prisma.user.findUnique({ where: { email: customerEmail } });
                        userId = userRecord?.id || null;
                    }
                } else {
                    // For order payments, look up the order by reference
                    const orderId = data.metadata?.orderId || reference.replace('GX-', '');
                    
                    const orConditions = [];
                    if (orderId && orderId !== reference && !orderId.startsWith('TEMP-')) {
                        orConditions.push({ id: orderId });
                    }
                    if (reference) {
                        orConditions.push({ stripePaymentId: reference });
                    }

                    const orderRecord = await prisma.order.findFirst({
                        where: { OR: orConditions },
                        select: { id: true, buyerId: true }
                    });
                    userId = orderRecord?.buyerId || null;
                    actualOrderId = orderRecord?.id || orderId;
                }

                if (!userId) {
                    logger.warn(`[verifyTransaction] Could not resolve userId for ref ${reference} — skipping finalization`);
                    return res.json({ success: false, message: 'Could not verify payment owner' });
                }

                if (metaType === 'ACCESS_FEE') {
                    await finalizeAccessFee(userId, reference, data.amount / 100, 'PAYSTACK');
                } else if (metaType === 'PRO_BUYER_SUBSCRIPTION') {
                    const { finalizeSubscription } = require('../services/subscriptionService');
                    await finalizeSubscription(userId, reference, data.amount / 100, 'PAYSTACK', 'MONTHLY');
                } else {
                    await finalizeOrder(actualOrderId, reference, data.amount / 100, userId);
                }

                let finalizedOrder = null;
                if (actualOrderId && metaType !== 'ACCESS_FEE' && metaType !== 'PRO_BUYER_SUBSCRIPTION') {
                    finalizedOrder = await prisma.order.findUnique({
                        where: { id: actualOrderId },
                        include: { items: true }
                    });
                }

                res.json({
                    success: true,
                    status: 'success',
                    message: 'Payment verified successfully',
                    data: paystackResponse.data,
                    order: finalizedOrder
                });
            } else {
                const orderId = data.metadata?.orderId || reference.replace('GX-', '');
                await checkoutService.cancelAndRestoreOrder({
                    orderId: orderId && !orderId.startsWith('TEMP-') ? orderId : undefined,
                    reference
                });

                res.json({
                    success: false,
                    cancelled: true,
                    message: 'Payment cancelled or not completed. Product stock has been restored.',
                    status: data.status
                });
            }
        } else {
            throw new Error(paystackResponse.message || 'Verification failed');
        }
    } catch (error) {
        logger.error(`Paystack Verification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Verification failed', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Cancel a pending order (e.g. buyer closed or cancelled payment gateway) and immediately restore stock
 */
exports.cancelPendingPayment = async (req, res) => {
    try {
        const { orderId, reference } = req.body;
        const userId = req.user?.id;
        if (!orderId && !reference) {
            return res.status(400).json({ success: false, message: 'orderId or reference is required' });
        }
        const result = await checkoutService.cancelAndRestoreOrder({ orderId, reference, userId });
        res.json(result);
    } catch (error) {
        logger.error(`[PAYMENT] Cancel Pending Payment Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to cancel pending payment', error: error.message });
    }
};

/**
 * Refund a Payment via Paystack
 */
exports.processRefund = async (req, res) => {
    try {
        const { orderId, amount, reason } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || !order.stripePaymentId) {
            return res.status(404).json({ success: false, message: 'Order or Paystack Reference not found' });
        }

        const refundData = {
            transaction: order.stripePaymentId, // This is the Paystack reference
            amount: amount ? Math.round(amount * 100) : undefined, // Amount in kobo
            merchant_note: reason || 'Customer requested refund'
        };

        const paystackResponse = await paystackRequest('/refund', 'POST', refundData);

        if (paystackResponse.status) {
            logger.info(`[REFUND] Processed for Order ${orderId}: ${paystackResponse.data.id}`);

            // Update Order to REFUNDED (or partially refunded)
            await prisma.order.update({
                where: { id: orderId },
                data: { status: amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED' }
            });

            res.json({ success: true, refundId: paystackResponse.data.id });
        } else {
            throw new Error(paystackResponse.message || 'Refund failed');
        }
    } catch (error) {
        logger.error(`Paystack Refund Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Refund failed', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Currency Conversion Helper
 * In production, this should fetch from an external API (e.g. exchangerate-api.com)
 * For now, we use a robust benchmark for NGN.
 */
// getExchangeRate is now imported from exchangeRates utility at the top of the file


// --- Platform Access Fee Logic ---

exports.initiateAccessPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currency = 'USD', tier = 'YEARLY', paymentMethod = 'CARD' } = req.body;

        let amountUSD = tier === 'MONTHLY' ? 0.99 : 2.50;

        // 1. Handle Bank Transfer (Create Order for Manual Verification)
        if (paymentMethod === 'BANK_TRANSFER') {
            const productTitle = `GlobalX ${tier === 'MONTHLY' ? 'Monthly' : 'Yearly'} Access Pass`;

            // Create a pseudo-order for this access fee, tagged as SUBSCRIPTION
            const order = await prisma.order.create({
                data: {
                    buyerId: userId,
                    totalAmount: amountUSD,
                    shippingCost: 0,
                    taxAmount: 0,
                    status: 'AWAITING_TRANSFER',
                    paymentMethod: 'BANK_TRANSFER',
                    shippingAddress: 'N/A (Digital Subscription)',
                    orderType: 'SUBSCRIPTION'
                }
            });

            // Determine region for bank details based on currency
            let region = 'US';
            if (currency === 'NGN') region = 'NG';
            else if (currency === 'AED') region = 'MENA';
            else if (currency === 'GBP') region = 'UK';

            const bankDetails = getBankDetails(region);

            return res.json({
                success: true,
                provider: 'BANK_TRANSFER',
                orderId: order.id,
                amount: amountUSD,
                currency: currency,
                bankDetails: bankDetails,
                instructions: 'Please transfer the exact amount and upload the proof.'
            });
        }

        // 2. Handle Online Payment (Stripe/Paystack)
        // Determine Provider based on currency preference
        const isPaystack = currency === 'NGN' || process.env.DEFAULT_PROVIDER === 'PAYSTACK';

        if (isPaystack) {
            const rate = exchangeRates.getRate('USD', 'NGN');
            const amountInKobo = Math.round(amountUSD * rate * 100);

            // Unique reference for Access Fee
            const reference = 'GX-ACCESS-' + Date.now();

            const paystackData = {
                email: req.user.email,
                amount: amountInKobo,
                currency: 'NGN',
                reference: reference,
                metadata: {
                    userId: userId,
                    type: 'ACCESS_FEE',
                    subscriptionTier: tier
                },
                callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5175'}/access-success.html`
            };

            // Call Paystack
            const transaction = await paystackRequest('/transaction/initialize', 'POST', paystackData);

            return res.json({
                success: true,
                provider: 'PAYSTACK',
                reference: reference,
                authorization_url: transaction.data.authorization_url,
                amount: amountInKobo / 100,
                currency: 'NGN'
            });

        } else {
            // Stripe
            if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");

            const amountInCents = Math.round(amountUSD * 100);

            // Create Stripe Intent
            const postData = {
                amount: amountInCents,
                currency: currency.toLowerCase(),
                'metadata[userId]': userId,
                'metadata[type]': 'ACCESS_FEE',
                'metadata[subscriptionTier]': tier,
                description: `GlobalX ${tier.charAt(0) + tier.slice(1).toLowerCase()} Access Fee`
            };

            const intent = await stripeRequest('/payment_intents', 'POST', postData);

            res.json({
                success: true,
                provider: 'STRIPE',
                clientSecret: intent.client_secret,
                amount: amountUSD,
                currency: currency
            });
        }

    } catch (error) {
        logger.error(`Access Fee Init Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Payment init failed', error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

/**
 * Access Fee Finalization Helper
 */
async function finalizeAccessFee(userId, paymentRef, amount, provider, tier = 'YEARLY') {
    try {
        await finalizeSubscription(userId, paymentRef, amount, provider, tier);
    } catch (e) {
        logger.error(`[PAYMENT] Failed to finalize access fee handler: ${e.message}`);
    }
}

// Make helper available globally for webhook call if needed
exports.finalizeAccessFee = finalizeAccessFee;

exports.requestPayout = async (req, res) => {
    try {
        const { amount, method = 'BANK_TRANSFER' } = req.body;
        const sellerId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const payout = await prisma.payout.create({
            data: {
                sellerId,
                amount,
                method,
                status: 'PENDING'
            }
        });

        res.json({ success: true, message: 'Payout requested successfully', payout });
    } catch (error) {
        logger.error(`Payout Request Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to request payout' });
    }
};

exports.getPayouts = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const payouts = await prisma.payout.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, payouts });
    } catch (error) {
        logger.error(`Get Payouts Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
    }
};

exports.handleWebhook = async (req, res) => {
    // Forward to the V2 webhook handler which has full HMAC verification,
    // idempotency, and MarketplaceOrder + legacy Order support.
    // express.raw() is NOT applied to this legacy route, so we reconstruct
    // the raw buffer from the already-parsed body.
    try {
        const paymentV2Service = require('../services/paymentV2Service');
        const rawBody   = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
        const signature = req.headers['x-paystack-signature'];

        // Always 200 first (Paystack retries on non-2xx)
        res.sendStatus(200);

        const result = await paymentV2Service.handlePaystackWebhook(rawBody, signature);
        if (!result.ok) {
            logger.warn(`[Webhook/legacy] ${result.reason}`);
        }
    } catch (error) {
        logger.error(`[Webhook/legacy] Error: ${error.message}`);
        if (!res.headersSent) res.sendStatus(200);
    }
};

exports.processEscrowRelease = processEscrowRelease;
exports.processFulfillmentEscrowRelease = processFulfillmentEscrowRelease;






