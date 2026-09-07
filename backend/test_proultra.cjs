const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function runProUltraTest() {
  const timestamp = Date.now();
  const testEmail = `proultra_tester_${timestamp}@example.com`;
  const storeSlug = `proultra-test-store-${timestamp}`;
  const storeName = `Pro Ultra Test Store ${timestamp}`;

  console.log('--- Step 1: Creating Dummy User and Store via Prisma ---');
  // 1. Create dummy user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      fullName: 'Pro Ultra Tester',
      passwordHash: 'dummy_hash_for_test',
      role: 'SELLER',
      isVerified: true,
      subscriptionTier: 'NONE',
    },
  });
  console.log(`Created User: ID=${user.id}, Email=${user.email}, subscriptionTier=${user.subscriptionTier}`);

  // 1. Create dummy store
  const store = await prisma.store.create({
    data: {
      sellerId: user.id,
      storeName: storeName,
      portfolioSlug: storeSlug,
      country: 'US',
      isVerified: true,
      sellerTier: 'STANDARD',
    },
  });
  console.log(`Created Store: ID=${store.id}, Slug=${store.portfolioSlug}, sellerTier=${store.sellerTier}`);

  console.log('\n--- Step 2: Simulating Purchase by Updating sellerTier & subscriptionTier to PRO ULTRA ---');
  // 2. Manually update Store.sellerTier to 'PRO ULTRA' and User.subscriptionTier to 'PRO ULTRA'
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'PRO ULTRA',
    },
  });

  const updatedStore = await prisma.store.update({
    where: { id: store.id },
    data: {
      sellerTier: 'PRO ULTRA',
    },
  });

  console.log(`Updated User: subscriptionTier=${updatedUser.subscriptionTier}`);
  console.log(`Updated Store: sellerTier=${updatedStore.sellerTier}`);

  console.log('\n--- Step 3: Making HTTP GET Request to /api/v1/stores/by-slug/<store-slug> ---');
  const targetUrl = `http://localhost:5000/api/v1/stores/by-slug/${storeSlug}`;
  console.log(`GET ${targetUrl}`);

  const response = await axios.get(targetUrl);
  console.log('HTTP Status Code:', response.status);
  console.log('Response Body:', JSON.stringify(response.data, null, 2));

  const returnedSubscriptionTier = response.data?.data?.store?.subscriptionTier;
  console.log(`\nReturned store.subscriptionTier in API response: "${returnedSubscriptionTier}"`);

  console.log('\n--- Step 4: Verification ---');
  if (returnedSubscriptionTier === 'PRO ULTRA') {
    console.log('✅ TEST PASSED: API returned subscriptionTier: "PRO ULTRA" successfully!');
  } else {
    console.error(`❌ TEST FAILED: Expected subscriptionTier to be "PRO ULTRA", but got "${returnedSubscriptionTier}"`);
    process.exitCode = 1;
  }

  // Also verify how frontend StorefrontRouter resolves it
  const frontendResolvedTier = returnedSubscriptionTier?.toLowerCase();
  console.log(`Frontend tier resolution check: "${returnedSubscriptionTier}" -> toLowerCase() = "${frontendResolvedTier}"`);
  if (frontendResolvedTier === 'pro ultra' || frontendResolvedTier === 'proultra') {
    console.log('✅ FRONTEND ROUTER MATCH: StorefrontRouter matches case \'pro ultra\' / \'proultra\' -> renders <ProUltraPortfolio />');
  } else {
    console.log('⚠️ FRONTEND ROUTER WARNING: Frontend might not match expected Pro Ultra portfolio switch case.');
  }
}

runProUltraTest()
  .catch((err) => {
    console.error('Error during test execution:', err.response ? err.response.data : err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
