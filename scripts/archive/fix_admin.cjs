const fs = require('fs');
const lines = fs.readFileSync('src/backend/controllers/adminController.js', 'utf8').split('\n');
const insertIdx = lines.findIndex(l => l.includes('exports.getPayoutRequests = async'));

const func = `exports.processVerification = async (req, res) => {
    try {
        const { requestId, status, adminNotes } = req.body;

        const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        const updatedRequest = await prisma.verificationRequest.update({
            where: { id: requestId },
            data: { status, adminNotes }
        });

        if (status === 'APPROVED') {
            const newTier = request.type === 'KYB' || request.entityType === 'BUSINESS' ? 3 : 2;
            await prisma.user.update({
                where: { id: request.userId },
                data: { isVerified: true, kycTier: newTier }
            });

            const userStore = await prisma.store.findUnique({ where: { sellerId: request.userId } });
            if (userStore) {
                await prisma.store.update({
                    where: { id: userStore.id },
                    data: { isVerified: true }
                });
            }
        }

        await prisma.systemLog.create({
            data: {
                adminId: req.user.id,
                action: 'PROCESS_VERIFICATION',
                targetId: requestId,
                details: JSON.stringify({ status, adminNotes }),
                ipAddress: req.ip
            }
        });

        res.json({ success: true, request: updatedRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
`;

lines.splice(insertIdx, 0, func);
fs.writeFileSync('src/backend/controllers/adminController.js', lines.join('\n'));
console.log('Fixed adminController');
