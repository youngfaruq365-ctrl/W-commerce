/**
 * GlobalX Input Validation Middleware
 * Uses Zod for schema validation
 */

const { z } = require('zod');
const DOMPurify = require('isomorphic-dompurify');

// Common validation schemas
const schemas = {
    // Auth schemas
    login: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required')
    }),
    
    signup: z.object({
        fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
        role: z.string().optional().transform(v => v ? v.toUpperCase() : v).refine(v => !v || ['BUYER', 'SELLER'].includes(v), { message: 'Role must be BUYER or SELLER' }),
        phone: z.string().optional()
    }),

    // Product schemas
    createProduct: z.object({
        title: z.string().min(3, 'Title must be at least 3 characters').max(200),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        price: z.preprocess((value) => Number(value), z.number().positive('Price must be positive')),
        category: z.string().min(1, 'Category is required'),
        stock: z.preprocess((value) => Number(value), z.number().int().min(0, 'Stock cannot be negative')),
        currency: z.string().default('USD')
    }),

    createFlashDeal: z.object({
        productId: z.string().uuid('Invalid product ID'),
        discount: z.preprocess((value) => Number(value), z.number().min(1).max(95)),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        maxStock: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().int().positive().optional()),
        promoType: z.string().optional(),
        promoTitle: z.string().max(160).optional(),
        bannerImage: z.string().optional(),
        targetRegion: z.string().optional()
    }),

    createBuyerRequest: z.object({
        productName: z.string().min(2).max(120),
        description: z.string().min(10).max(1500),
        budget: z.preprocess((value) => Number(value), z.number().nonnegative()),
        preferredBudgetMax: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().nonnegative().optional()),
        quantity: z.preprocess((value) => value === '' || value === undefined ? 1 : Number(value), z.number().int().positive()),
        urgency: z.string().optional(),
        category: z.string().optional(),
        location: z.string().optional(),
        neededBy: z.string().optional()
    }),

    // Order schemas
    createOrder: z.object({
        items: z.array(z.object({
            productId: z.string().uuid('Invalid product ID'),
            quantity: z.number().int().positive('Quantity must be at least 1')
        })).min(1, 'At least one item is required'),
        shippingAddress: z.string().min(1, 'Shipping address is required'),
        isConsolidated: z.boolean().optional()
    }),

    // Review schemas
    createReview: z.object({
        productId: z.string().uuid('Invalid product ID'),
        rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
        comment: z.string().max(1000, 'Comment too long').optional()
    }),

    // Profile update
    updateProfile: z.object({
        fullName: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        notificationPrefs: z.record(z.boolean()).optional()
    }),

    // Address
    address: z.object({
        type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().min(1, 'Country is required'),
        isDefault: z.boolean().optional()
    }),

    walletAmount: z.object({
        amount: z.preprocess((value) => Number(value), z.number().positive())
    }).passthrough(),

    walletWithdraw: z.object({
        amount: z.preprocess((value) => Number(value), z.number().positive()),
        destination: z.string().min(2).max(200).optional()
    }).passthrough(),

    walletTransfer: z.object({
        toUserId: z.string().uuid('Invalid recipient ID'),
        coin: z.enum(['GONG', 'GX', 'XP']).default('GONG'),
        amount: z.preprocess((value) => Number(value), z.number().positive()),
        description: z.string().max(200).optional()
    }).passthrough(),

    walletConvert: z.object({
        fromCoin: z.enum(['GONG', 'GX', 'XP']),
        toCoin: z.enum(['GONG', 'GX', 'XP']),
        amount: z.preprocess((value) => Number(value), z.number().positive())
    }).passthrough(),

    walletHold: z.object({
        coin: z.enum(['GONG', 'GX', 'XP']).default('GONG'),
        amount: z.preprocess((value) => Number(value), z.number().positive()),
        reason: z.string().max(60).optional(),
        referenceType: z.string().max(60).optional(),
        referenceId: z.string().max(120).optional()
    }),

    walletHoldAction: z.object({
        holdId: z.string().uuid('Invalid hold ID'),
        referenceType: z.string().max(60).optional(),
        referenceId: z.string().max(120).optional()
    }),

    conversionRate: z.object({
        fromCoin: z.enum(['GONG', 'GX', 'XP']),
        toCoin: z.enum(['GONG', 'GX', 'XP']),
        rate: z.preprocess((value) => Number(value), z.number().positive()),
        minAmount: z.preprocess((value) => value === undefined ? 0 : Number(value), z.number().nonnegative()).optional(),
        maxAmount: z.preprocess((value) => value === undefined || value === null || value === '' ? null : Number(value), z.number().positive().nullable()).optional(),
        isActive: z.boolean().optional()
    }),

    rewardRule: z.object({
        eventType: z.string().min(2).max(80),
        xpAmount: z.preprocess((value) => Number(value), z.number().nonnegative()),
        gxAmount: z.preprocess((value) => value === undefined ? 0 : Number(value), z.number().nonnegative()).optional(),
        discountAmount: z.preprocess((value) => value === undefined ? 0 : Number(value), z.number().nonnegative()).optional(),
        cooldownHours: z.preprocess((value) => value === undefined ? 0 : Number(value), z.number().int().nonnegative()).optional(),
        isActive: z.boolean().optional(),
        metadata: z.record(z.any()).optional()
    }),

    rewardGrant: z.object({
        userId: z.string().uuid().optional(),
        eventType: z.string().min(2).max(80),
        eventKey: z.string().min(4).max(160).optional(),
        xpAmount: z.preprocess((value) => value === undefined ? undefined : Number(value), z.number().nonnegative().optional()),
        gxAmount: z.preprocess((value) => value === undefined ? undefined : Number(value), z.number().nonnegative().optional()),
        referenceType: z.string().max(60).optional(),
        referenceId: z.string().max(120).optional(),
        metadata: z.record(z.any()).optional()
    }),

    sellerPlanSelect: z.object({
        planName: z.enum(['BASIC', 'PLUS', 'PRO', 'ELITE', 'ENTERPRISE'])
    }),

    sellerBenefit: z.object({
        benefitType: z.string().min(2).max(80),
        value: z.preprocess((value) => value === undefined ? 0 : Number(value), z.number().nonnegative()).optional(),
        isSellerEnabled: z.boolean().default(false)
    }),

    productBoost: z.object({
        productId: z.string().uuid('Invalid product ID'),
        gxCost: z.preprocess((value) => value === undefined ? 25 : Number(value), z.number().positive()).optional(),
        hours: z.preprocess((value) => value === undefined ? 24 : Number(value), z.number().positive()).optional()
    }),

    walletFreeze: z.object({
        userId: z.string().uuid('Invalid user ID'),
        reason: z.string().max(200).optional()
    }),

    // UUID parameter
    uuidParam: z.object({
        id: z.string().uuid('Invalid ID format')
    })
};
const validate = (schemaName, source = 'body') => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            console.error(`Validation schema '${schemaName}' not found`);
            return next();
        }

        try {
            const data = source === 'body' ? req.body 
                : source === 'query' ? req.query 
                : req.params;
            
            const validated = schema.parse(data);
            
            // Replace with validated data
            if (source === 'body') req.body = validated;
            else if (source === 'query') req.query = validated;
            
            next();
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: (error.errors || error.issues || []).map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            console.error('Validation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Validation error'
            });
        }
    };
};

/**
 * Sanitize string inputs to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return require('isomorphic-dompurify').sanitize(obj); // robust XSS prevention
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                result[key] = sanitize(obj[key]);
            }
            return result;
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    
    next();
};

module.exports = { validate, sanitizeInput, schemas };
