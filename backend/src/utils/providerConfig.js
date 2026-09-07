function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function allowMockExternalApis() {
    return process.env.ALLOW_MOCK_EXTERNAL_APIS === 'true' && !isProduction();
}

function isPlaceholderKey(value) {
    return !value || /placeholder|mock/i.test(String(value));
}

function isTestKey(value) {
    return /^(pk|sk)_test_/i.test(String(value || '').trim());
}

function isConfiguredKey(value) {
    if (isPlaceholderKey(value)) return false;
    if (isProduction() && isTestKey(value)) return false;
    return true;
}

function isStripeSecretConfigured() {
    return isConfiguredKey(process.env.STRIPE_SECRET_KEY);
}

function isStripePublishableKeyConfigured() {
    return isConfiguredKey(process.env.STRIPE_PUBLISHABLE_KEY);
}

function isPaystackSecretConfigured() {
    return isConfiguredKey(process.env.PAYSTACK_SECRET_KEY);
}

function isPaystackPublicKeyConfigured() {
    return isConfiguredKey(process.env.PAYSTACK_PUBLIC_KEY);
}

function isFlutterwaveSecretConfigured() {
    return isConfiguredKey(process.env.FLUTTERWAVE_SECRET_KEY);
}

function isFlutterwavePublicKeyConfigured() {
    return isConfiguredKey(process.env.FLUTTERWAVE_PUBLIC_KEY);
}

module.exports = {
    allowMockExternalApis,
    isConfiguredKey,
    isPaystackPublicKeyConfigured,
    isPaystackSecretConfigured,
    isFlutterwavePublicKeyConfigured,
    isFlutterwaveSecretConfigured,
    isProduction,
    isStripePublishableKeyConfigured,
    isStripeSecretConfigured,
};
