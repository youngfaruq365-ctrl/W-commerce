const { getCourierDashboard, getDeliveryQueue, acceptDelivery, negotiateDelivery, completeDelivery } = require('../controllers/deliveryController');
const prisma = require('../utils/prismaClient');
const socketService = require('../services/socketService');

jest.mock('../utils/prismaClient', () => ({
  courierProfile: {
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  deliveryAssignment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  deliveryOffer: {
    create: jest.fn(),
  },
  order: {
    update: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
  }
}));

jest.mock('../services/socketService', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  }))
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Delivery Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-1', subscriptionTier: 'COURIER_PRO' },
      params: {},
      query: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('getDeliveryQueue', () => {
    it('should return 403 if courier profile not found', async () => {
      prisma.courierProfile.findUnique.mockResolvedValue(null);
      await getDeliveryQueue(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return queue data if courier is PRO', async () => {
      prisma.courierProfile.findUnique.mockResolvedValue({ id: 'courier-1', user: {} });
      prisma.deliveryAssignment.findMany.mockResolvedValue([{ id: 'assign-1', status: 'PENDING' }]);
      
      await getDeliveryQueue(mockReq, mockRes);
      expect(prisma.deliveryAssignment.findMany).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
    });

    it('should block FREE courier if weekly limit reached', async () => {
      mockReq.user.subscriptionTier = 'COURIER_FREE';
      prisma.courierProfile.findUnique.mockResolvedValue({ id: 'courier-1', user: {} });
      prisma.deliveryAssignment.count.mockResolvedValue(1); // Already did 1 delivery

      await getDeliveryQueue(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ limitReached: true }));
    });
  });

  describe('acceptDelivery', () => {
    it('should return 404 if assignment not found', async () => {
      mockReq.params.id = 'assign-1';
      prisma.courierProfile.findUnique.mockResolvedValue({ id: 'courier-1', user: {} });
      prisma.deliveryAssignment.findUnique.mockResolvedValue(null);

      await acceptDelivery(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should assign courier and notify seller', async () => {
      mockReq.params.id = 'assign-1';
      prisma.courierProfile.findUnique.mockResolvedValue({ id: 'courier-1', user: {} });
      prisma.deliveryAssignment.findUnique.mockResolvedValue({ id: 'assign-1', status: 'PENDING' });
      
      prisma.deliveryAssignment.update.mockResolvedValue({
        id: 'assign-1',
        orderId: 'order-1',
        order: { sellerId: 'seller-1' }
      });

      await acceptDelivery(mockReq, mockRes);
      expect(prisma.deliveryAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { courierId: 'courier-1', status: 'COURIER_ACCEPTED' }
      }));
      expect(prisma.order.update).toHaveBeenCalled();
      expect(socketService.getIO).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('negotiateDelivery', () => {
    it('should fail if proposedFee is missing', async () => {
      mockReq.params.id = 'assign-1';
      await negotiateDelivery(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create an offer and notify seller', async () => {
      mockReq.params.id = 'assign-1';
      mockReq.body.proposedFee = 5000;
      prisma.courierProfile.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.deliveryAssignment.findUnique.mockResolvedValue({ 
        id: 'assign-1', status: 'PENDING', order: { id: 'order-1', sellerId: 'seller-1' } 
      });
      prisma.deliveryOffer.create.mockResolvedValue({ id: 'offer-1' });

      await negotiateDelivery(mockReq, mockRes);
      
      expect(prisma.deliveryOffer.create).toHaveBeenCalled();
      expect(socketService.getIO().to).toHaveBeenCalledWith('seller-1');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
