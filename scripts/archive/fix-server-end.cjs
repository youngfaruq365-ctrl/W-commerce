const fs = require('fs');
const content = fs.readFileSync('backend/server.cjs', 'utf-8');

const endOfHealthCheck = content.indexOf('});\n            }\n        });');

if (endOfHealthCheck !== -1) {
    const startOfFile = content.substring(0, endOfHealthCheck + 4);
    
    const replacement = `
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
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
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

    await redisReadyPromise;
    const redisStatus = redisManager.getStatus();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!redisStatus.connected || redisStatus.useFallback)) {
        logger.error('FATAL: Redis-backed session store is unavailable in production. Server shutting down.');
        process.exit(1);
    }

    const basePort = parseInt(process.env.PORT, 10) || 5000;
    const maxAttempts = 2;
    let attempts = 0;
    let currentPort = basePort;

    const tryStart = () => {
        attempts += 1;

        if (global.serverInstance) {
            global.serverInstance.removeAllListeners('error');
        }

        global.serverInstance = server.listen(currentPort, () => {
            const addr = global.serverInstance.address();
            logger.info(\`✅ Server is running on port \${addr.port}\`);
        });

        global.serverInstance.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn(\`Port \${currentPort} is in use.\`);
                if (attempts < maxAttempts) {
                    currentPort += 1;
                    logger.info(\`Trying port \${currentPort}...\`);
                    setTimeout(tryStart, 1000);
                } else {
                    logger.error(\`Max attempts reached. Could not find an available port.\`);
                    process.exit(1);
                }
            } else {
                logger.error(\`Server error: \${error.message}\`);
                process.exit(1);
            }
        });
    };

    tryStart();
}

startServerWithErrorHandling().catch((error) => {
    logger.error(\`Failed to start server: \${error.message}\`);
    logger.error(error.stack);
    process.exit(1);
});
`;
    
    // Replace everything after health check with the correct code
    const newContent = startOfFile + replacement;
    fs.writeFileSync('backend/server.cjs', newContent);
    console.log("Fixed server.cjs end of file!");
} else {
    // try to find just the health check
    const marker = '    });\n});';
    const index = content.lastIndexOf(marker);
    if (index !== -1) {
        const startOfFile = content.substring(0, index + marker.length);
        
        const replacement = `
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
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
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

    await redisReadyPromise;
    const redisStatus = redisManager.getStatus();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!redisStatus.connected || redisStatus.useFallback)) {
        logger.error('FATAL: Redis-backed session store is unavailable in production. Server shutting down.');
        process.exit(1);
    }

    const basePort = parseInt(process.env.PORT, 10) || 5000;
    const maxAttempts = 2;
    let attempts = 0;
    let currentPort = basePort;

    const tryStart = () => {
        attempts += 1;

        if (global.serverInstance) {
            global.serverInstance.removeAllListeners('error');
        }

        global.serverInstance = server.listen(currentPort, () => {
            const addr = global.serverInstance.address();
            logger.info(\`✅ Server is running on port \${addr.port}\`);
        });

        global.serverInstance.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn(\`Port \${currentPort} is in use.\`);
                if (attempts < maxAttempts) {
                    currentPort += 1;
                    logger.info(\`Trying port \${currentPort}...\`);
                    setTimeout(tryStart, 1000);
                } else {
                    logger.error(\`Max attempts reached. Could not find an available port.\`);
                    process.exit(1);
                }
            } else {
                logger.error(\`Server error: \${error.message}\`);
                process.exit(1);
            }
        });
    };

    tryStart();
}

startServerWithErrorHandling().catch((error) => {
    logger.error(\`Failed to start server: \${error.message}\`);
    logger.error(error.stack);
    process.exit(1);
});
`;
        fs.writeFileSync('backend/server.cjs', startOfFile + replacement);
        console.log("Fixed server.cjs end of file (fallback)!");
    } else {
        console.log("Could not find health check end marker.");
    }
}
