const crypto = require('crypto');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { PACKING_RESPONSE_TEMPLATES } = require('../models/marketplaceIntelligenceModel');

function generateShortCode(length = 6) {
    return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

class PackingWorkflowService {
    buildPackingIdentifiers(orderId) {
        // Generate a random 4-digit string
        const random4Digit = Math.floor(1000 + Math.random() * 9000).toString();
        return {
            packingSerial: `PK-${String(orderId).slice(0, 8).toUpperCase()}-${generateShortCode(4)}`,
            packingConfirmationCode: random4Digit
        };
    }

    getResponseTemplate(templateKey) {
        return PACKING_RESPONSE_TEMPLATES[String(templateKey || '').toUpperCase()] || null;
    }

    async escalateExpiredIssues() {
        try {
            const now = new Date();
            const issues = await prisma.packingIssue.findMany({
                where: {
                    status: 'OPEN',
                    responseDeadline: {
                        lte: now
                    },
                    escalatedAt: null
                }
            });

            for (const issue of issues) {
                await prisma.packingIssue.update({
                    where: { id: issue.id },
                    data: {
                        status: 'ESCALATED',
                        escalatedAt: now
                    }
                });

                await prisma.order.update({
                    where: { id: issue.orderId },
                    data: {
                        status: 'DISPUTED',
                        escalatedAt: now
                    }
                });
            }

            return issues;
        } catch (error) {
            logger.error(`Packing escalation error: ${error.message}`);
            return [];
        }
    }
}

module.exports = new PackingWorkflowService();
