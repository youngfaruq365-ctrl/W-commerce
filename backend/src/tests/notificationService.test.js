const notificationService = require('../services/notificationService');
const prisma = require('../utils/prismaClient');

describe('NotificationService', () => {
    beforeEach(async () => {
        // Clean up test data
        await prisma.buyerNotification.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    test('should create a notification successfully', async () => {
        const testUserId = 'test-user-id';
        const testMessage = 'Test notification message';
        const testType = 'order_due';

        const notification = await notificationService.createNotification({
            userId: testUserId,
            message: testMessage,
            type: testType
        });

        expect(notification).toBeDefined();
        expect(notification.userId).toBe(testUserId);
        expect(notification.message).toBe(testMessage);
        expect(notification.type).toBe(testType);
        expect(notification.channel).toBe('in_app');
        expect(notification.readStatus).toBe(false);
    });

    test('should get buyer notifications with pagination', async () => {
        const testUserId = 'test-user-id';

        // Create multiple notifications
        await notificationService.createNotification({
            userId: testUserId,
            message: 'First notification',
            type: 'order_due'
        });

        await notificationService.createNotification({
            userId: testUserId,
            message: 'Second notification',
            type: 'delivery_update'
        });

        const { notifications, total } = await notificationService.getBuyerNotifications(testUserId, { limit: 1 });

        expect(total).toBe(2);
        expect(notifications).toHaveLength(1);
        expect(notifications[0].message).toBe('Second notification'); // Most recent first
    });

    test('should mark notification as read', async () => {
        const testUserId = 'test-user-id';

        const notification = await notificationService.createNotification({
            userId: testUserId,
            message: 'Test notification',
            type: 'order_due'
        });

        await notificationService.markAsRead(notification.id, testUserId);

        const updatedNotification = await prisma.buyerNotification.findUnique({
            where: { id: notification.id }
        });

        expect(updatedNotification.readStatus).toBe(true);
    });

    test('should mark all notifications as read', async () => {
        const testUserId = 'test-user-id';

        await notificationService.createNotification({
            userId: testUserId,
            message: 'First notification',
            type: 'order_due'
        });

        await notificationService.createNotification({
            userId: testUserId,
            message: 'Second notification',
            type: 'delivery_update'
        });

        await notificationService.markAllAsRead(testUserId);

        const notifications = await prisma.buyerNotification.findMany({
            where: { userId: testUserId }
        });

        expect(notifications.every(n => n.readStatus)).toBe(true);
    });
});