const axios = require('axios');

// Basic Identity Verification Service (KYC) for W-Commerce
// Connects to an external provider like Smile Identity or Dojah
class IdentityVerificationService {
  constructor() {
    this.providerUrl = process.env.KYC_PROVIDER_URL || 'https://api.mockkyc.com/v1';
    this.apiKey = process.env.KYC_API_KEY;
  }

  async verifyBVN(bvnNumber, firstName, lastName) {
    try {
      // Mocking the external API call structure
      const response = await axios.post(
        `${this.providerUrl}/verify/bvn`,
        { bvn: bvnNumber, first_name: firstName, last_name: lastName },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      
      return {
        success: true,
        confidence: response.data.confidence || 0.95,
        providerReference: response.data.reference || `bvn_ref_${Date.now()}`,
        data: response.data,
      };
    } catch (error) {
      console.error('BVN Verification Error:', error.message);
      // For development/mock purposes, if API fails, return a mock success
      if (require('../utils/providerConfig').allowMockExternalApis()) {
         return {
           success: true,
           confidence: 0.99,
           providerReference: `mock_bvn_ref_${Date.now()}`
         };
      }
      throw new Error('Failed to verify BVN with provider');
    }
  }

  async verifyNIN(ninNumber, firstName, lastName) {
    try {
      const response = await axios.post(
        `${this.providerUrl}/verify/nin`,
        { nin: ninNumber, first_name: firstName, last_name: lastName },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      
      return {
        success: true,
        confidence: response.data.confidence || 0.95,
        providerReference: response.data.reference || `nin_ref_${Date.now()}`,
        data: response.data,
      };
    } catch (error) {
      console.error('NIN Verification Error:', error.message);
      // For development/mock purposes
      if (require('../utils/providerConfig').allowMockExternalApis()) {
         return {
           success: true,
           confidence: 0.99,
           providerReference: `mock_nin_ref_${Date.now()}`
         };
      }
      throw new Error('Failed to verify NIN with provider');
    }
  }
}

module.exports = new IdentityVerificationService();
