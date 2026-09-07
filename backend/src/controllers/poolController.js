const prisma = require('../utils/prismaClient');
const socketService = require('../services/socketService');
const logger = require('../utils/logger');

// Create a new Pool
exports.createPool = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, title, targetSize, poolPrice, durationDays } = req.body;

        if (!productId || !title || !targetSize || !poolPrice || !durationDays) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Verify product ownership
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });

        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.store.sellerId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        // Check if pool already exists
        const existingPool = await prisma.pool.findUnique({ where: { productId } });
        if (existingPool) {
            return res.status(400).json({ success: false, message: 'A pool for this product already exists' });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays));

        const pool = await prisma.pool.create({
            data: {
                productId,
                title,
                targetSize: parseInt(targetSize),
                minBuyIn: parseFloat(poolPrice),
                currentSize: 0,
                expiresAt,
                status: 'ACTIVE'
            }
        });

        res.status(201).json({ success: true, pool });

    } catch (error) {
        logger.error(`Create Pool Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Join a Pool
exports.joinPool = async (req, res) => {
    try {
        const userId = req.user.id;
        const { poolId } = req.body;

        if (!poolId) {
            return res.status(400).json({ success: false, message: 'Pool ID is required' });
        }

        // Get pool with product and store info
        const pool = await prisma.pool.findUnique({
            where: { id: poolId },
            include: {
                product: {
                    include: {
                        store: {
                            include: {
                                user: true // The seller
                            }
                        }
                    }
                },
                participants: true
            }
        });

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        if (pool.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'This pool is no longer accepting participants' });
        }

        // Check if user already joined (Primary Guard)
        const alreadyJoined = await prisma.poolParticipant.findUnique({
            where: {
                poolId_userId: {
                    poolId: poolId,
                    userId: userId
                }
            }
        });

        if (alreadyJoined) {
            return res.status(400).json({ success: false, message: 'You are already a member of this pool' });
        }

        // Get buyer info
        const buyer = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Add participant (Secondary Guard via Unique Constraint)
        let participant;
        try {
            participant = await prisma.poolParticipant.create({
                data: {
                    poolId: poolId,
                    userId: userId,
                    status: 'COMMITTED'
                }
            });
        } catch (e) {
            if (e.code === 'P2002') {
                return res.status(400).json({ success: false, message: 'Double joining attempt detected and blocked' });
            }
            throw e;
        }

        // Increment participant count atomically
        const updatedPool = await prisma.pool.update({
            where: { id: poolId },
            data: {
                currentSize: { increment: 1 }
            }
        });

        // NOTIFY THE SELLER
        const sellerId = pool.product.store.user.id;
        const sellerName = pool.product.store.user.fullName;
        const productTitle = pool.product.title;
        const buyerName = buyer.fullName;

        // Create notification for seller
        await prisma.notification.create({
            data: {
                userId: sellerId,
                title: '🎉 New Pool Member!',
                body: `${buyerName} joined the pool for "${productTitle}". Current: ${updatedPool.currentSize}/${pool.targetSize}`,
                type: 'POOL',
                linkUrl: `/seller-dashboard.html?tab=pools&pool=${poolId}`
            }
        });

        // LIVE HEARTBEAT: Broadcast activity
        const country = buyer.country || req.headers['x-forwarded-for-country'] || 'Global';
        socketService.broadcastActivity(`${buyerName} just joined the "${productTitle}" pool from ${country} 🚀`);

        // Check if pool is now filled
        let poolFilled = false;
        if (updatedPool.currentSize >= pool.targetSize) {
            await prisma.pool.update({
                where: { id: poolId },
                data: { status: 'FILLED' }
            });
            poolFilled = true;

            // Notify seller that pool is filled
            await prisma.notification.create({
                data: {
                    userId: sellerId,
                    title: '🚀 Pool Target Reached!',
                    body: `The pool for "${productTitle}" has reached its target of ${pool.targetSize} members! Time to process orders.`,
                    type: 'POOL',
                    linkUrl: `/seller-dashboard.html?tab=pools&pool=${poolId}`
                }
            });

            // Notify all participants
            for (const p of pool.participants) {
                await prisma.notification.create({
                    data: {
                        userId: p.userId,
                        title: '🎊 Pool Complete!',
                        body: `Great news! The pool for "${productTitle}" has reached its target. Your order will be processed soon.`,
                        type: 'POOL',
                        linkUrl: `/buyer-dashboard.html?tab=pools`
                    }
                });
            }
        }

        res.json({
            success: true,
            message: poolFilled ? 'Pool target reached! Order will be processed.' : 'Successfully joined the pool',
            poolStatus: updatedPool.status,
            currentSize: updatedPool.currentSize,
            targetSize: pool.targetSize,
            poolFilled
        });

    } catch (error) {
        logger.error(`Pool Join Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error joining pool' });
    }
};

