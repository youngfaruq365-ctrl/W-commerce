const logger = require('../utils/logger');
const axios = require('axios');

const STABILITY_API_KEY = process.env.STABILITY_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IS_MOCK = !STABILITY_API_KEY && !OPENAI_API_KEY;

const FALLBACK_BANNERS = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555529733-0e670560f4e1?w=1600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop'
];

exports.generateBanner = async (prompt) => {
  if (IS_MOCK) {
    logger.warn('[BANNER] No AI image API key set. Using static fallback banners. Set STABILITY_AI_API_KEY or OPENAI_API_KEY for real generation.');
    const idx = Math.abs(prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % FALLBACK_BANNERS.length;
    return FALLBACK_BANNERS[idx];
  }

  try {
    if (OPENAI_API_KEY) {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { model: 'dall-e-3', prompt: `E-commerce banner: ${prompt}`, n: 1, size: '1792x1024', quality: 'standard' },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
      );
      return response.data.data[0].url;
    }
    throw new Error('No configured AI provider');
  } catch (error) {
    logger.error(`[BANNER] AI generation failed: ${error.message}. Using fallback.`);
    return FALLBACK_BANNERS[0];
  }
};
