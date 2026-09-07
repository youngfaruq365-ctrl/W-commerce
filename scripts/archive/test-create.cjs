const axios = require('axios');
const fs = require('fs');

async function testCreateProduct() {
  try {
    // 1. We need a valid session cookie for fakunlefaruq@gmail.com
    // Alternatively, I can just bypass the auth or use the controller directly.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({where: {email: 'fakunlefaruq@gmail.com'}});
    const store = await prisma.store.findUnique({where: {sellerId: user.id}});
    
    // Simulate req object
    const req = {
      user: user,
      body: {
        title: 'Test Product',
        description: 'Test Description that is long enough',
        price: '10',
        stock: '5',
        category: 'electronics'
      },
      files: []
    };
    
    const res = {
      status: function(s) { this.statusCode = s; return this; },
      json: function(d) { console.log('Response:', this.statusCode, JSON.stringify(d, null, 2)); return this; }
    };
    
    // Call controller
    const productController = require('./src/backend/controllers/productController');
    await productController.createProduct(req, res);
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('Crash:', err);
  }
}

testCreateProduct();
