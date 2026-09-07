const prisma = require('../utils/prismaClient');
const walletService = require('../services/walletService');
const logger = require('../utils/logger');
const ApiClient = require('../utils/apiClient');
const exchangeRates = require('../utils/exchangeRates');

// Helper to get frontend base URL
const frontendBase = (req) => {
    return req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5175';
};

// Get all published templates (Marketplace)
exports.getTemplates = async (req, res) => {
    try {
        const { category, type } = req.query;
        
        const where = { status: 'PUBLISHED' };
        if (category) where.category = category;
        if (type) where.type = type;

        const templates = await prisma.template.findMany({
            where,
            orderBy: { isFeatured: 'desc' }, // Featured first
        });
        
        res.json({ success: true, templates });
    } catch (error) {
        logger.error(`Error fetching templates: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
};

// Get a specific template
exports.getTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.template.findUnique({
            where: { id }
        });
        
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        
        res.json({ success: true, template });
    } catch (error) {
        logger.error(`Error fetching template: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch template' });
    }
};

// Purchase a template
exports.purchaseTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;
        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
        
        if (!idempotencyKey) {
            return res.status(400).json({ success: false, message: 'Idempotency-Key is required' });
        }

        // Check if the template exists
        const template = await prisma.template.findUnique({ where: { id } });
        if (!template || template.status !== 'PUBLISHED') {
            return res.status(404).json({ success: false, message: 'Template not available' });
        }

        // Check if already owned
        const existingOwnership = await prisma.sellerTemplate.findUnique({
            where: { sellerId_templateId: { sellerId, templateId: template.id } }
        });
        
        if (existingOwnership) {
            return res.status(400).json({ success: false, message: 'Template already owned' });
        }

        const price = Number(template.price);
        const paymentMethod = req.body.paymentMethod || 'WALLET';
        
        if (price > 0 && paymentMethod === 'CARD') {
            const amountNgn = Math.round(price * exchangeRates.getRate(template.currency, 'NGN'));
            const reference = `TPL_PURCHASE_${template.id}_${Date.now()}`;
            
            let callback_url = `${frontendBase(req)}/dashboard`;
            if (req.body.redirectUrl) {
                try {
                    const url = new URL(req.body.redirectUrl);
                    url.searchParams.set('verify_template', reference);
                    callback_url = url.toString();
                } catch (e) {
                    callback_url = `${req.body.redirectUrl}?verify_template=${reference}`;
                }
            } else {
                callback_url += `?verify_template=${reference}`;
            }

            const response = await ApiClient.paystack('/transaction/initialize', 'POST', {
                email: req.user.email,
                amount: amountNgn * 100,
                currency: 'NGN',
                reference,
                metadata: {
                    type: 'TEMPLATE_PURCHASE',
                    userId: sellerId,
                    templateId: template.id,
                    price,
                    currency: template.currency,
                    idempotencyKey
                },
                callback_url
            });

            return res.json({
                success: true,
                provider: 'PAYSTACK',
                reference,
                authorization_url: response.data.authorization_url
            });
        }

        if (price > 0 && paymentMethod === 'WALLET') {
            // Check wallet balance
            const summary = await walletService.getSummary(sellerId);
            const availableBalance = summary.balances[template.currency]?.available || 0;
            
            if (availableBalance < price) {
                return res.status(400).json({
                    success: false, 
                    message: 'Insufficient wallet balance',
                    required: price,
                    available: availableBalance,
                    shortfall: price - availableBalance,
                    currency: template.currency
                });
            }
        }

        // Execute purchase in a transaction
        const result = await prisma.$transaction(async (tx) => {
            let purchaseRecord;
            
            if (price > 0) {
                // Debit wallet (only reached if paymentMethod === 'WALLET')
                await walletService.debit(sellerId, template.currency, price, {
                    idempotencyKey: `TPL_PURCHASE_${idempotencyKey}`,
                    referenceType: 'TEMPLATE_PURCHASE',
                    referenceId: template.id,
                    description: `Purchased template: ${template.name}`
                }, tx);
                
                // Log purchase
                purchaseRecord = await tx.templatePurchase.create({
                    data: {
                        sellerId,
                        templateId: template.id,
                        amount: price,
                        currency: template.currency,
                        paymentMethod: 'WALLET',
                        idempotencyKey: `PURCHASE_${idempotencyKey}`,
                        status: 'COMPLETED'
                    }
                });
            } else {
                purchaseRecord = await tx.templatePurchase.create({
                    data: {
                        sellerId,
                        templateId: template.id,
                        amount: 0,
                        currency: template.currency,
                        paymentMethod: 'FREE',
                        idempotencyKey: `PURCHASE_${idempotencyKey}`,
                        status: 'COMPLETED'
                    }
                });
            }

            // Grant ownership
            const ownershipRecord = await tx.sellerTemplate.create({
                data: {
                    sellerId,
                    templateId: template.id,
                    customizedConfiguration: template.configuration, // Start with default DNA
                    version: template.version,
                    status: 'OWNED'
                }
            });

            return { purchaseRecord, ownershipRecord };
        });

        res.json({ success: true, message: 'Template purchased successfully', data: result.ownershipRecord });
    } catch (error) {
        logger.error(`Template purchase error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message || 'Purchase failed' });
    }
};

// Get owned templates
exports.getMyTemplates = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const ownedTemplates = await prisma.sellerTemplate.findMany({
            where: { sellerId },
            include: {
                template: true,
                store: { select: { id: true, name: true, slug: true } }
            }
        });
        
        res.json({ success: true, templates: ownedTemplates });
    } catch (error) {
        logger.error(`Error fetching owned templates: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch your templates' });
    }
};

