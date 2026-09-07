const axios = require('axios');
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
        const prompt = "You are a helpful e-commerce shopping assistant for W-Commerce.\n\n" + 
            messages.map(m => `${m.role}: ${m.content}`).join('\n') + "\nassistant:";
            
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        logger.error(`AI Service Error: ${error.response?.data?.error?.message || error.message}`);
        throw new Error('Failed to generate response from AI provider');
    }
};
