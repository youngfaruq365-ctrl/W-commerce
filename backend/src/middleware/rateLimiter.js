const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

const rateLimiters = {
    api: apiLimiter,
    login: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 requests per `window`
        message: { error: "Too many login attempts from this IP, please try again after 15 minutes" }
    }),
    signup: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: { error: "Too many accounts created from this IP, please try again after an hour" }
    }),
    forgotPassword: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: { error: "Too many password reset requests, please try again after an hour" }
    })
};

// Export both default apiLimiter and specific rateLimiters object
module.exports = Object.assign(apiLimiter, { rateLimiters });
