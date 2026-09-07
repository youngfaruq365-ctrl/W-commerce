const fs = require('fs');
const filePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\backend\\routes\\wishlistRoutes.js';

const content = `const express = require('express');
const router = express.Router();
const wishlistService = require('../services/wishlistService');
const { protect } = require('../middleware/authMiddleware');

// Get buyer's wishlist
router.get('/', protect, async (req, res) => {
    try {
        const items = await wishlistService.getWishlist(req.user.id);
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get buyer's wishlist count
router.get('/count', protect, async (req, res) => {
    try {
        const items = await wishlistService.getWishlist(req.user.id);
        res.json({ success: true, count: items.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add to wishlist
router.post('/:productId', protect, async (req, res) => {
    try {
        const { productId } = req.params;
        const { priority, targetPrice } = req.body;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.addToWishlist(req.user.id, productId, priority, targetPrice);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remove from wishlist
router.delete('/:productId', protect, async (req, res) => {
    try {
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.removeFromWishlist(req.user.id, productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Subscribe to restock notifications
router.post('/:productId/restock-subscribe', protect, async (req, res) => {
    try {
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.subscribeToRestock(req.user.id, productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log("Wishlist routes updated");
