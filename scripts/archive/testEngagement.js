const axios = require('axios');

async function runTests() {
  const token = process.env.TEST_TOKEN || 'YOUR_TEST_TOKEN';
  const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: { Authorization: `Bearer ${token}` }
  });

  try {
    // 1. Create a FeedPost or get existing to use its ID
    console.log('Tests will need to be executed against a real running instance and database.');
    console.log('You can hit /feed/events/batch with mock data to test ingestion.');
    
    const batchRes = await api.post('/feed/events/batch', {
      events: [
        { postId: 'test-post-1', action: 'VIEW', target: 'post' },
        { postId: 'test-post-1', action: 'VIEW', target: 'post' }, // Duplicate, should be deduplicated
        { postId: 'test-post-1', action: 'CLICK', target: 'buy-button' }
      ]
    });
    console.log('Batch Event Ingestion:', batchRes.data);

  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

// runTests();
