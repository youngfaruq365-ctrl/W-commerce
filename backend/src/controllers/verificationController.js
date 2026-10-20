const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const identityService = require('../services/identityVerificationService');

/**
 * Submit a new KYC or KYB verification request
 */
exports.submitVerification = async (req, res) => {
    try {
        const { 
            type, idType, idNumber, documentUrls, bvn, nin, firstName, lastName,
            sellerType, identityData, businessData, ownershipData, addressData, payoutData
        } = req.body;
        const userId = req.user.id;

        if (!type || (!documentUrls?.length && !bvn && !nin && type !== 'KYB')) {
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

        // Perform instant API verification for Nigerian ID (KYC)
        if (type === 'KYC') {
            if (bvn) {
                providerData = await identityService.verifyBVN(bvn, firstName || req.user.firstName, lastName || req.user.lastName);
                if (providerData.success && providerData.confidence > 0.90) autoApprove = true;
            } else if (nin) {
                providerData = await identityService.verifyNIN(nin, firstName || req.user.firstName, lastName || req.user.lastName);
                if (providerData.success && providerData.confidence > 0.90) autoApprove = true;
            }
        }

        // Initial section statuses for KYB
        const initialSectionStatuses = type === 'KYB' ? JSON.stringify({
            identity: 'PENDING',
            business: 'PENDING',
            ownership: 'PENDING',
            address: 'PENDING',
            payout: 'PENDING'
        }) : null;

        const request = await prisma.verificationRequest.create({
            data: {
                userId,
                type,
                idType: idType || (bvn ? 'BVN' : (nin ? 'NIN' : null)),
                idNumber: idNumber || bvn || nin,
                documentUrls: JSON.stringify(documentUrls || []),
                status: autoApprove ? 'APPROVED' : 'PENDING',
                identityData: identityData ? JSON.stringify(identityData) : null,
                businessData: businessData ? JSON.stringify(businessData) : null,
                ownershipData: ownershipData ? JSON.stringify(ownershipData) : null,
                addressData: addressData ? JSON.stringify(addressData) : null,
                payoutData: payoutData ? JSON.stringify(payoutData) : null,
                sectionStatuses: initialSectionStatuses,
                rejectionReasons: type === 'KYB' ? '{}' : null
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
            requests: requests.map(r => {
                let parsed = { ...r, documentUrls: JSON.parse(r.documentUrls || '[]') };
                
                // Parse KYB specific fields if present
                if (r.identityData) parsed.identityData = JSON.parse(r.identityData);
                if (r.businessData) parsed.businessData = JSON.parse(r.businessData);
                if (r.ownershipData) parsed.ownershipData = JSON.parse(r.ownershipData);
                if (r.addressData) parsed.addressData = JSON.parse(r.addressData);
                if (r.payoutData) parsed.payoutData = JSON.parse(r.payoutData);
                if (r.sectionStatuses) parsed.sectionStatuses = JSON.parse(r.sectionStatuses);
                if (r.rejectionReasons) parsed.rejectionReasons = JSON.parse(r.rejectionReasons);
                
                return parsed;
            })
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

/**
 * Update a specific section of a verification request (e.g. after rejection)
 */
exports.updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { section, data } = req.body;
        const userId = req.user.id;

        const request = await prisma.verificationRequest.findFirst({
            where: { id, userId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Verification request not found' });
        }

        if (request.status === 'APPROVED') {
            return res.status(400).json({ success: false, message: 'Cannot update an approved verification' });
        }

        const validSections = ['identity', 'business', 'ownership', 'address', 'payout'];
        if (!validSections.includes(section)) {
            return res.status(400).json({ success: false, message: 'Invalid section' });
        }

        // Update the specific data field
        const updateData = {};
        updateData[`${section}Data`] = JSON.stringify(data);

        // Update the section status back to PENDING
        const currentStatuses = request.sectionStatuses ? JSON.parse(request.sectionStatuses) : {};
        currentStatuses[section] = 'PENDING';
        updateData.sectionStatuses = JSON.stringify(currentStatuses);
        
        // If overall request was REJECTED, change it back to PENDING since a section was updated
        if (request.status === 'REJECTED') {
            updateData.status = 'PENDING';
        }

        await prisma.verificationRequest.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            message: `${section} updated successfully. It is now under review.`
        });

    } catch (error) {
        logger.error(`Update Section Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
