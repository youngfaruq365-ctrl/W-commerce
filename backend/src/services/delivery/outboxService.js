// src/backend/services/delivery/outboxService.js
const prisma = require('../../utils/prismaClient');

const processOutbox = async () => {
    const events = await prisma.notificationOutbox.findMany({
        where: { status: 'PENDING' },
        take: 50,
        orderBy: { createdAt: 'asc' }
    });

    for (const event of events) {
        try {
            await prisma.notificationOutbox.update({
                where: { id: event.id },
                data: { status: 'PROCESSING', lastAttemptAt: new Date(), attempts: { increment: 1 } }
            });

            await prisma.notificationOutbox.update({
                where: { id: event.id },
                data: { status: 'COMPLETED' }
            });
        } catch (error) {
            console.error(`Failed to process outbox event ${event.id}:`, error);
            await prisma.notificationOutbox.update({
                where: { id: event.id },
                data: { status: 'FAILED', error: error.message }
            });
        }
    }
};

module.exports = { processOutbox };
