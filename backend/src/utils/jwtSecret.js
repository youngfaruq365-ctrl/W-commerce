function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    const weakSecrets = ['placeholder_secret', 'secret', 'dev_secret', '123456', 'fallback_secret', 'gx_dev_secret_key_998811'];
    if (process.env.NODE_ENV === 'production' && weakSecrets.includes(secret)) {
        throw new Error('JWT_SECRET is too weak for production use');
    }

    return secret;
}

module.exports = { getJwtSecret };
