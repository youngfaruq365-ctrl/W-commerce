/**
 * Paystack Subaccount & Transfer Service
 * Handles:
 * 1. Creating subaccounts for sellers (split payments)
 * 2. Creating transfer recipients for payouts
 * 3. Initiating transfers (payouts to sellers)
 */

const logger = require('../utils/logger');
const ApiClient = require('../utils/apiClient');
const { allowMockExternalApis, isPaystackSecretConfigured } = require('../utils/providerConfig');

const paystackRequest = (endpoint, method, data) => ApiClient.paystack(endpoint, method, data);

function getPaystackUnavailableError(action) {
    return new Error(`Paystack seller payouts are not configured. Cannot ${action} until PAYSTACK_SECRET_KEY is set.`);
}

/**
 * Check if Paystack is configured
 */
function isConfigured() {
    return isPaystackSecretConfigured();
}

// =====================================================
// 1. SUBACCOUNTS (Split Payments)
// =====================================================

/**
 * Create a Paystack subaccount for a seller
 * This enables automatic split payments on every transaction
 * 
 * @param {Object} store - Store object with bank details
 * @returns {Object} - Paystack subaccount response
 */
async function createSubaccount(store) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('create a seller subaccount');
        }
        const mockCode = `ACCT_mock_${store.id.substring(0, 8)}`;
        logger.warn(`[PAYSTACK MOCK] Created subaccount: ${mockCode}`);
        return { subaccount_code: mockCode, mock: true };
    }

    try {
        // Map bank country to Paystack-supported bank codes
        const bankCode = await resolveBankCode(store.bankName, store.bankCountry || 'NG');

        const response = await paystackRequest('/subaccount', 'POST', {
            business_name: store.storeName,
            settlement_bank: bankCode,
            account_number: store.accountNumber,
            percentage_charge: 90, // Seller gets 90%, platform keeps 10%
            description: `GlobalX Seller: ${store.storeName}`,
            primary_contact_email: store.user?.email,
            metadata: {
                storeId: store.id,
                sellerId: store.sellerId,
                platform: 'globalx'
            }
        });

        if (response.status && response.data) {
            logger.info(`[PAYSTACK] Subaccount created: ${response.data.subaccount_code} for store ${store.storeName}`);
            return response.data;
        }

        throw new Error(response.message || 'Failed to create subaccount');
    } catch (error) {
        logger.error(`[PAYSTACK] Create Subaccount Error: ${error.message}`);
        throw error;
    }
}

/**
 * Update an existing subaccount (e.g., change bank details)
 */
async function updateSubaccount(subaccountCode, updateData) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('update a seller subaccount');
        }
        logger.warn(`[PAYSTACK MOCK] Updated subaccount: ${subaccountCode}`);
        return { subaccount_code: subaccountCode, mock: true };
    }

    try {
        const response = await paystackRequest(`/subaccount/${subaccountCode}`, 'PUT', updateData);
        if (response.status) {
            logger.info(`[PAYSTACK] Subaccount updated: ${subaccountCode}`);
            return response.data;
        }
        throw new Error(response.message || 'Failed to update subaccount');
    } catch (error) {
        logger.error(`[PAYSTACK] Update Subaccount Error: ${error.message}`);
        throw error;
    }
}

/**
 * Get subaccount details
 */
async function getSubaccount(subaccountCode) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('fetch seller subaccount details');
        }
        return { subaccount_code: subaccountCode, percentage_charge: 90, mock: true };
    }

    try {
        const response = await paystackRequest(`/subaccount/${subaccountCode}`, 'GET');
        return response.data;
    } catch (error) {
        logger.error(`[PAYSTACK] Get Subaccount Error: ${error.message}`);
        throw error;
    }
}

