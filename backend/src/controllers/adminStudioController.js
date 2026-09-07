// adminStudioController.js

const prisma = require('../utils/prismaClient');

const performStudioAction = async (req, res) => {
    try {
        const { action, targetId, details } = req.body;
        const actionPath = req.path.split('/')[1] || 'general';
        const finalAction = action || `STUDIO_ACTION_${actionPath.toUpperCase()}`;
        const finalTarget = targetId || 'STUDIO';
        
        let adminId = req.user?.id;
        
        if (!adminId) {
            const admin = await prisma.user.findFirst({
                where: { role: 'ADMIN' }
            });
            if (admin) {
                adminId = admin.id;
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'No admin user found to attribute this action'
                });
            }
        }

        await prisma.systemLog.create({
            data: {
                adminId: adminId,
                action: finalAction,
                targetId: finalTarget,
                details: details ? JSON.stringify(details) : JSON.stringify({ path: req.originalUrl }),
                ipAddress: req.ip || '127.0.0.1'
            }
        });
        
        return res.status(200).json({
            success: true,
            message: 'Action completed successfully'
        });
    } catch (error) {
        console.error('Admin studio action error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    performStudioAction
};
