const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// Add or update item in cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, variants } = req.body;
        logger.info(`addToCart called for product ${productId}`);
        const userId = req.user.id;
        const variantString = variants ? (typeof variants === 'string' ? variants : JSON.stringify(variants)) : null;

        // Validate product exists
        const product = await prisma.product.findUnique({
            where: { id: String(productId) },
            include: { store: true, images: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check product stock
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // 1. Get or Create Cart
        let cart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId }
            });
        }

        // 2. Check if item already exists (with same variants)
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: String(productId),
                variants: variantString
            }
        });

        if (existingItem) {
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: String(productId),
                    quantity: quantity,
                    variants: variantString
                }
            });
        }

        // Create Notification for the seller
        if (product.store && product.store.sellerId) {
            await prisma.notification.create({
                data: {
                    userId: product.store.sellerId,
                    type: 'CART_ADD',
                    title: 'Product Added to Cart',
                    body: `Someone just added ${product.title} to their cart!`,
                    linkUrl: `/seller/dashboard?userId=${userId}&productId=${productId}`
                }
            }).catch(err => logger.error(`Cart Notification Error: ${err.message}`));
        }

        // 3. Track wishlist conversion (if added to cart from wishlist)
        await prisma.wishlist.updateMany({
            where: { buyerId: userId, productId: String(productId), addedToCartAt: null },
            data: { addedToCartAt: new Date() }
        }).catch(() => {}); // ignore if no wishlist

        // 4. Return full cart for sync
        const fullCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: {
                        product: {
                            include: { store: true, images: true }
                        }
                    }
                }
            }
        });

        res.json({ success: true, cart: fullCart });

    } catch (error) {
        logger.error(`Add to Cart Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error adding to cart' });
    }
};

// Get user's cart
exports.getCart = async (req, res) => {
    logger.info('getCart called by user ' + req.user.id);
    try {
        const userId = req.user.id;
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { 
                                store: true, 
                                images: true,
                                flashDeals: {
                                    where: {
                                        isActive: true,
                                        startDate: { lte: new Date() },
                                        endDate: { gt: new Date() }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        res.json({ success: true, cart: cart || { items: [] } });
    } catch (error) {
        logger.error(`Get Cart Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error fetching cart' });
    }
};

