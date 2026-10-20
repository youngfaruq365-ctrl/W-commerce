import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiClient as axios } from '@/utils/apiClient';

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || window.location.origin}`;

export const registerPasskey = async (token) => {
  try {
    // 1. Get registration options from server
    const resp = await axios.get('/api/v1/webauthn/generate-registration-options', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const options = resp.data;

    // 2. Start WebAuthn Registration
    const attResp = await startRegistration({ optionsJSON: options });

    // 3. Send response to server to verify
    const verificationResp = await axios.post('/api/v1/webauthn/verify-registration', attResp, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });

    return verificationResp.data;
  } catch (error) {
    console.error('WebAuthn Registration Error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Passkey registration failed');
  }
};

export const loginWithPasskey = async (email) => {
  try {
    // 1. Get authentication options from server
    const resp = await axios.get(`/api/v1/webauthn/generate-authentication-options?email=${encodeURIComponent(email)}`);
    const options = resp.data;

    // 2. Start WebAuthn Authentication
    const asseResp = await startAuthentication({ optionsJSON: options });

    // 3. Send response to server to verify
    const verificationResp = await axios.post('/api/v1/webauthn/verify-authentication', {
      email,
      response: asseResp
    });

    return verificationResp.data;
  } catch (error) {
    console.error('WebAuthn Authentication Error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Passkey login failed');
  }
};
