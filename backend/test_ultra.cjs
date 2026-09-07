const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function runUltraTest() {
  const timestamp = Date.now();
  const testEmail = `ultra_seller_${timestamp}@example.com`;
  const testSlug = `ultra-test-store-${timestamp}`;

  console.log('=== Step 1: Creating dummy user and store ===');
  const dummyUser = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: 'dummyhash123',
      fullName: 'Ultra Test Seller',
      role: 'SELLER',
      isVerified: true,
      subscriptionTier: 'NONE',
    },
  });
  console.log(`Created user: ${dummyUser.id} (${dummyUser.email})`);

  const dummyStore = await prisma.store.create({
    data: {
      sellerId: dummyUser.id,
      storeName: `Ultra Test Store ${timestamp}`,
      portfolioSlug: testSlug,
      country: 'US',
      isVerified: true,
      approvalStatus: 'APPROVED',
      sellerTier: 'STANDARD',
    },
  });
  console.log(`Created store: ${dummyStore.id} (slug: ${dummyStore.portfolioSlug})`);

  console.log('\n=== Step 2: Manually updating Store.sellerTier to ULTRA and User.subscriptionTier to ULTRA ===');
  const updatedUser = await prisma.user.update({
    where: { id: dummyUser.id },
    data: { subscriptionTier: 'ULTRA' },
  });
  console.log(`Updated User.subscriptionTier: ${updatedUser.subscriptionTier}`);

  const updatedStore = await prisma.store.update({
    where: { id: dummyStore.id },
    data: { sellerTier: 'ULTRA' },
  });
  console.log(`Updated Store.sellerTier: ${updatedStore.sellerTier}`);

  console.log(`\n=== Step 3: Making HTTP GET request to http://localhost:5000/api/v1/stores/by-slug/${testSlug} ===`);
  const endpoint = `http://localhost:5000/api/v1/stores/by-slug/${testSlug}`;
  const response = await axios.get(endpoint);

  console.log('HTTP Status Code:', response.status);
  console.log('Response Success:', response.data?.success);
  console.log('Returned Store Payload:', JSON.stringify(response.data?.data?.store, null, 2));

  const receivedTier = response.data?.data?.store?.subscriptionTier;
  console.log(`\nVerification: received subscriptionTier = '${receivedTier}'`);

  if (response.data?.success && receivedTier === 'ULTRA') {
    console.log('\n SUCCESS: Store verified with subscriptionTier = ULTRA. The frontend StorefrontRouter will correctly select UltraPortfolio.');
    return true;
  } else {
    console.error(`\n FAILED: Expected subscriptionTier to be 'ULTRA' but received '${receivedTier}'`);
    return false;
  }
}

runUltraTest()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Error during Ultra test execution:', err.response ? err.response.data : err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
