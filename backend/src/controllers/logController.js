const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

exports.getSystemLogs = async (req, res) => {
    try {
        const { limit = 50, page = 1, search } = req.query;
        const skip = (page - 1) * limit;

        const where = search ? {
            OR: [
                { action: { contains: search } },
                { details: { contains: search } },
                { admin: { fullName: { contains: search } } }
            ]
        } : {};

        const logs = await prisma.systemLog.findMany({
            where,
            skip: parseInt(skip),
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                admin: {
                    select: { fullName: true, email: true, role: true }
                }
            }
        });

        const total = await prisma.systemLog.count({ where });

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error(`Get Logs Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createLog = async (adminId, action, targetId, details, req) => {
    try {
        await prisma.systemLog.create({
            data: {
                adminId,
                action,
                targetId: targetId || 'SYSTEM',
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'INTERNAL'
            }
        });
    } catch (err) {
        logger.error(`Failed to create log: ${err.message}`);
    }
};
