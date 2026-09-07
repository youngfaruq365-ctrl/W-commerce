const axios = require('axios');
const prisma = require('./src/backend/utils/prismaClient');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'fakunlefaruq@gmail.com' } });
  if (!user) return console.log('no user');
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  
  const product = await prisma.product.findFirst();
  if (!product) return console.log('no product');
  
  try {
    const res = await axios.post('http://localhost:5000/api/v1/cart/add', { productId: product.id, quantity: 1 }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('ADD TO CART RESPONSE:', res.data);
    
    const cartRes = await axios.get('http://localhost:5000/api/v1/cart', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('GET CART RESPONSE:', JSON.stringify(cartRes.data, null, 2));
  } catch (err) {
    console.log('ERROR:', err.response ? err.response.data : err.message);
  }
}
run();
