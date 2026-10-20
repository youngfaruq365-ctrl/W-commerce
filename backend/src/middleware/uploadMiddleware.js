const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// Configure AWS S3 (lazy — only create when credentials are present)
let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
}

// If cloud providers are configured, use memory storage so we can stream directly from buffer.
const cloudConfigured = Boolean((process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) || (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY));

const fs = require('fs');

// Ensure local storage directory exists
const localStorageDir = path.join(__dirname, '../../storage/uploads');
if (!fs.existsSync(localStorageDir)) {
    fs.mkdirSync(localStorageDir, { recursive: true });
}

// Configure Storage
const storage = cloudConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, localStorageDir);
        },
        filename: (req, file, cb) => {
            // Generate unique filename: product_TIMESTAMP_RANDOM.ext
            const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
            cb(null, file.fieldname + '_' + uniqueSuffix + path.extname(file.originalname));
        }
    });

// File Filter (Images, Short Videos, and Audio)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|mp3|wav|m4a|ogg|aac|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Security Policy: Only JPG, PNG, GIF, WebP images, MP4/MOV videos, and MP3/WAV/M4A/OGG/AAC/WEBM audio are allowed!'));
    }
};

// Audio-only file filter
const audioFileFilter = (req, file, cb) => {
    const allowedAudio = /mp3|wav|m4a|ogg|aac|webm/;
    const allowedMime = /audio\/|video\/webm/;
    const extname = allowedAudio.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMime.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Security Policy: Only MP3, WAV, M4A, OGG, WEBM, and AAC audio files are allowed!'));
};

// Custom upload function that supports both S3 and Cloudinary
const multerUpload = multer({
    storage: storage,
    limits: {
        fileSize: 4 * 1024 * 1024 // 4MB maximum for product videos and images (max 5)
    },
    fileFilter: fileFilter
});

// Audio-only upload (10MB max)
const multerAudioUpload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: audioFileFilter
});

// Upload to S3
async function uploadToS3(file) {
    if (!s3Client) throw new Error('AWS S3 is not configured');
    const key = `products/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer || fs.readFileSync(file.path),
        ContentType: file.mimetype,
        ACL: 'public-read'
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    // Return the public URL
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

// Upload to Cloudinary
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'globalx/products',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        const buffer = file.buffer || fs.readFileSync(file.path);
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

// Main upload handler with cloud storage support
async function uploadToCloud(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let imageUrl;

        // Prefer Cloudinary if configured
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            try {
                imageUrl = await uploadToCloudinary(req.file);
                logger.info('[UPLOAD] Uploaded to Cloudinary: ' + imageUrl);
            } catch (cloudErr) {
                logger.warn('[UPLOAD WARNING] Cloudinary upload failed, falling back to local storage: ' + cloudErr.message);
                const filename = (req.file.fieldname || 'upload') + '_' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(req.file.originalname || '.png');
                const filePath = path.join(localStorageDir, filename);
                const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
                if (buffer) {
                    fs.writeFileSync(filePath, buffer);
                    imageUrl = `/uploads/${filename}`;
                    logger.info('[UPLOAD] Saved locally via fallback: ' + imageUrl);
                } else {
                    throw cloudErr;
                }
            }
        }
        // Fall back to S3 if configured
        else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            try {
                imageUrl = await uploadToS3(req.file);
                logger.info('[UPLOAD] Uploaded to S3: ' + imageUrl);
            } catch (s3Err) {
                logger.warn('[UPLOAD WARNING] S3 upload failed, falling back to local storage: ' + s3Err.message);
                const filename = (req.file.fieldname || 'upload') + '_' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(req.file.originalname || '.png');
                const filePath = path.join(localStorageDir, filename);
                const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
                if (buffer) {
                    fs.writeFileSync(filePath, buffer);
                    imageUrl = `/uploads/${filename}`;
                } else {
                    throw s3Err;
                }
            }
        }
        // Fall back to local storage
        else {
            if (req.file.filename) {
                imageUrl = `/uploads/${req.file.filename}`;
            } else {
                const filename = (req.file.fieldname || 'upload') + '_' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(req.file.originalname || '.png');
                const filePath = path.join(localStorageDir, filename);
                const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
                fs.writeFileSync(filePath, buffer);
                imageUrl = `/uploads/${filename}`;
            }
            logger.info('[UPLOAD] Using local storage: ' + imageUrl);
        }

        return imageUrl;
    } catch (error) {
        logger.error('[UPLOAD ERROR] ' + error.message, { stack: error.stack });
        throw error;
    }
}

// Antivirus
function scanForMalware(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file to scan'));
        
        let buffer = file.buffer;
        if (!buffer && file.path) {
            try {
                buffer = fs.readFileSync(file.path);
            } catch (err) {
                return reject(new Error('Failed to read file from disk for antivirus scan'));
            }
        }

        if (!buffer) {
            return reject(new Error('No file buffer or path available to scan'));
        }

        const javaClassSig = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]);
        if (buffer.length >= 4) {
            const firstBytes = buffer.slice(0, 4);
            if (firstBytes.equals(javaClassSig)) return reject(new Error('Antivirus: Malicious file signature detected'));
            if (firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && firstBytes[2] === 0x03) return reject(new Error('Antivirus: Archive files not allowed'));
            if (firstBytes[0] === 0x4D && firstBytes[1] === 0x5A) return reject(new Error('Antivirus: Executable files not allowed'));
        }

        const extension = file.originalname.toLowerCase().split('.').pop();
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf', 'mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm'];
        if (!validExtensions.includes(extension)) return reject(new Error('Antivirus: Invalid file extension'));

        const suspiciousPatterns = [/<script[^>]*>/i, /javascript:/i];
        const scanSection = buffer.slice(0, Math.min(10240, buffer.length));
        const textContent = scanSection.toString('latin1');
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(textContent)) return reject(new Error('Antivirus: Suspicious script content'));
        }

        resolve({ clean: true, scannedAt: new Date() });
    });
}
const antivirusScan = (req, res, next) => { if (!req.file) return next(); scanForMalware(req.file).then(() => next()).catch(err => { const logger = require('../utils/logger') || console; logger.error('[ANTIVIRUS] Scan failed: ' + err.message); res.status(400).json({ success: false, message: 'File rejected by antivirus scan', error: process.env.NODE_ENV === 'production' ? 'File not allowed' : err.message }); }); };
module.exports = {
    upload: multerUpload,
    uploadAudio: multerAudioUpload,
    uploadToCloud,
    antivirusScan,
    scanForMalware
};