// Get pool details with participants
exports.getPoolDetails = async (req, res) => {
    try {
        const { poolId } = req.params;

        const pool = await prisma.pool.findUnique({
            where: { id: poolId },
            include: {
                product: {
                    include: {
                        store: true,
                        images: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { joinedAt: 'desc' }
                }
            }
        });

        if (!pool) {
            return res.status(404).json({ success: false, message: 'Pool not found' });
        }

        res.json({ success: true, pool });

    } catch (error) {
        logger.error(`Get Pool Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get seller's pools with participant list
exports.getSellerPools = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get seller's store
        const store = await prisma.store.findUnique({
            where: { sellerId: userId }
        });

        if (!store) {
            return res.json({ success: true, pools: [] });
        }

        // Get all pools for seller's products
        const pools = await prisma.pool.findMany({
            where: {
                product: {
                    storeId: store.id
                }
            },
            include: {
                product: {
                    include: {
                        images: { where: { isPrimary: true }, take: 1 }
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { joinedAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, pools });

    } catch (error) {
        logger.error(`Get Seller Pools Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get active pools for browsing
exports.getActivePools = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;

        const pools = await prisma.pool.findMany({
            where: { status: 'ACTIVE' },
            include: {
                product: {
                    include: {
                        store: { select: { storeName: true, country: true } },
                        images: { where: { isPrimary: true }, take: 1 }
                    }
                },
                participants: {
                    select: { userId: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add isMember flag if user is logged in
        const result = pools.map(pool => {
            const isMember = userId ? pool.participants.some(p => p.userId === userId) : false;
            // Remove sensitive participants data if needed, or just return id-only
            const { participants, ...poolData } = pool;
            return {
                ...poolData,
                isMember,
                currentSize: participants.length // use actual count
            };
        });

        res.json({ success: true, pools: result });

    } catch (error) {
        logger.error(`Get Active Pools Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Check if user has joined a pool
exports.checkPoolMembership = async (req, res) => {
    try {
        const userId = req.user.id;
        const { poolId } = req.params;

        const membership = await prisma.poolParticipant.findFirst({
            where: {
                poolId: poolId,
                userId: userId
            }
        });

        res.json({
            success: true,
            isMember: !!membership,
            status: membership ? membership.status : null
        });

    } catch (error) {
        logger.error(`Check Pool Membership Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Propose a new pool (user suggestion)
exports.proposePool = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productName, category, targetPrice, minBuyers, notes } = req.body;

        if (!productName || !category || !targetPrice) {
            return res.status(400).json({ success: false, message: 'Product name, category, and target price are required' });
        }

        // Get user info
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Create a pool proposal (stored as a notification for admins to review)
        // In production, this would be stored in a PoolProposal table
        await prisma.notification.create({
            data: {
                userId: userId,
                title: 'Pool Proposal Submitted',
                body: `Your proposal for "${productName}" has been submitted. We will notify sellers and get back to you with available offers.`,
                type: 'INFO',
                linkUrl: '/pool.html'
            }
        });

        // Notify admins about the proposal (create admin notification)
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    title: '📋 New Pool Proposal',
                    body: `User ${user.fullName} proposed a pool for "${productName}" (${category}) at target price $${targetPrice}. Min buyers: ${minBuyers || 5}. Notes: ${notes || 'None'}`,
                    type: 'POOL',
                    linkUrl: '/admin-dashboard.html'
                }
            });
        }

        // Award XP for proposing
        await prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: 50 } }
        });

        res.status(201).json({
            success: true,
            message: 'Pool proposal submitted successfully. We will notify you when sellers respond.',
            proposal: {
                productName,
                category,
                targetPrice,
                minBuyers: minBuyers || 5,
                status: 'PENDING_REVIEW'
            }
        });

    } catch (error) {
        logger.error(`Propose Pool Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to submit pool proposal' });
    }
};

// Get pools the current user has joined
exports.getMyParticipation = async (req, res) => {
    try {
        const userId = req.user.id;

        const participations = await prisma.poolParticipant.findMany({
            where: { userId },
            include: {
                pool: {
                    include: {
                        product: {
                            include: {
                                store: { select: { storeName: true } },
                                images: { where: { isPrimary: true }, take: 1 }
                            }
                        }
                    }
                }
            },
            orderBy: { joinedAt: 'desc' }
        });

        // Format result to match frontend expectations (flatten structure)
        const pools = participations.map(p => ({
            ...p.pool,
            joinedAt: p.joinedAt,
            status: p.pool.status, // Pool status
            userStatus: p.status   // Participant status (COMMITTED, etc)
        }));

        res.json({ success: true, pools });

    } catch (error) {
        logger.error(`Get My Participation Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
