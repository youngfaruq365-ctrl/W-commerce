const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/v1/feed/123/comments', { postId: '123', content: 'hello' });
    console.log("Success:", res.status, res.data);
  } catch (err) {
    console.log("Error:", err.response ? err.response.status + " " + JSON.stringify(err.response.data) : err.message);
  }
}
test();
