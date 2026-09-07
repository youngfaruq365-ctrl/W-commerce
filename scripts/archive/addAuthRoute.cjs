const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'backend', 'routes', 'authRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('/set-role')) {
    content = content.replace("router.get('/me', protect, authController.getMe);", "router.get('/me', protect, authController.getMe);\r\nrouter.post('/set-role', protect, authController.setRole);");
    fs.writeFileSync(filePath, content);
    console.log('Added set-role route');
} else {
    console.log('Already exists');
}
