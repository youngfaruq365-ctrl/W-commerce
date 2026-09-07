const fs = require('fs');

let authContent = fs.readFileSync('src/middleware/authMiddleware.js', 'utf8');
const authRegex = /data:\s*\{\s*hasPaidAccess:\s*false,\s*subscriptionTier:\s*'NONE'\s*\}\r?\n\s*const\s*tiers\s*=\s*\{\s*'NONE':\s*0,\s*'TRIAL':\s*1,\s*'MONTHLY':\s*2,\s*'YEARLY':\s*3\s*\};/;
const authReplace = `data: { hasPaidAccess: false, subscriptionTier: 'NONE' }
                }).catch(err => console.error('[Access Expiry] DB update failed:', err));
                
                req.user.hasPaidAccess = false;
                req.user.subscriptionTier = 'NONE';
            }

            // Cache user profile in Redis for 1 hour (TTL)
            try {
                const cacheKey = \`user:\${req.user.id}:profile\`;
                await redisManager.set(cacheKey, JSON.stringify(req.user), 3600);
            } catch (cacheErr) {
                // Redis not available - continue without caching
            }

            next();
        } catch (error) {
            console.error('Auth Error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Session expired, please login again',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
    } else {
        console.log(\`No Token for \${req.originalUrl}\`);
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const requireTier = (requiredTier) => {
    return (req, res, next) => {
        // Admins bypass
        if (req.user.role === 'ADMIN') return next();

        // Trial users have limited tier access - treat as TRIAL tier
        const tiers = { 'NONE': 0, 'TRIAL': 1, 'MONTHLY': 2, 'YEARLY': 3 };`;

if (authRegex.test(authContent)) {
    console.log('Patching authMiddleware.js');
    authContent = authContent.replace(authRegex, authReplace);
    fs.writeFileSync('src/middleware/authMiddleware.js', authContent);
} else {
    console.log('authRegex not found');
}

let serverContent = fs.readFileSync('server.cjs', 'utf8');
const serverRegex = /const\s*frontendUrl\s*=\s*process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5175';\r?\n\s*await\s*redisReadyPromise;/;
const serverReplace = `const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        return res.redirect(\`\${frontendUrl}\${req.path}\`);
    }
    next();
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    
    const statusCode = err.statusCode || err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = {
        success: false,
        message: (isProduction && statusCode === 500) ? 'Internal server error' : (err.message || 'Internal server error')
    };

    if (!isProduction) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// ============================================================================
// START SERVER WITH PROPER ERROR HANDLING
// ============================================================================

async function startServerWithErrorHandling() {
    if (globalStartup.serverStarted) {
        logger.warn('Server start attempted twice in same process - skipping duplicate start');
        return;
    }
    globalStartup.serverStarted = true;

    await redisReadyPromise;`;

if (serverRegex.test(serverContent)) {
    console.log('Patching server.cjs');
    serverContent = serverContent.replace(serverRegex, serverReplace);
    fs.writeFileSync('server.cjs', serverContent);
} else {
    console.log('serverRegex not found');
}
