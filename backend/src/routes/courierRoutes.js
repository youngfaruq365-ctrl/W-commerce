const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const prisma = require('../utils/prismaClient');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /api/v1/courier/profile
// Fetch the current courier's profile
router.get('/profile', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), async (req, res) => {
    try {
        const profile = await prisma.courierProfile.findUnique({
            where: { userId: req.user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        subscriptionTier: true
                    }
                },
                activeVehicle: true,
                vehicles: true
            }
        });

        if (!profile) {
            // Return a default shell so the frontend doesn't crash on null profile
            return res.status(200).json({
                userId: req.user.id,
                status: 'OFFLINE',
                kycStatus: 'PENDING',
                user: {
                    fullName: req.user.fullName || 'Courier',
                    subscriptionTier: req.user.subscriptionTier || 'FREE'
                }
            });
        }

        res.status(200).json(profile);
    } catch (error) {
        console.error('Get Courier Profile Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// POST /api/v1/courier/kyc
// Couriers submit their onboarding application
router.post('/kyc', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), upload.single('driversLicense'), async (req, res) => {
    try {
        const { vehicleMake, vehicleModel, vehiclePlate, vehicleType, guarantorName, guarantorPhone, guarantorAddress } = req.body;
        
        // 1. Upload to Cloudinary if file exists
        let driversLicenseUrl = null;
        if (req.file) {
            const uploadPromise = new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'wcommerce/kyc' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                stream.end(req.file.buffer);
            });
            driversLicenseUrl = await uploadPromise;
        }

        // 2. Update Courier Profile and Create Vehicle
        const updatedProfile = await prisma.$transaction(async (tx) => {
            // Promote user role to COURIER if currently PENDING or BUYER
            if (['PENDING', 'BUYER'].includes(req.user.role)) {
                await tx.user.update({
                    where: { id: req.user.id },
                    data: { role: 'COURIER' }
                });
            }

            // Check if vehicle plate is already used
            if (vehiclePlate) {
                const existingVehicle = await tx.vehicle.findFirst({ where: { plateNumber: vehiclePlate } });
                if (existingVehicle) {
                    throw new Error('Vehicle with this plate number is already registered.');
                }
            }

            const profile = await tx.courierProfile.upsert({
                where: { userId: req.user.id },
                create: {
                    userId: req.user.id,
                    driversLicenseUrl: driversLicenseUrl || '',
                    guarantorName,
                    guarantorPhone,
                    guarantorAddress,
                    kycStatus: 'SUBMITTED',
                    kycSubmittedAt: new Date(),
                },
                update: {
                    driversLicenseUrl: driversLicenseUrl || undefined,
                    guarantorName,
                    guarantorPhone,
                    guarantorAddress,
                    kycStatus: 'SUBMITTED',
                    kycSubmittedAt: new Date(),
                }
            });

            // Create Vehicle
            if (vehiclePlate) {
                await tx.vehicle.create({
                    data: {
                        courierProfileId: profile.id,
                        type: vehicleType || 'MOTORCYCLE',
                        plateNumber: vehiclePlate,
                        make: vehicleMake,
                        model: vehicleModel,
                    }
                });
            }

            return profile;
        });

        res.status(200).json({ success: true, data: updatedProfile });

    } catch (error) {
        console.error('KYC Upload Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error during KYC upload' });
    }
});

// GET /api/v1/courier/kyc/status
// Check current status
router.get('/kyc/status', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), async (req, res) => {
    try {
        const profile = await prisma.courierProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!profile) return res.status(200).json({ success: true, kycStatus: 'UNREGISTERED' });
        
        res.status(200).json({ success: true, kycStatus: profile.kycStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// GET /api/v1/courier/online/available
// Fetch all online couriers for sellers to negotiate with
router.get('/online/available', protect, authorize('SELLER', 'ADMIN'), async (req, res) => {
    try {
        const couriers = await prisma.courierProfile.findMany({
            where: { 
                status: 'ONLINE',
                kycStatus: { in: ['APPROVED', 'VERIFIED'] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        avatarUrl: true,
                        subscriptionTier: true
                    }
                },
                activeVehicle: true,
                vehicles: true
            }
        });
        const socketService = require('../services/socketService');
        
        const couriersWithStatus = couriers.map(courier => {
            return {
                ...courier,
                isSocketOnline: socketService.isUserOnline(courier.user.id)
            };
        });

        res.status(200).json({
            success: true,
            couriers: couriersWithStatus
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// PATCH /api/v1/courier/availability
// Update courier availability status
router.patch('/availability', protect, authorize('COURIER', 'PENDING', 'BUYER', 'SELLER', 'ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const profile = await prisma.courierProfile.upsert({
            where: { userId: req.user.id },
            create: {
                userId: req.user.id,
                status: status,
                kycStatus: 'APPROVED'
            },
            update: {
                status: status
            }
        });

        res.status(200).json({ success: true, status: profile.status });
    } catch (error) {
        console.error('Update Availability Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
});
// GET /api/v1/courier/assignment/:identifier
// W-Map Engine integration: Retrieve structured delivery job by Buyer/Seller/Order ID
router.get('/assignment/:identifier', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { identifier } = req.params;
        const wMapEngine = require('../services/wMapEngineService');

        // Clean the identifier (e.g. WC-BYR-82917 -> 82917 or just search as is)
        // For the prototype, let's just find an assignment that matches loosely
        let assignment = await prisma.deliveryAssignment.findFirst({
            where: {
                OR: [
                    { orderId: identifier },
                    { order: { buyer: { id: identifier } } },
                    { order: { seller: { id: identifier } } }
                ]
            },
            include: {
                order: {
                    include: { buyer: true, seller: true }
                },
                stops: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });

        // If no assignment is found but the courier entered a valid ID, let's mock one for the W-Map Engine prototype
        if (!assignment) {
            // Mock an order
            const mockPickup = await wMapEngine.resolveLocation('Ibadan', 'City');
            const mockDropoff = await wMapEngine.resolveLocation('Surulere', 'City');

            const order = await prisma.order.findFirst(); // just grab any order
            
            if (order) {
                assignment = await prisma.deliveryAssignment.create({
                    data: {
                        orderId: order.id,
                        courierId: req.user.id,
                        status: 'IN_TRANSIT',
                        pickupLocationId: mockPickup.id,
                        dropoffLocationId: mockDropoff.id,
                        estimatedDistance: 135.5,
                        estimatedDuration: 180,
                        pickupInstruction: 'Wait at the main gate. Ask for Mr. Tunde.',
                        dropoffInstruction: 'Drop at the security post. Call 0707XXXX9426.'
                    },
                    include: {
                        order: { include: { buyer: true, seller: true } }
                    }
                });

                // Generate waypoints using W-Map Engine
                await wMapEngine.buildDeliveryRoute(assignment.id, mockPickup, mockDropoff);

                // Re-fetch to include generated waypoints
                assignment = await prisma.deliveryAssignment.findUnique({
                    where: { id: assignment.id },
                    include: {
                        order: { include: { buyer: true, seller: true } },
                        stops: { orderBy: { sequence: 'asc' } },
                    }
                });
            }
        }

        res.json({ success: true, assignment });
    } catch (error) {
        console.error('W-Map Engine Error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve delivery assignment.' });
    }
});

module.exports = router;
