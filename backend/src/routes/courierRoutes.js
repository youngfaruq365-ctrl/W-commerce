const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const prisma = require('../utils/prismaClient');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/v1/courier/kyc
// Couriers submit their onboarding application
router.post('/kyc', protect, authorize('COURIER'), upload.single('driversLicense'), async (req, res) => {
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
router.get('/kyc/status', protect, authorize('COURIER'), async (req, res) => {
    try {
        const profile = await prisma.courierProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
        
        res.status(200).json({ success: true, kycStatus: profile.kycStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// PATCH /api/v1/courier/availability
// Update courier availability status
router.patch('/availability', protect, authorize('COURIER'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const profile = await prisma.courierProfile.update({
            where: { userId: req.user.id },
            data: { status }
        });

        res.status(200).json({ success: true, status: profile.status });
    } catch (error) {
        console.error('Update Availability Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
