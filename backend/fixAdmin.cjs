const fs = require('fs');

const path = 'c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/backend/src/controllers/adminController.js';
let content = fs.readFileSync(path, 'utf8');

const startStr = 'exports.getPendingBankTransfers = async (req, res) => {';
const endStr = '// Log Action';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const newBlock = `exports.getPendingBankTransfers = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { status: 'PENDING_VERIFICATION' },
            include: {
                buyer: { select: { fullName: true, email: true } }
            },
            orderBy: { updatedAt: 'asc' }
        });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.verifyBankTransfer = async (req, res) => {
    try {
        const { orderId, action, adminNotes } = req.body; // action: 'APPROVE', 'REJECT'

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (action === 'APPROVE') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAID' }
            });

            // Notify User
            let messageTitle = 'Payment Verified';
            let messageBody = \`Your bank transfer for Order #\${orderId.substring(0, 8)} has been verified. We are now processing your shipment.\`;

            // SPECIAL CHECK: Was this an Access Fee Order?
            if (order.orderType === 'SUBSCRIPTION') {
                const tier = parseFloat(order.totalAmount) < 2.0 ? 'MONTHLY' : 'YEARLY';
                await finalizeSubscription(order.buyerId, \`MANUAL-ADMIN-\${orderId}\`, parseFloat(order.totalAmount), 'BANK_TRANSFER', tier);

                messageTitle = 'Access Pass Activated';
                messageBody = \`Your \${tier} Access Pass is now active! Log out and back in to see premium features.\`;
            }

            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    title: messageTitle,
                    body: messageBody,
                    type: 'SUCCESS'
                }
            });
        } else {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'FAILED' }
            });

            // Update associated transaction
            await prisma.transaction.updateMany({
                where: { referenceId: orderId, type: 'PURCHASE' },
                data: { status: 'FAILED' }
            });

            // Notify User
            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    title: 'Payment Verification Failed',
                    body: \`The proof of payment for Order #\${orderId.substring(0, 8)} could not be verified. \${adminNotes || 'Please contact support.'}\`,
                    type: 'ALERT'
                }
            });
        }

        `;

    content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed adminController.js successfully!');
} else {
    console.log('Could not find start or end strings.');
}
