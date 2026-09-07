const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://127.0.0.1:5000/api/v1/stores/premium-unlock', {
      tier: 'Signature', amount: 49
    }, {
      headers: {
        'Cookie': 'gx_csrf=dummy_token_for_test', // We might need a real token or disable csrf
        'Authorization': 'Bearer test'
      }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.log("Error status:", err.response?.status);
    console.log("Error message:", err.response?.data?.message || err.message);
  }
})();