/**
 * Create a payment with split (subaccount-based)
 * Used when initializing transactions for stores with subaccounts
 *
 * @param {Object} params
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in kobo
 * @param {string} params.subaccountCode - Seller's subaccount code
 * @param {Object} params.metadata - Transaction metadata
 * @param {string} params.callbackUrl - Payment callback URL
 * @returns {Object} - Transaction initialization response
 */
async function createSplitPayment({ email, amount, subaccountCode, metadata, callbackUrl }) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('create a split payment');
        }
        const ref = `GX-SPLIT-${Date.now()}`;
        logger.warn(`[PAYSTACK MOCK] Split payment: ${amount} kobo to ${subaccountCode}`);
        return {
            reference: ref,
            authorization_url: `${callbackUrl}?reference=${ref}`,
            mock: true
        };
    }

    try {
        const response = await paystackRequest('/transaction/initialize', 'POST', {
            email,
            amount,
            subaccount: subaccountCode,
            // bearer: 'subaccount', // Subaccount bears the transaction fees
            // OR bearer: 'account' for platform to bear fees
            metadata: {
                ...metadata,
                split_payment: true
            },
            callback_url: callbackUrl
        });

        if (response.status && response.data) {
            logger.info(`[PAYSTACK] Split payment initialized: ${response.data.reference}`);
            return response.data;
        }

        throw new Error(response.message || 'Failed to initialize split payment');
    } catch (error) {
        logger.error(`[PAYSTACK] Split Payment Error: ${error.message}`);
        throw error;
    }
}

// =====================================================
// 2. TRANSFER RECIPIENTS (Payout Setup)
// =====================================================

/**
 * Create a transfer recipient for a seller (required before making transfers)
 * 
 * @param {Object} store - Store/seller with bank details
 * @returns {Object} - Paystack recipient response with recipient_code
 */
async function createTransferRecipient(store) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('create a transfer recipient');
        }
        const mockCode = `RCP_mock_${store.id.substring(0, 8)}`;
        logger.warn(`[PAYSTACK MOCK] Created recipient: ${mockCode}`);
        return { recipient_code: mockCode, mock: true };
    }

    try {
        const bankCode = await resolveBankCode(store.bankName, store.bankCountry || 'NG');

        const response = await paystackRequest('/transferrecipient', 'POST', {
            type: 'nuban', // Nigerian bank account; use 'ghipss' for Ghana, 'basa' for SA
            name: store.accountName || store.storeName,
            account_number: store.accountNumber,
            bank_code: bankCode,
            currency: store.bankCountry === 'GH' ? 'GHS' : 'NGN',
            metadata: {
                storeId: store.id,
                sellerId: store.sellerId,
                platform: 'globalx'
            }
        });

        if (response.status && response.data) {
            logger.info(`[PAYSTACK] Transfer recipient created: ${response.data.recipient_code}`);
            return response.data;
        }

        throw new Error(response.message || 'Failed to create transfer recipient');
    } catch (error) {
        logger.error(`[PAYSTACK] Create Recipient Error: ${error.message}`);
        throw error;
    }
}

// =====================================================
// 3. TRANSFERS (Payouts to Sellers)
// =====================================================

/**
 * Initiate a transfer (payout) to a seller
 * 
 * @param {Object} params
 * @param {string} params.recipientCode - Paystack recipient code
 * @param {number} params.amount - Amount in kobo
 * @param {string} params.reason - Transfer reason/description
 * @param {string} params.reference - Unique transfer reference
 * @returns {Object} - Transfer response
 */
async function initiateTransfer({ recipientCode, amount, reason, reference }) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('initiate a seller payout');
        }
        const mockId = `TRF_mock_${Date.now()}`;
        logger.warn(`[PAYSTACK MOCK] Transfer: ${amount} kobo to ${recipientCode}`);
        return {
            transfer_code: mockId,
            reference: reference || mockId,
            status: 'success',
            mock: true
        };
    }

    try {
        const response = await paystackRequest('/transfer', 'POST', {
            source: 'balance', // Transfer from Paystack balance
            recipient: recipientCode,
            amount, // Amount in kobo
            reason: reason || 'GlobalX Seller Payout',
            reference: reference || `GX-PAY-${Date.now()}`
        });

        if (response.status && response.data) {
            logger.info(`[PAYSTACK] Transfer initiated: ${response.data.transfer_code}, status: ${response.data.status}`);
            return response.data;
        }

        throw new Error(response.message || 'Failed to initiate transfer');
    } catch (error) {
        logger.error(`[PAYSTACK] Transfer Error: ${error.message}`);
        throw error;
    }
}

