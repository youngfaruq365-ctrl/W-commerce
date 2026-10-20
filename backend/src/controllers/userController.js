const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const logger = require('../utils/logger');
const { getJwtSecret } = require('../utils/jwtSecret');
const walletService = require('../services/walletService');
const payoutService = require('../services/payoutService');
const pushService = require('../services/pushService');

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                addresses: true,
                store: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const walletSummary = await walletService.getSummary(req.user.id);

        user.wallet = walletSummary.balances;
        user.rewardPoints = walletSummary.balances.XP.available;

        // Remove password hash
        delete user.passwordHash;

        // Map default shipping address to root for frontend EditProfile
        const defaultShipping = user.addresses?.find(a => a.type === 'SHIPPING' && a.isDefault) || user.addresses?.find(a => a.type === 'SHIPPING') || user.addresses?.[0];
        if (defaultShipping) {
            user.shippingAddress = defaultShipping.street;
            user.shippingCity = defaultShipping.city;
            user.shippingState = defaultShipping.state;
            user.shippingZip = defaultShipping.postalCode;
            user.shippingCountry = defaultShipping.country;
        }

        res.json({ success: true, user });
    } catch (error) {
        logger.error(`Get Profile Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message, stack: error.stack });
    }
};

exports.subscribePush = async (req, res) => { 
    try { 
        const userId = req.user.id; 
        const subscription = req.body; 
        
        await prisma.user.update({ 
            where: { id: userId }, 
            data: { pushSubscription: JSON.stringify(subscription) } 
        }); 

        try {
            await pushService.sendPushNotification(subscription, {
                title: 'Push Notifications Enabled!',
                body: 'You are now ready to receive live updates.'
            });
        } catch (e) {
            console.error('Push notification test failed:', e.message);
        }
        res.json({ success: true, message: 'Push notifications enabled' });
    } catch (error) {
        logger.error(`Subscribe Push Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.findMember = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, users: [] });
        
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { fullName: { contains: q } },
                    { email: { contains: q } }
                ]
            },
            take: 20,
            select: { id: true, fullName: true, avatarUrl: true, role: true }
        });
        
        if (users.length === 0) {
            return res.json({ success: true, users: [], message: 'No members found' });
        }

        res.json({ success: true, users });
    } catch (error) {
        logger.error(`Find Member Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get Public Profile of any Member by ID
exports.getMemberProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                store: true,
                addresses: {
                    where: { isDefault: true },
                    take: 1
                }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let formattedAddress = null;
        if (user.addresses && user.addresses.length > 0) {
            const a = user.addresses[0];
            formattedAddress = `${a.street}, ${a.city}, ${a.state} ${a.postalCode}, ${a.country}`;
        }

        const publicProfile = {
            id: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isVerified: user.isVerified,
            storeName: user.store?.storeName || null,
            rating: user.store?.averageRating || 0,
            country: user.store?.country || null,
            email: user.email,
            phone: user.phone,
            address: formattedAddress
        };

        res.json({ success: true, user: publicProfile });
    } catch (error) {
        logger.error(`Get Member Profile Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Deposit Funds to Wallet
exports.depositFunds = async (req, res) => {
    return res.status(404).json({ success: false, message: 'This feature is not available' });
};

// Wallet transaction history for the signed-in user
exports.getWalletTransactions = async (req, res) => {
    try {
        const walletEntries = await walletService.listTransactions(req.user.id, req.query);
        const transactions = walletEntries.map(entry => ({
            id: entry.id,
            type: entry.direction,
            amount: entry.amount,
            currency: entry.coin,
            status: entry.status,
            referenceId: entry.referenceId,
            description: entry.description,
            createdAt: entry.createdAt
        }));

        res.json({ success: true, transactions });
    } catch (error) {
        logger.error(`Get Wallet Transactions Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load wallet transactions' });
    }
};

// Create a wallet withdrawal request and hold the requested funds
exports.requestWalletWithdrawal = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const destination = String(req.body.destination || '').trim();
        const { bankCode, accountNumber, accountName } = req.body;

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        if (!destination) {
            return res.status(400).json({ success: false, message: 'Withdrawal destination is required' });
        }

        const payout = await payoutService.requestPayout(req.user.id, amount, destination, bankCode, accountNumber, accountName);
        const summary = await walletService.getSummary(req.user.id);

        res.json({
            success: true,
            message: 'Withdrawal request submitted for review',
            referenceId: payout.id,
            newBalance: summary.balances.GONG.available
        });
    } catch (error) {
        logger.error(`Wallet Withdrawal Error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Failed to request withdrawal' : error.message });
    }
};

const engagementService = require('../services/engagementService');

exports.followSeller = async (req, res) => {
    try {
        const sellerId = req.params.sellerId || req.body.sellerId;
        const buyerId = req.user.id;
        
        const result = await engagementService.followSeller(sellerId, buyerId);
        res.json({ success: true, following: result.following, message: 'Followed' });
    } catch (error) {
        if (error.message === 'CANNOT_FOLLOW_SELF') return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
        if (error.message === 'RATE_LIMIT_EXCEEDED') return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
        logger.error(`Follow Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to follow' });
    }
};

exports.unfollowSeller = async (req, res) => {
    try {
        const sellerId = req.params.sellerId || req.body.sellerId;
        const buyerId = req.user.id;
        
        const result = await engagementService.unfollowSeller(sellerId, buyerId);
        res.json({ success: true, following: result.following, message: 'Unfollowed' });
    } catch (error) {
        logger.error(`Unfollow Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to unfollow' });
    }
};

exports.getFollowStatus = async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const buyerId = req.user.id;
        
        const result = await engagementService.getFollowStatus(sellerId, buyerId);
        res.json({ success: true, following: result.following });
    } catch (error) {
        logger.error(`Get Follow Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to get follow status' });
    }
};

// Get list of followed sellers
exports.getFollowing = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const following = await prisma.sellerFollow.findMany({
            where: { buyerId },
            include: {
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        store: {
                            select: {
                                storeName: true,
                                country: true,
                                averageRating: true
                            }
                        }
                    }
                }
            }
        });

        const formattedFollowing = following.map(f => {
            const seller = f.seller;
            const store = seller.store || {};
            return {
                id: seller.id,
                uid: seller.id,
                name: seller.fullName,
                avatar: seller.avatarUrl,
                storeName: store.storeName || 'My Store',
                category: store.category || 'General',
                location: store.country || 'Global',
                rating: store.averageRating || 0,
            };
        });

        res.json({ success: true, following: formattedFollowing });
    } catch (error) {
        logger.error(`Get Following Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to get followed sellers' });
    }
};


// Get users for chat
exports.getUsersForChat = async (req, res) => {
    try {
        const userId = req.user.id;
        // Simple logic: return recent contacts or all users
        const users = await prisma.user.findMany({
            where: { id: { not: userId } },
            take: 20,
            select: { id: true, fullName: true, avatarUrl: true, isVerified: true }
        });
        res.json({ success: true, users });
    } catch (error) {
        logger.error(`Get Users For Chat Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load users for chat' });
    }
};

// Get Buyer Dashboard stats
exports.getBuyerDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, avatarUrl: true, isVerified: true, createdAt: true } });
        
        const walletService = require('../services/walletService');
        const walletSummary = await walletService.getSummary(userId);
        const walletBalance = walletSummary.balances && walletSummary.balances.GONG ? walletSummary.balances.GONG.available : 0;
        const points = walletSummary.balances && walletSummary.balances.XP ? walletSummary.balances.XP.available : 0;

        const orderCount = await prisma.order.count({ where: { buyerId: userId } });
        const wishlistCount = await prisma.wishlist.count({ where: { buyerId: userId } });

        const recentOrders = await prisma.order.findMany({
            where: { buyerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { items: { include: { product: { include: { images: true } } } } }
        });

        const recommendedProducts = await prisma.product.findMany({
            take: 4,
            where: { isArchived: false, store: { approvalStatus: 'APPROVED' } },
            orderBy: { createdAt: 'desc' },
            include: { store: true, images: { take: 1 } }
        });

        res.json({
            success: true,
            buyer: user,
            stats: {
                walletBalance,
                points,
                orderCount,
                wishlistCount
            },
            recentOrders,
            recommendedProducts
        });
    } catch (error) {
        logger.error("Get Buyer Dashboard Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.contactSupport = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const userId = req.user.id;
        
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }
        
        // Create a SUPPORT Conversation to serve as a ticket
        const conversation = await prisma.conversation.create({
            data: {
                type: 'SUPPORT',
                context: subject,
                participants: {
                    create: {
                        userId: userId
                    }
                },
                messages: {
                    create: {
                        senderId: userId,
                        content: message
                    }
                }
            }
        });
        
        res.status(201).json({ success: true, message: 'Support ticket created successfully', ticketId: conversation.id });
    } catch (error) {
        logger.error(`Contact Support Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        const { uploadToCloud } = require('../middleware/uploadMiddleware');
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        const avatarUrl = await uploadToCloud(req, 'avatars');

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl }
        });

        res.json({ success: true, avatarUrl, message: 'Avatar updated successfully' });
    } catch (error) {
        logger.error(`Avatar Upload Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
// BUG-PROFILE-01: Stub overrides removed — they were silently overwriting real implementations
// of getUsersForChat (line 277) and contactSupport (line 338) above.

// ─── Profile Management ──────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, notificationPrefs, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry, username, dob, gender, bio, instagram, twitter, website } = req.body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
        if (notificationPrefs) updateData.notificationPrefs = notificationPrefs;

        if (username !== undefined) {
            const cleanUsername = typeof username === 'string' ? username.trim().replace(/^@/, '') : null;
            if (!cleanUsername) {
                updateData.username = null;
            } else {
                // Check if username is taken by another user
                const existing = await prisma.user.findFirst({
                    where: {
                        username: cleanUsername,
                        NOT: { id: userId }
                    }
                });
                if (existing) {
                    return res.status(400).json({ success: false, message: 'Username is already taken' });
                }
                updateData.username = cleanUsername;
            }
        }

        if (dob !== undefined) updateData.dob = dob ? String(dob).trim() : null;
        if (gender !== undefined) updateData.gender = gender;
        if (bio !== undefined) updateData.bio = bio;
        if (instagram !== undefined) updateData.instagram = instagram;
        if (twitter !== undefined) updateData.twitter = twitter;
        if (website !== undefined) updateData.website = website;

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true, username: true }
        });

        if (shippingAddress || shippingCity || shippingState || shippingZip || shippingCountry) {
            // Find existing default address or any address
            const defaultAddress = await prisma.address.findFirst({
                where: { userId, isDefault: true }
            }) || await prisma.address.findFirst({
                where: { userId }
            });

            if (defaultAddress) {
                await prisma.address.update({
                    where: { id: defaultAddress.id },
                    data: {
                        street: shippingAddress !== undefined ? shippingAddress : defaultAddress.street,
                        city: shippingCity !== undefined ? shippingCity : defaultAddress.city,
                        state: shippingState !== undefined ? shippingState : defaultAddress.state,
                        postalCode: shippingZip !== undefined ? shippingZip : defaultAddress.postalCode,
                        country: shippingCountry !== undefined ? shippingCountry : defaultAddress.country,
                        type: defaultAddress.type || 'SHIPPING',
                        isDefault: true
                    }
                });
            } else {
                await prisma.address.create({
                    data: {
                        userId,
                        type: 'SHIPPING',
                        isDefault: true,
                        street: shippingAddress || '',
                        city: shippingCity || '',
                        state: shippingState || '',
                        postalCode: shippingZip || '',
                        country: shippingCountry || '',
                    }
                });
            }
        }

        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        logger.error(`Update Profile Error: ${error.message}`);
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('username') || String(error.message).includes('username')) {
                return res.status(400).json({ success: false, message: 'Username is already taken' });
            }
            return res.status(400).json({ success: false, message: 'A unique field conflict occurred' });
        }
        res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
    }
};

// ─── Address Management ───────────────────────────────────────────────────────

exports.getAddresses = async (req, res) => {
    try {
        const addresses = await prisma.address.findMany({
            where: { userId: req.user.id },
            orderBy: [{ isDefault: 'desc' }]
        });
        res.json({ success: true, addresses });
    } catch (error) {
        logger.error(`Get Addresses Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to load addresses' });
    }
};

exports.addAddress = async (req, res) => {
    try {
        const { type, street, city, state, postalCode, country, isDefault } = req.body;
        const userId = req.user.id;

        // If setting as default, unset other defaults first
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        const address = await prisma.address.create({
            data: { userId, type: type || 'SHIPPING', street, city, state, postalCode, country, isDefault: !!isDefault }
        });

        res.status(201).json({ success: true, message: 'Address added', address });
    } catch (error) {
        logger.error(`Add Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to add address' });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { type, street, city, state, postalCode, country, isDefault } = req.body;

        // Ownership check
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ success: false, message: 'Address not found' });

        if (isDefault) {
            await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
        }

        const address = await prisma.address.update({
            where: { id },
            data: { type, street, city, state, postalCode, country, isDefault: !!isDefault }
        });

        res.json({ success: true, message: 'Address updated', address });
    } catch (error) {
        logger.error(`Update Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update address' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Ownership check (IDOR prevention)
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ success: false, message: 'Address not found' });

        await prisma.address.delete({ where: { id } });
        res.json({ success: true, message: 'Address deleted' });
    } catch (error) {
        logger.error(`Delete Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
};

// ─── Account Management ───────────────────────────────────────────────────────

exports.submitVerification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { documentType, documentUrl } = req.body;

        if (!documentType || !documentUrl) {
            return res.status(400).json({ success: false, message: 'Document type and URL are required' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { kycStatus: 'PENDING', kycDocumentType: documentType, kycDocumentUrl: documentUrl }
        });

        res.json({ success: true, message: 'Verification documents submitted. Under review.' });
    } catch (error) {
        logger.error(`Submit Verification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to submit verification' });
    }
};

exports.upgradeToSeller = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role === 'SELLER') return res.status(400).json({ success: false, message: 'Already a seller' });

        // Upgrade role and create store shell in a transaction
        const [updatedUser] = await prisma.$transaction([
            prisma.user.update({ where: { id: userId }, data: { role: 'SELLER' } }),
            prisma.store.upsert({
                where: { sellerId: userId },
                update: {},
                create: {
                    sellerId: userId,
                    storeName: `${user.fullName}'s Shop`,
                    description: 'Global marketplace merchant.',
                    country: 'NG',
                    isVerified: false
                }
            })
        ]);

        res.json({ success: true, message: 'Account upgraded to seller', user: { ...updatedUser, passwordHash: undefined } });
    } catch (error) {
        logger.error(`Upgrade To Seller Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to upgrade account' });
    }
};

exports.requestDataExport = async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info(`Data export requested by user: ${userId}`);
        // Queue a background export job (placeholder for future queue integration)
        res.json({ success: true, message: 'Data export request received. You will receive an email within 24 hours.' });
    } catch (error) {
        logger.error(`Data Export Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to process data export request' });
    }
};

exports.requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        // Soft delete — flag for deletion, don't actually delete immediately
        await prisma.user.update({
            where: { id: userId },
            data: { deletionRequestedAt: new Date(), deletionReason: reason || null }
        });

        // Invalidate all sessions
        await prisma.userSession.updateMany({ where: { userId }, data: { isActive: false } });

        logger.info(`Account deletion requested by user: ${userId}`);
        res.json({ success: true, message: 'Account deletion request submitted. Your account will be deleted within 30 days.' });
    } catch (error) {
        logger.error(`Account Deletion Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to process deletion request' });
    }
};

exports.updateCookiePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { analytics, marketing, functional } = req.body;

        await prisma.user.update({
            where: { id: userId },
            data: {
                cookiePrefs: { analytics: !!analytics, marketing: !!marketing, functional: !!functional }
            }
        });

        res.json({ success: true, message: 'Cookie preferences updated' });
    } catch (error) {
        logger.error(`Cookie Preferences Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update cookie preferences' });
    }
};

