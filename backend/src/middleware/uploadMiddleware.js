const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const crypto = require('crypto');

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

// Configure Storage
const storage = cloudConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: 'storage/uploads/',
        filename: (req, file, cb) => {
            // Generate unique filename: product_TIMESTAMP_RANDOM.ext
            const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
            cb(null, file.fieldname + '_' + uniqueSuffix + path.extname(file.originalname));
        }
    });

// File Filter (Images and Short Videos)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Security Policy: Only JPG, PNG, GIF, WebP images and MP4/MOV videos are allowed!'));
    }
};

// Custom upload function that supports both S3 and Cloudinary
const multerUpload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit for videos, images are usually smaller
    },
    fileFilter: fileFilter
});

// Upload to S3
async function uploadToS3(file) {
    if (!s3Client) throw new Error('AWS S3 is not configured');
    const key = `products/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
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
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
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
            imageUrl = await uploadToCloudinary(req.file);
            console.log('[UPLOAD] Uploaded to Cloudinary:', imageUrl);
        }
        // Fall back to S3 if configured
        else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            imageUrl = await uploadToS3(req.file);
            console.log('[UPLOAD] Uploaded to S3:', imageUrl);
        }
        // Fall back to local storage
        else {
            imageUrl = `/uploads/${req.file.filename}`;
            console.log('[UPLOAD] Using local storage:', imageUrl);
        }

        return imageUrl;
    } catch (error) {
        console.error('[UPLOAD ERROR]', error);
        throw error;
    }
}

// Antivirus
function scanForMalware(file) { return new Promise((resolve, reject) => { if (!file || !file.buffer) return reject(new Error('No file to scan')); const buffer = file.buffer; const javaClassSig = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]); if (buffer.length >= 4) { const firstBytes = buffer.slice(0, 4); if (firstBytes.equals(javaClassSig)) return reject(new Error('Antivirus: Malicious file signature detected')); if (firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && firstBytes[2] === 0x03) return reject(new Error('Antivirus: Archive files not allowed')); if (firstBytes[0] === 0x4D && firstBytes[1] === 0x5A) return reject(new Error('Antivirus: Executable files not allowed')); } const extension = file.originalname.toLowerCase().split('.').pop(); const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf']; if (!validExtensions.includes(extension)) return reject(new Error('Antivirus: Invalid file extension')); let nullCount = 0; for (let i = 0; i < Math.min(buffer.length, 1000); i++) if (buffer[i] === 0x00) nullCount++; if (nullCount > 100) return reject(new Error('Antivirus: Suspicious null byte pattern')); const suspiciousPatterns = [/<script[^>]*>/i, /javascript:/i]; const scanSection = buffer.slice(0, Math.min(10240, buffer.length)); const textContent = scanSection.toString('latin1'); for (const pattern of suspiciousPatterns) if (pattern.test(textContent)) return reject(new Error('Antivirus: Suspicious script content')); resolve({ clean: true, scannedAt: new Date() }); }); }
const antivirusScan = (req, res, next) => { if (!req.file) return next(); scanForMalware(req.file).then(() => next()).catch(err => { const logger = require('../utils/logger') || console; logger.error('[ANTIVIRUS] Scan failed: ' + err.message); res.status(400).json({ success: false, message: 'File rejected by antivirus scan', error: process.env.NODE_ENV === 'production' ? 'File not allowed' : err.message }); }); };
module.exports = {
    upload: multerUpload,
    uploadToCloud,
    antivirusScan,
    scanForMalware
};