/**
 * Verify a transfer status
 */
async function verifyTransfer(reference) {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('verify a seller payout');
        }
        return { status: 'success', mock: true };
    }

    try {
        const response = await paystackRequest(`/transfer/verify/${reference}`, 'GET');
        return response.data;
    } catch (error) {
        logger.error(`[PAYSTACK] Verify Transfer Error: ${error.message}`);
        throw error;
    }
}

/**
 * Get Paystack balance (to check if there's enough for payouts)
 */
async function getBalance() {
    if (!isConfigured()) {
        if (!allowMockExternalApis()) {
            throw getPaystackUnavailableError('check Paystack payout balance');
        }
        // Return empty array in mock/dev mode — do NOT fabricate financial data
        logger.warn('[PAYSTACK] Mock mode: returning empty balance. Configure PAYSTACK_SECRET_KEY for real data.');
        return [];
    }

    try {
        const response = await paystackRequest('/balance', 'GET');
        return response.data;
    } catch (error) {
        logger.error(`[PAYSTACK] Balance Check Error: ${error.message}`);
        throw error;
    }
}

// =====================================================
// HELPER: Resolve Bank Code from Bank Name
// =====================================================

/**
 * Resolve Paystack bank code from a bank name
 */
async function resolveBankCode(bankName, country = 'NG') {
    const bankCodes = {
        'access bank': '044', 'citibank': '023', 'diamond bank': '063',
        'ecobank': '050', 'fidelity bank': '070', 'first bank': '011',
        'first city monument bank': '214', 'fcmb': '214',
        'guaranty trust bank': '058', 'gtbank': '058', 'heritage bank': '030',
        'keystone bank': '082', 'polaris bank': '076', 'providus bank': '101',
        'stanbic ibtc bank': '221', 'standard chartered bank': '068',
        'sterling bank': '232', 'union bank': '032',
        'united bank for africa': '033', 'uba': '033', 'unity bank': '215',
        'wema bank': '035', 'zenith bank': '057', 'kuda bank': '090267',
        'opay': '100004', 'palmpay': '100033', 'moniepoint': '50515',
    };

    const normalizedName = (bankName || '').toLowerCase().trim();
    const code = bankCodes[normalizedName];
    if (code) return code;

    // If not found in cache, try to fetch from Paystack API
    if (isConfigured()) {
        try {
            const response = await paystackRequest(`/bank?country=${country}`, 'GET');
            if (response.status && response.data) {
                const match = response.data.find(
                    b => b.name.toLowerCase().includes(normalizedName) ||
                        normalizedName.includes(b.name.toLowerCase())
                );
                if (match) return match.code;
            }
        } catch (e) {
            logger.warn(`[PAYSTACK] Bank code lookup failed: ${e.message}`);
        }
    }

    // Fallback
    if (allowMockExternalApis()) {
        logger.warn(`[PAYSTACK] Could not resolve bank code for: ${bankName}. Using placeholder because mock APIs are enabled.`);
        return '000';
    }

    throw new Error(`Could not resolve bank code for: ${bankName}`);
}

module.exports = {
    isConfigured,
    // Subaccounts
    createSubaccount,
    updateSubaccount,
    getSubaccount,
    createSplitPayment,
    // Transfers
    createTransferRecipient,
    initiateTransfer,
    verifyTransfer,
    getBalance,
    // Helpers
    resolveBankCode
};
