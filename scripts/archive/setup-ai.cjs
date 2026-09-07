const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\backend';

// 1. aiService.js
const aiServicePath = path.join(srcDir, 'services', 'aiService.js');
const aiServiceContent = `const axios = require('axios');
const logger = require('../utils/logger');

exports.generateChatResponse = async (messages) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Fallback for demo if no key is provided, but it IS a real abstraction
        logger.warn('GEMINI_API_KEY not found. Using fallback mock response.');
        return "I am the AI Shopping Assistant. (Configure GEMINI_API_KEY in .env for real responses!)";
    }

    try {
        // Simple mapping of frontend messages to Gemini format
        const prompt = "You are a helpful e-commerce shopping assistant for W-Commerce.\\n\\n" + 
            messages.map(m => \`\${m.role}: \${m.content}\`).join('\\n') + "\\nassistant:";
            
        const response = await axios.post(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        logger.error(\`AI Service Error: \${error.response?.data?.error?.message || error.message}\`);
        throw new Error('Failed to generate response from AI provider');
    }
};
`;
fs.writeFileSync(aiServicePath, aiServiceContent, 'utf8');

// 2. aiController.js
const aiControllerPath = path.join(srcDir, 'controllers', 'aiController.js');
const aiControllerContent = `const aiService = require('../services/aiService');
const logger = require('../utils/logger');

exports.chat = async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, message: 'Messages array is required' });
        }

        const reply = await aiService.generateChatResponse(messages);
        
        res.json({ success: true, reply });
    } catch (error) {
        logger.error(\`AI Controller Error: \${error.message}\`);
        res.status(500).json({ success: false, message: error.message });
    }
};
`;
fs.writeFileSync(aiControllerPath, aiControllerContent, 'utf8');

// 3. aiRoutes.js
const aiRoutesPath = path.join(srcDir, 'routes', 'aiRoutes.js');
const aiRoutesContent = `const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting: 20 requests per 15 minutes per IP
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests to AI Assistant. Please try again later.' }
});

router.post('/chat', protect, aiLimiter, aiController.chat);

module.exports = router;
`;
fs.writeFileSync(aiRoutesPath, aiRoutesContent, 'utf8');

// 4. Mount in server.cjs
const serverPath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\server.cjs';
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (!serverContent.includes('aiRoutes')) {
    serverContent = serverContent.replace(
        "app.use(['/api/user', '/api/v1/user'], require('./src/backend/routes/userRoutes'));",
        "app.use(['/api/user', '/api/v1/user'], require('./src/backend/routes/userRoutes'));\napp.use(['/api/ai', '/api/v1/ai'], require('./src/backend/routes/aiRoutes'));"
    );
    fs.writeFileSync(serverPath, serverContent, 'utf8');
}

console.log("AI Backend setup complete");
