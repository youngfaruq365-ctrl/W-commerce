/**
 * GlobalX Honeypot Middleware
 * Part of the "Secure Form Connection" feature.
 * Automatically rejects requests if the hidden honeypot field is populated.
 */
const honeypot = (req, res, next) => {
    const hpField = req.body && req.body.gx_hp_check;

    if (hpField) {
        console.warn(`[SECURITY] Bot blocked via Honeypot from IP: ${req.ip}`);
        // Return a generic "Forbidden" or just hang up. 
        // We'll return a 403 for now.
        return res.status(403).json({
            success: false,
            message: "Connection security mismatch. Form validation failed."
        });
    }

    next();
};

module.exports = honeypot;
