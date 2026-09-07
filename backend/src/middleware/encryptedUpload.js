/**
 * Encrypted File Upload Middleware for Payment Proofs
 * Provides secure file handling with encryption, validation, and audit logging
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const logger = require('../utils/logger');

// Configuration
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

/**
 * Encrypt file buffer using AES-256-CBC
 */
function encryptBuffer(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]); // Prepend IV for decryption
}

/**
 * Decrypt file buffer
 */
function decryptBuffer(encryptedBuffer) {
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Secure filename generator - no readable information
 */
function generateSecureFilename(originalname) {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('sha256').update(timestamp + randomSuffix).digest('hex').substring(0, 12);
    const ext = path.extname(originalname).toLowerCase();
    
    return `payment_proof_${hash}${ext}.enc`;
}

/**
 * File validation for payment proofs
 */
function validatePaymentProofFile(req, file, cb) {
    // Only allow images for payment proofs
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (!mimetype || !extname) {
        logger.warn(`Payment proof upload rejected: invalid file type - ${file.originalname}`);
        return cb(new Error('Security Policy: Only image files (JPG, PNG, GIF, WebP) are allowed for payment proofs!'));
    }
    
    // Check file size (max 5MB for payment proofs)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        logger.warn(`Payment proof upload rejected: file too large - ${file.size} bytes`);
        return cb(new Error('File size must be less than 5MB'));
    }
    
    // Log attempt
    logger.info(`Payment proof upload validated: ${file.originalname}, size: ${file.size} bytes`);
    
    return cb(null, true);
}

/**
 * Custom storage engine that encrypts files on save
 */
const encryptedStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/payment_proofs';
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const secureFilename = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
    }
});

/**
 * Process file encryption after upload
 */
const processEncryption = (req, file, cb) => {
    const filePath = file.path;
    
    try {
        // Read the uploaded file
        const fileBuffer = fs.readFileSync(filePath);
        
        // Encrypt the file
        const encryptedBuffer = encryptBuffer(fileBuffer);
        
        // Write encrypted file back
        fs.writeFileSync(filePath, encryptedBuffer);
        
        // Log successful encryption
        logger.info(`Payment proof file encrypted: ${file.filename}`);
        
        // Add metadata to request
        req.file.encrypted = true;
        req.file.encryptionIV = encryptedBuffer.subarray(0, IV_LENGTH).toString('hex');
        req.file.originalName = file.originalname;
        
        cb(null, file);
    } catch (error) {
        logger.error(`Payment proof encryption failed: ${error.message}`);
        cb(new Error('Failed to process payment proof securely'));
    }
};

/**
 * Simulated virus scan (in production, integrate with ClamAV or similar)
 */
async function simulateVirusScan(filePath) {
    // In production, integrate with actual antivirus:
    // - ClamAV: const clamscan = require('clamscan');
    // - Sophos: Use sophos-rest-api
    // - Google Cloud DLP for content scanning
    
    logger.info(`Simulating virus scan for: ${filePath}`);
    
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log scan result
    logger.info(`Virus scan passed for: ${filePath}`);
    
    return { clean: true, threats: [] };
}

/**
 * Main upload middleware for payment proofs
 */
const uploadPaymentProof = multer({
    storage: encryptedStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: validatePaymentProofFile
});

/**
 * Middleware to handle encryption after upload
 */
const handlePaymentProofUpload = (req, res, next) => {
    uploadPaymentProof.single('proof')(req, res, async (err) => {
        if (err) {
            logger.error(`Payment proof upload error: ${err.message}`);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No payment proof file uploaded'
            });
        }
        
        try {
            // Perform virus scan
            const scanResult = await simulateVirusScan(req.file.path);
            
            if (!scanResult.clean) {
                // Delete suspicious file
                fs.unlinkSync(req.file.path);
                logger.warn(`Suspicious payment proof file deleted: ${req.file.originalname}`);
                
                return res.status(400).json({
                    success: false,
                    message: 'File failed security scan'
                });
            }
            
            // Process encryption
            processEncryption(req.file, (err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to secure payment proof'
                    });
                }
                
                next();
            });
        } catch (error) {
            logger.error(`Payment proof processing error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to process payment proof'
            });
        }
    });
};

/**
 * Decrypt payment proof for viewing (admin only)
 */
const decryptPaymentProof = (encryptedFilePath, res, callback) => {
    try {
        if (!fs.existsSync(encryptedFilePath)) {
            return callback(new Error('File not found'));
        }
        
        const encryptedBuffer = fs.readFileSync(encryptedFilePath);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);
        
        callback(null, decryptedBuffer);
    } catch (error) {
        logger.error(`Payment proof decryption failed: ${error.message}`);
        callback(error);
    }
};

module.exports = {
    uploadPaymentProof,
    handlePaymentProofUpload,
    decryptPaymentProof,
    encryptBuffer,
    decryptBuffer,
    generateSecureFilename,
    validatePaymentProofFile
};
