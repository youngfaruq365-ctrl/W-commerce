const fs = require('fs');

let content = fs.readFileSync('backend/server.cjs', 'utf8');

const fixedBlock = `// Flash Deal Routes
app.use(['/api/flash-deals', '/api/v1/flash-deals'], require('./src/routes/flashDealRoutes'));

// Dispute Routes
app.use(['/api/disputes', '/api/v1/disputes'], require('./src/routes/disputeRoutes'));

// Health Check Endpoint
app.get(['/api/health', '/api/v1/health'], (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        redis: 'unknown'
    });
});

// Serve Uploaded Images
app.use('/uploads', express.static(path.join(__dirname, 'storage', 'uploads')));

// In development, redirect any direct non-API browser navigation on the backend port to the Vite dev server
if (process.env.NODE_ENV !== 'production') {
    app.get('*', (req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
            return res.redirect(\`\${frontendUrl}\${req.path === '/' ? '' : req.path}\`);
        }
        next();
    });
}`;

const startIndex = content.indexOf('// Flash Deal Routes');
const endIndex = content.indexOf('const htmlFiles = [\'index\',');

if (startIndex !== -1 && endIndex !== -1) {
    const toReplace = content.substring(startIndex, endIndex);
    content = content.replace(toReplace, fixedBlock + '\n\n// Explicit HTML routes for public/html files (with BASE_PATH support)\n');
    fs.writeFileSync('backend/server.cjs', content);
    console.log("Fixed!");
} else {
    console.log("Could not fix. start:", startIndex, "end:", endIndex);
}
