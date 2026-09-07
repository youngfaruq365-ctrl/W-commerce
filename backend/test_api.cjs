const axios = require('axios');

async function test() {
  try {
    const res1 = await axios.get('http://localhost:5000/api/v1/stores/by-slug/fakunle-faruq-s-store');
    console.log("Store 1:", res1.data.data.store.name);

    const res2 = await axios.get('http://localhost:5000/api/v1/stores/by-slug/another-store');
    console.log("Store 2:", res2.data.data.store.name);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
