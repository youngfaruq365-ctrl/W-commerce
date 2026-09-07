// backend/src/services/kycService.js
const prisma = require('../utils/prismaClient');
const crypto = require('crypto');
const logger = require('../utils/logger');
const axios = require('axios');

const SMILE_API_KEY = process.env.SMILE_IDENTITY_API_KEY;
const SMILE_PARTNER_ID = process.env.SMILE_IDENTITY_PARTNER_ID;
const IS_MOCK = !SMILE_API_KEY || SMILE_API_KEY.includes('REPLACE');

async function verifyBVN(bvnNumber, userId) {
  // Always hash the BVN before any storage
  const bvnHash = crypto.createHash('sha256').update(bvnNumber + (process.env.BVN_SALT || 'wcommerce')).digest('hex');

  if (IS_MOCK) {
    logger.warn(`[KYC MOCK] verifyBVN called for user ${userId}. SMILE_IDENTITY_API_KEY not set. Running in mock mode.`);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { bvnHash, kycTier: 1, kycProvider: 'MOCK' }
    });
    return { success: true, message: 'BVN mock-verified (MOCK mode). Set SMILE_IDENTITY_API_KEY for real verification.', user: updatedUser, mock: true };
  }

  try {
    logger.info(`[KYC] Verifying BVN for user ${userId} via Smile Identity...`);
    const response = await axios.post(
      'https://testapi.smileidentity.com/v1/id_verification',
      {
        partner_id: SMILE_PARTNER_ID,
        api_key: SMILE_API_KEY,
        id_type: 'BVN',
        id_number: bvnNumber,
        country: 'NG'
      }
    );
    const result = response.data;
    const verified = result.ResultCode === '1012' || result.Actions?.Verify_ID_Number === 'Verified';

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bvnHash,
        kycTier: verified ? 2 : 1,
        kycProvider: 'SMILE_ID'
      }
    });

    return {
      success: verified,
      message: verified ? 'BVN verified successfully' : 'BVN verification failed',
      user: updatedUser,
      mock: false
    };
  } catch (error) {
    logger.error(`[KYC] Error verifying BVN for user ${userId}:`, error.response?.data || error.message);
    throw new Error('Failed to verify BVN. Please try again later.');
  }
}

module.exports = { verifyBVN };
