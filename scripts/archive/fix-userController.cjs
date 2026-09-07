const fs = require('fs');

const codeToInsert = `        });

    } catch (error) {
        logger.error("Update Profile Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Add Address
exports.addAddress = async (req, res) => {
    try {
        const { street, city, state, postalCode, country, type } = req.body;
        const userId = req.user.id;

        const newAddress = await prisma.address.create({
            data: {
                userId,
                street,
                city,
                state,
                postalCode,
                country,
                type: type || 'SHIPPING'
            }
        });

        res.json({ success: true, message: 'Address added', address: newAddress });
    } catch (error) {
        logger.error("Add Address Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all Addresses for user
exports.getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await prisma.address.findMany({
            where: { userId }
        });
        res.json({ success: true, addresses });
    } catch (error) {
        logger.error("Get Addresses Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update Address
exports.updateAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.id;
        const { street, city, state, postalCode, country, type } = req.body;

        const address = await prisma.address.findUnique({ where: { id: addressId } });
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        if (address.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this address' });
        }

        const updatedAddress = await prisma.address.update({
            where: { id: addressId },
            data: { street, city, state, postalCode, country, type }
        });

        res.json({ success: true, message: 'Address updated', address: updatedAddress });
    } catch (error) {
        logger.error("Update Address Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        const address = await prisma.address.findUnique({ where: { id: addressId } });
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        if (address.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this address' });
        }

        await prisma.address.delete({ where: { id: addressId } });
        res.json({ success: true, message: 'Address deleted' });
    } catch (error) {
        logger.error("Delete Address Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Submit KYC/KYB Verification
exports.submitVerification = async (req, res) => {
    try {
        const { type, idType, idNumber, documentUrls } = req.body;
        const userId = req.user.id;

        const request = await prisma.verificationRequest.create({
            data: {
                userId,
                type: type || 'KYC',
                idType,
                idNumber,
                documentUrls: JSON.stringify(documentUrls || []),
                status: 'PENDING'
            }
        });

        res.status(201).json({ success: true, message: 'Verification request submitted', request });

    } catch (error) {
        logger.error("Submit Verification Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Upgrade user to SELLER`;

const filePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\backend\\controllers\\userController.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /reverificationRequired: emailChanged[\r\n\s]*\}\);[\r\n\s]*\};[\r\n\s]*\/\/ Upgrade user to SELLER/;

if (regex.test(content)) {
    const replacement = 'reverificationRequired: emailChanged\n' + codeToInsert;
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Success with Regex");
} else {
    console.log("Regex Target not found!");
}
