const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

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
            let imageUrl;
            try {
                // Create a mock req.file for each file to use the cloud upload
                const mockReq = { file: file };
                imageUrl = await uploadMiddleware.uploadToCloud(mockReq, res);
            } catch (cloudError) {
                imageUrl = `/uploads/${file.filename}`;
            }
            imageUrls.push(imageUrl);
        }

        res.json({
            success: true,
            message: 'Images uploaded successfully',
            imageUrls: imageUrls
        });

    } catch (error) {
        console.error('Multi Upload Error:', error);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

module.exports = router;
