const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const ShippingService = require('../services/shippingService');

// Mocking integration with a service like Google Places or Shippo
exports.validateAddress = async (req, res) => {
    try {
        const { address, city, zip, country } = req.body;

        if (!address || !city || !zip || !country) {
            return res.status(400).json({ success: false, message: 'Incomplete address details.' });
        }

        logger.info(`[SHIPPING] Validating address: ${address}, ${city}, ${zip}, ${country}`);

        // Simulation of 3rd party API call (e.g., Shippo or Google)
        // In a real app, you'd use: const validation = await shippo.address.create({...})
        // Mock Validation Logic
        let isValid = false;
        let message = 'Invalid address format.';

        // Basic Check
        if (address.length < 5 || city.length < 2) {
            isValid = false;
        } else {
            // Country-Specific Logic (Mocking real API)
            const upperCountry = country.toUpperCase();

            if (upperCountry === 'USA' || upperCountry === 'US') {
                // US Zip: 5 digits, optional -4
                isValid = /^\d{5}(-\d{4})?$/.test(zip);
                message = isValid ? 'Valid US Address' : 'Invalid US Zip Code (format: 12345)';
            } else if (upperCountry === 'UK' || upperCountry === 'GB') {
                // UK Postcode: Alphanumeric
                isValid = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(zip);
                message = isValid ? 'Valid UK Address' : 'Invalid UK Postcode';
            } else if (upperCountry === 'UAE' || upperCountry === 'AE') {
                // UAE: Often empty or PO Box, lax check
                isValid = true;
                message = 'Valid UAE Address';
            } else {
                // General world check: Zip must be at least 3 chars
                isValid = zip.length >= 3;
                message = isValid ? 'Address format valid' : 'Postal code too short';
            }
        }

        if (isValid) {
            // Simulated Normalized Address
            return res.json({
                success: true,
                isValid: true,
                normalized: {
                    address: address.toUpperCase(),
                    city: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase(),
                    zip: zip.toUpperCase(),
                    country: country.toUpperCase(),
                    formatted: `${address}, ${city}, ${zip}, ${country}`.toUpperCase()
                },
                message: 'Address verified.'
            });
        } else {
            return res.json({
                success: true,
                isValid: false,
                message: message
            });
        }
    } catch (error) {
        logger.error(`Address Validation Exception: ${error.message}`);
        res.status(500).json({ success: false, message: 'Validation service unavailable.' });
    }
};

exports.calculateLandedCost = async (req, res) => {
    try {
        const {
            itemPrice,
            quantity = 1,
            weight = 0.5,
            category = 'default',
            destinationCountry,
            destinationState = '',
            isBusiness = false
        } = req.body;

        if (!itemPrice || !destinationCountry) {
            return res.status(400).json({ success: false, message: 'itemPrice and destinationCountry are required.' });
        }

        const landedCost = await ShippingService.calculateLandedCost({
            itemPrice: parseFloat(itemPrice),
            quantity: parseInt(quantity, 10) || 1,
            weight: parseFloat(weight) || 0.5,
            category,
            destinationCountry,
            destinationState,
            isBusiness: isBusiness === true || isBusiness === 'true'
        });

        res.json({ success: true, landedCost });
    } catch (error) {
        logger.error(`Landed Cost Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to calculate landed cost.' });
    }
};
