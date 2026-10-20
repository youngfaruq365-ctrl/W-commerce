const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

// Internal helper: upload a single file buffer to Cloudinary or save to disk
async function uploadSingleFile(file) {
    // Cloudinary path
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        return new Promise((resolve, reject) => {
            if (!file.buffer) return reject(new Error('File buffer missing for cloud upload'));
            
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'globalx/disputes', resource_type: 'auto' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            
            // Handle stream errors
            uploadStream.on('error', (err) => reject(err));
            
            const rs = streamifier.createReadStream(file.buffer);
            rs.on('error', (err) => reject(err));
            rs.pipe(uploadStream);
        });
    }
    
    // Local fallback: write the buffer to disk if memoryStorage was used
    const filename = file.filename || (file.fieldname + '_' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname));
    const filePath = path.join(__dirname, '../../storage/uploads', filename);
    
    if (file.buffer) {
        const fs = require('fs');
        await fs.promises.writeFile(filePath, file.buffer);
    }
    
    return `/uploads/${filename}`;
}

// POST /api/upload
// Protected route: Any authenticated user can upload (for chat, profiles, etc.)
// Supports local, S3, or Cloudinary storage based on .env configuration
router.post('/', protect, uploadMiddleware.upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let imageUrl;

        // Try to upload to cloud (S3 or Cloudinary) if configured
        try {
            imageUrl = await uploadMiddleware.uploadToCloud(req, res);
        } catch (cloudError) {
            console.error('[UPLOAD] Cloud upload failed, falling back to local:', cloudError.message);
            // Fall back to local storage
            imageUrl = `/uploads/${req.file.filename}`;
        }

        // Return the accessible URL
        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imageUrl,
            storage: imageUrl.startsWith('http') ? 'cloud' : 'local'
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

// POST /api/upload/multiple
// Upload multiple images
router.post('/multiple', protect, uploadMiddleware.upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const imageUrls = [];

        for (const file of req.files) {
            try {
                const url = await uploadSingleFile(file);
                imageUrls.push(url);
            } catch (fileError) {
                console.error('[UPLOAD] Failed to upload file:', file.originalname, fileError.message);
                // Skip failed files rather than crashing the whole request
            }
        }

        res.json({
            success: true,
            message: 'Images uploaded successfully',
            urls: imageUrls,
            imageUrls: imageUrls
        });

    } catch (error) {
        console.error('Multi Upload Error:', error);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

module.exports = router;
