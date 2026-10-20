const wishlistService = require('../services/wishlistService');

exports.getWishlist = async (req, res) => {
    try {
        const items = await wishlistService.getWishlist(req.user.id);
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.getWishlistCount = async (req, res) => {
    try {
        const items = await wishlistService.getWishlist(req.user.id);
        res.json({ success: true, count: items.length });
    } catch (error) {
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId || req.body.productId;
        const { priority, targetPrice } = req.body;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.addToWishlist(req.user.id, productId, priority, targetPrice);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const productId = req.params.productId || req.body.productId;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.removeFromWishlist(req.user.id, productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};

exports.subscribeToRestock = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
        const result = await wishlistService.subscribeToRestock(req.user.id, productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message });
    }
};
