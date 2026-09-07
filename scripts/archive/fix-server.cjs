const fs = require('fs');
const content = fs.readFileSync('backend/server.cjs', 'utf-8');
const start = content.indexOf('const initializeCron = async () => {');
const end = content.indexOf('app.get([\'/api/redis-status\', \'/api/v1/redis-status\'], (req, res) => {');

const replacement = `const initializeCron = async () => {
    if (globalStartup.cronStarted) {
        return;
    }

    try {
        await startCronJobs(cronJobManager);
        await startEscrowJobs(cronJobManager);
        globalStartup.cronStarted = true;
        logger.info('✅ Cron jobs registered and started (singleton)');
    } catch (error) {
        logger.error(\`Failed to start cron jobs: \${error.message}\`);
    }
};

initializeSocket();
initializeCron();

// API Routes
app.use(['/api/auth', '/api/v1/auth'], require('./src/routes/authRoutes'));

app.get(['/api/health', '/api/v1/health'], async (req, res) => {
    let status = {
        database: { ok: true },
        redis: { connected: redisManager.getStatus() === 'connected' }
    };
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        status.database = { ok: true };
    } catch (err) {
        status.database = { ok: false, error: err.message };
    }

    const overallUp = status.database.ok && (
        process.env.NODE_ENV === 'production'
            ? status.redis.connected
            : true
    );

    return res.status(overallUp ? 200 : 503).json({ status: overallUp ? 'ok' : 'degraded', details: status });
});

`;

if (start !== -1 && end !== -1) {
    fs.writeFileSync('backend/server.cjs', content.substring(0, start) + replacement + content.substring(end));
    console.log("Fixed server.cjs");
} else {
    console.log("Could not find start or end markers.");
}