// Customize a template
exports.customizeTemplate = async (req, res) => {
    try {
        const { id } = req.params; // SellerTemplate ID
        const sellerId = req.user.id;
        const { configuration } = req.body;
        
        const sellerTemplate = await prisma.sellerTemplate.findUnique({
            where: { id }
        });
        
        if (!sellerTemplate || sellerTemplate.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        const updated = await prisma.sellerTemplate.update({
            where: { id },
            data: {
                customizedConfiguration: JSON.stringify(configuration),
                status: sellerTemplate.status === 'OWNED' ? 'CUSTOMIZED' : sellerTemplate.status
            }
        });
        
        res.json({ success: true, message: 'Configuration saved', template: updated });
    } catch (error) {
        logger.error(`Template customization error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to save configuration' });
    }
};

// Apply to a store
exports.applyTemplate = async (req, res) => {
    try {
        const { id } = req.params; // SellerTemplate ID
        const { storeId } = req.body;
        const sellerId = req.user.id;
        
        // Verify store ownership
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store || store.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to store' });
        }

        const sellerTemplate = await prisma.sellerTemplate.findUnique({ where: { id } });
        if (!sellerTemplate || sellerTemplate.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to template' });
        }

        const updated = await prisma.sellerTemplate.update({
            where: { id },
            data: {
                storeId,
                status: 'APPLIED',
                appliedAt: new Date()
            }
        });
        
        res.json({ success: true, message: 'Template applied to store successfully', template: updated });
    } catch (error) {
        logger.error(`Apply template error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to apply template' });
    }
};

// Unapply from a store
exports.unapplyTemplate = async (req, res) => {
    try {
        const { id } = req.params; // SellerTemplate ID
        const sellerId = req.user.id;
        
        const sellerTemplate = await prisma.sellerTemplate.findUnique({ where: { id } });
        if (!sellerTemplate || sellerTemplate.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to template' });
        }

        const updated = await prisma.sellerTemplate.update({
            where: { id },
            data: {
                storeId: null,
                status: 'CUSTOMIZED', // revert back to customized state
                appliedAt: null
            }
        });
        
        res.json({ success: true, message: 'Template unapplied successfully', template: updated });
    } catch (error) {
        logger.error(`Unapply template error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to unapply template' });
    }
};

// --- Storefront Route ---
// Get active templates for a storefront (public/buyer facing)
exports.getActiveStoreTemplates = async (req, res) => {
    try {
        const { storeId } = req.params;
        
        const activeTemplates = await prisma.sellerTemplate.findMany({
            where: {
                storeId,
                status: 'APPLIED'
            },
            include: {
                template: {
                    select: { type: true, name: true }
                }
            }
        });
        
        // Map out only what the storefront needs
        const response = activeTemplates.map(st => ({
            id: st.id,
            type: st.template.type,
            name: st.template.name,
            configuration: JSON.parse(st.customizedConfiguration || "{}")
        }));
        
        res.json({ success: true, templates: response });
    } catch (error) {
        logger.error(`Get active store templates error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to get store templates' });
    }
};

// Verify a template purchase via Paystack
exports.verifyPurchase = async (req, res) => {
    try {
        const { reference } = req.params;
        const sellerId = req.user.id;

        // Verify with Paystack
        const response = await ApiClient.paystack(`/transaction/verify/${reference}`, 'GET');
        const data = response.data || {};
        
        if (data.status !== 'success' || data.metadata?.type !== 'TEMPLATE_PURCHASE') {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const templateId = data.metadata.templateId;
        const price = Number(data.metadata.price);
        const currency = data.metadata.currency;
        const idempotencyKey = data.metadata.idempotencyKey;

        const template = await prisma.template.findUnique({ where: { id: templateId } });
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        // Check if already owned
        const existingOwnership = await prisma.sellerTemplate.findUnique({
            where: { sellerId_templateId: { sellerId, templateId } }
        });
        
        if (existingOwnership) {
            return res.json({ success: true, message: 'Template already owned', data: existingOwnership });
        }

        // Execute in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Log purchase
            const purchaseRecord = await tx.templatePurchase.create({
                data: {
                    sellerId,
                    templateId,
                    amount: price,
                    currency,
                    paymentMethod: 'CARD',
                    idempotencyKey: `PURCHASE_${idempotencyKey || Date.now()}`,
                    status: 'COMPLETED'
                }
            });

            // Grant ownership
            const ownershipRecord = await tx.sellerTemplate.create({
                data: {
                    sellerId,
                    templateId,
                    customizedConfiguration: template.configuration,
                    version: template.version,
                    status: 'OWNED'
                }
            });

            return ownershipRecord;
        });

        res.json({ success: true, message: 'Template purchased successfully', data: result });
    } catch (error) {
        logger.error(`Verify template purchase error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to verify template purchase' });
    }
};
