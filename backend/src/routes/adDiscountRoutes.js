const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const adDiscountService = require('../services/adDiscountService');

// POST /api/v1/ads/discount/start
// Starts the discount session by watching the first ad
router.post('/start', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const session = await adDiscountService.startAdDiscountSession(req.user.id, productId);
    res.json({
      success: true,
      message: 'Ad discount session started. 2% discount applied.',
      data: session
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v1/ads/discount/claim-next
// Claims the next stage of the discount
router.post('/claim-next', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const session = await adDiscountService.claimNextAdDiscount(req.user.id, productId);
    res.json({
      success: true,
      message: `Discount increased to ${session.currentDiscountPct}%.`,
      data: session
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/ads/discount/status/:productId
// Fetches the active discount session
router.get('/status/:productId', protect, async (req, res) => {
  try {
    const session = await adDiscountService.getActiveSession(req.user.id, req.params.productId);
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/ads/discount/my-sessions
// Fetches all active discount sessions for the logged in user
router.get('/my-sessions', protect, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const sessions = await prisma.adDiscountSession.findMany({
      where: {
        buyerId: req.user.id,
        currentDiscountPct: { gt: 0 }
      }
    });
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
