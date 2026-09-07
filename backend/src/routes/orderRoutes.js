const express = require('express');
 const router = express.Router();
 const orderController = require('../controllers/orderController');
 const trackingService = require('../services/trackingService');
 const { protect, authorize, requirePaidAccess } = require('../middleware/authMiddleware');
 const uploadMiddleware = require('../middleware/uploadMiddleware');

 router.post('/', protect, requirePaidAccess, orderController.createOrder);
 router.post('/direct', protect, requirePaidAccess, orderController.createDirectOrder);
 router.get('/seller', protect, authorize('SELLER', 'ADMIN'), requirePaidAccess, orderController.getSellerOrders);
 router.get('/buyer', protect, orderController.getBuyerOrders);
 router.post('/update-status', protect, authorize('SELLER', 'ADMIN'), requirePaidAccess, orderController.updateOrderStatus);
 router.post('/dispute', protect, requirePaidAccess, orderController.raiseDispute);
 router.post('/confirm-receipt', protect, orderController.confirmReceipt);
 router.get('/buy-again', protect, orderController.getBuyAgainSuggestions);
 router.post('/:id/reorder', protect, orderController.reorderOrder);
 router.get('/:id/tracking', protect, orderController.getOrderTracking);
 router.get('/:id/trust-timeline', protect, orderController.getTrustTimeline);
 router.post('/tracking', protect, requirePaidAccess, orderController.addTrackingEvent);
 router.post('/:id/upload-proof', protect, uploadMiddleware.upload.single('proof'), orderController.uploadProofOnOrder);
 router.post('/:id/approve-proof', protect, authorize('SELLER', 'ADMIN'), orderController.approvePaymentProof);
 router.post('/:id/reject-proof', protect, authorize('SELLER', 'ADMIN'), orderController.rejectPaymentProof);
 router.post('/:id/request-address', protect, authorize('SELLER', 'ADMIN'), orderController.requestOrderAddress);
 router.post('/:id/update-address', protect, orderController.updateOrderAddress);
 router.get('/:id', protect, orderController.getOrderById);

 module.exports = router;
