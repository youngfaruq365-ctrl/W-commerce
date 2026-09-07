const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const identityService = require('../services/identityVerificationService').default;

/**
 * Submit a new KYC or KYB verification request
 */
exports.submitVerification = async (req, res) => {
    try {
        const { type, idType, idNumber, documentUrls, bvn, nin, firstName, lastName } = req.body;
        const userId = req.user.id;

        if (!type || (!documentUrls?.length && !bvn && !nin)) {
            return res.status(400).json({ success: false, message: 'Type and at least one document, BVN, or NIN are required.' });
        }

        // Check if there's already a pending request
        const existingRequest = await prisma.verificationRequest.findFirst({
            where: {
                userId,
                status: 'PENDING',
                type
            }
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: `You already have a pending ${type} request.` });
        }

        let providerData = null;
        let autoApprove = false;

        // Perform instant API verification for Nigerian ID
        if (bvn) {
            providerData = await identityService.verifyBVN(bvn, firstName || req.user.firstName, lastName || req.user.lastName);
            if (providerData.success && providerData.confidence > 0.90) autoApprove = true;
        } else if (nin) {
            providerData = await identityService.verifyNIN(nin, firstName || req.user.firstName, lastName || req.user.lastName);
            if (providerData.success && providerData.confidence > 0.90) autoApprove = true;
        }

        const request = await prisma.verificationRequest.create({
            data: {
                userId,
                type,
                idType: idType || (bvn ? 'BVN' : (nin ? 'NIN' : null)),
                idNumber: idNumber || bvn || nin,
                bvn: bvn || null,
                nin: nin || null,
                verificationProvider: providerData ? 'MOCK_KYC' : null,
                providerReference: providerData?.providerReference || null,
                documentUrls: JSON.stringify(documentUrls || []),
                status: autoApprove ? 'APPROVED' : 'PENDING'
            }
        });

        if (autoApprove) {
            await prisma.user.update({
                where: { id: userId },
                data: { isVerified: true, kycTier: 2 }
            });
        }

        logger.info(`Verification request ${request.id} submitted by user ${userId}. Auto-approve: ${autoApprove}`);

        res.status(201).json({
            success: true,
            message: autoApprove 
                ? 'Identity verified instantly successfully.'
                : 'Verification request submitted successfully. Our team will review it within 24-48 hours.',
            requestId: request.id,
            status: request.status
        });

    } catch (error) {
        logger.error(`Submit Verification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get current user's verification status and history
 */
exports.getMyVerifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await prisma.verificationRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycTier: true, isVerified: true }
        });

        res.json({
            success: true,
            kycTier: user.kycTier,
            isVerified: user.isVerified,
            requests: requests.map(r => ({
                ...r,
                documentUrls: JSON.parse(r.documentUrls || '[]')
            }))
        });

    } catch (error) {
        logger.error(`Get My Verifications Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get verification level details (Publicly explain what each tier unlocks)
 */
exports.getTierBenefits = (req, res) => {
    res.json({
        success: true,
        tiers: [
            {
                level: 1,
                name: "Email Verified",
                benefits: ["Browse Marketplace", "Join Community Pools", "Purchase up to $1,000"],
                requirements: "Verify email address"
            },
            {
                level: 2,
                name: "Identity Verified",
                benefits: ["Unlimited Purchase Value", "Become a Seller", "Lower Transaction Fees"],
                requirements: "Government-issued ID (Passport/License)"
            },
            {
                level: 3,
                name: "Business Verified",
                benefits: ["Merchant Dashboard", "Bulk Uploads", "API Access", "Priority Support"],
                requirements: "Business Registration Documents"
            }
        ]
    });
};