// Remove item
exports.removeFromCart = async (req, res) => {
    try {
        const { productId, variants } = req.body;
        const userId = req.user.id;
        const variantString = variants ? (typeof variants === 'string' ? variants : JSON.stringify(variants)) : null;

        const cart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (cart) {
            await prisma.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                    productId: String(productId),
                    variants: variantString
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error(`Remove Cart Item Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error removing item' });
    }
};

// Sync local storage cart to backend (for login transition)
exports.syncCart = async (req, res) => {
    try {
        const { items } = req.body; // Array of { productId, quantity, variants }
        const userId = req.user.id;

        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) cart = await prisma.cart.create({ data: { userId } });

        for (const item of items) {
            const productId = String(item.productId);
            const variantString = item.variants ? (typeof item.variants === 'string' ? item.variants : JSON.stringify(item.variants)) : null;

            // Verify product exists before adding to cart to prevent foreign key violations
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) {
                logger.warn(`Sync Cart: Product ${productId} not found, skipping.`);
                continue;
            }

            // BUG-CART-03: No quantity/stock validation on sync — localStorage could carry
            // quantity: 99999 for a product with stock: 1. Now capped to available stock.
            const syncQty = Math.max(1, parseInt(item.quantity) || 1);
            if (product.stock < 1) {
                logger.warn(`Sync Cart: Product ${productId} is out of stock, skipping.`);
                continue;
            }
            const clampedQty = Math.min(syncQty, product.stock);

            const existing = await prisma.cartItem.findFirst({
                where: { cartId: cart.id, productId, variants: variantString }
            });

            if (existing) {
                await prisma.cartItem.update({
                    where: { id: existing.id },
                    data: { quantity: Math.min(Math.max(existing.quantity, clampedQty), product.stock) }
                });
            } else {
                await prisma.cartItem.create({
                    data: { cartId: cart.id, productId, quantity: clampedQty, variants: variantString }
                });
            }
        }

        const fullCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { product: { include: { store: true, images: true } } } } }
        });

        res.json({ success: true, cart: fullCart });
    } catch (error) {
        logger.error(`Sync Cart Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Sync failed' });
    }
};


exports.updateQuantity = async (req, res) => {
    try {
        const { productId, quantity, variants } = req.body;
        const userId = req.user.id;

        // BUG-CART-04: quantity <= 0 was accepted — negative values passed stock check
        // (product.stock < -5 is false) and stored invalid cart state.
        const parsedQty = parseInt(quantity);
        if (!Number.isInteger(parsedQty) || parsedQty < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
        }
        const variantString = variants ? (typeof variants === 'string' ? variants : JSON.stringify(variants)) : null;

        const cart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const product = await prisma.product.findUnique({ where: { id: String(productId) } });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: String(productId),
                variants: variantString
            }
        });

        if (!existingItem) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: quantity }
        });

        return res.json({ success: true });
    } catch (error) {
        logger.error('Error updating cart quantity: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Verify real-time prices and stock before checkout
exports.verifyCartPrices = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || items.length === 0) {
            return res.json({ success: true, hasChanges: false, changes: [] });
        }

        const changes = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: String(item.productId) },
                include: {
                    flashDeals: {
                        where: {
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gt: new Date() }
                        }
                    }
                }
            });

            if (!product) {
                changes.push({
                    productId: item.productId,
                    title: item.title,
                    type: 'removed',
                    message: 'This product is no longer available.'
                });
                continue;
            }

            if (product.stock < item.quantity) {
                changes.push({
                    productId: item.productId,
                    title: product.title,
                    type: 'stock',
                    available: product.stock,
                    message: `Only ${product.stock} left in stock.`
                });
            }

            let currentPrice = Number(product.price);
            if (product.isFlashSale && product.flashPrice && new Date() < new Date(product.flashEndsAt)) {
                currentPrice = Number(product.flashPrice);
            } else if (product.flashDeals && product.flashDeals.length > 0) {
                const activeDeal = product.flashDeals[0];
                currentPrice = Number((Number(product.price) * (1 - (Number(activeDeal.discount || 0) / 100))).toFixed(2));
            }

            if (currentPrice !== Number(item.price)) {
                changes.push({
                    productId: item.productId,
                    title: product.title,
                    type: 'price',
                    oldPrice: Number(item.price),
                    newPrice: currentPrice,
                    message: `Price changed from ₦${Number(item.price).toFixed(2)} to ₦${currentPrice.toFixed(2)}`
                });
            }
        }

        return res.json({ 
            success: true, 
            hasChanges: changes.length > 0, 
            changes 
        });

    } catch (error) {
        logger.error('Error verifying cart prices: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error verifying prices' });
    }
};

// AI Cart Optimizer
exports.optimizeCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await prisma.cart.findUnique({
            where: { userId },
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

        if (!cart || cart.items.length === 0) {
            return res.json({ success: true, message: 'Cart is empty, nothing to optimize.', savings: 0 });
        }

        let totalSavings = 0;
        let optimizationMessages = [];

        // 1. Hub Consolidation Savings
        // Calculate the number of distinct sellers.
        const sellerSet = new Set();
        cart.items.forEach(item => {
            if (item.product && item.product.store) {
                sellerSet.add(item.product.store.sellerId);
            }
        });

        // If there are multiple sellers, hub consolidation applies.
        if (sellerSet.size > 1) {
            const consolidationSavings = (sellerSet.size - 1) * 1500; // Mock ₦1500 saved per extra seller
            totalSavings += consolidationSavings;
            optimizationMessages.push(`• Hub consolidation saves ₦${consolidationSavings.toLocaleString()}`);
        }

        // 2. Coupon check
        // We'll simulate finding a global 10% coupon if total > 20,000
        const subtotal = cart.items.reduce((sum, item) => {
            return sum + (Number(item.product.price) * item.quantity);
        }, 0);

        if (subtotal > 20000) {
            const couponSavings = subtotal * 0.10; // 10% off
            totalSavings += couponSavings;
            optimizationMessages.push(`• Best available coupon (10% OFF) saves ₦${couponSavings.toLocaleString()}`);
        }

        // 3. Seller Alternative check
        // Mock finding a cheaper alternative for one of the items
        if (cart.items.length > 0) {
            const alternativeSavings = 490;
            totalSavings += alternativeSavings;
            optimizationMessages.push(`• Seller alternative for ${cart.items[0].product.title} saves ₦${alternativeSavings.toLocaleString()}`);
        }

        let finalMessage = "No optimizations found at this time.";
        if (totalSavings > 0) {
            finalMessage = `You can save ₦${totalSavings.toLocaleString()}:\n${optimizationMessages.join('\n')}`;
        }

        res.json({
            success: true,
            totalSavings,
            message: finalMessage
        });

    } catch (error) {
        logger.error(`Cart Optimization Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error during optimization' });
    }
};
