const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const logger = require('../utils/logger');


/**
 * Cloud Storage Service
 * Handles uploading local files to Cloudinary (Production) or keeps them local (Development)
 */
class CloudService {
    constructor() {
        this.isConfigured = false;
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
            this.isConfigured = true;
            logger.info("☁️ Cloud Service: Connected to Cloudinary");
        } else {
            logger.warn("☁️ Cloud Service: Cloudinary not configured. Using local filesystem.");
        }
    }

    /**
     * Upload a local file to cloud storage
     * @param {Object|string} fileData - The file object from multer, or path to the temp file.
     * @returns {Promise<string>} - The public URL of the uploaded file.
     */
    async uploadImage(fileData) {
        if (this.isConfigured) {
            try {
                if (fileData && fileData.buffer) {
                    // Upload to Cloudinary via stream (MemoryStorage)
                    const streamifier = require('streamifier');
                    return await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: "globalx_uploads", resource_type: "auto" },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result.secure_url);
                            }
                        );
                        streamifier.createReadStream(fileData.buffer).pipe(uploadStream);
                    });
                } else {
                    // Upload to Cloudinary via file path (DiskStorage)
                    const localPath = typeof fileData === 'string' ? fileData : fileData.path;
                    const result = await cloudinary.uploader.upload(localPath, {
                        folder: "globalx_uploads",
                        use_filename: true,
                        unique_filename: true,
                        resource_type: "auto"
                    });

                    // Delete local temp file after successful upload
                    fs.unlink(localPath, (err) => {
                        if (err) logger.error("Failed to delete temp file:", err);
                    });

                    return result.secure_url;
                }
            } catch (error) {
                logger.error("Cloudinary upload failed, falling back to local storage:", error.message);
                if (fileData && fileData.buffer) {
                    const filename = Date.now() + '-' + (fileData.originalname || 'fallback.webp');
                    const uploadDir = require('path').join(__dirname, '../../../public/uploads');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const localPath = require('path').join(uploadDir, filename);
                    fs.writeFileSync(localPath, fileData.buffer);
                    logger.info(`[LOCAL FALLBACK] File stored at /uploads/${filename}`);
                    return `/uploads/${filename}`;
                } else {
                    const localPath = typeof fileData === 'string' ? fileData : fileData.path;
                    const filename = localPath.split(/[\\/]/).pop();
                    return `/uploads/${filename}`;
                }
            }
        } else {
            // Local Development Fallback
            const localPath = typeof fileData === 'string' ? fileData : fileData.path;
            const filename = localPath ? localPath.split(/[\\/]/).pop() : 'placeholder.webp';
            const publicUrl = `/uploads/${filename}`;
            logger.info(`[LOCAL] File stored at ${publicUrl}`);
            return publicUrl;
        }
    }
}

module.exports = new CloudService();
