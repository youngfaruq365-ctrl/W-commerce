const assert = require('assert');
const payaiOrchestrator = require('../services/payai/payaiOrchestrator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Testing PayAI Product Resolution & Safe Fallback Fix ---');

  // Test 1: Intent detection for "where can i found ugu"
  const intent = payaiOrchestrator._detectIntent('where can i found ugu', { marketCode: 'NIGERIA' }, {});
  console.log('Intent for "where can i found ugu":', intent.toolName, 'args:', intent.toolArgs);
  assert.strictEqual(intent.toolName, 'search_products', 'Must detect search_products intent');
  assert.ok(intent.toolArgs.query.toLowerCase().includes('ugu'), 'Query must contain "ugu"');
  console.log('✔ Test 1 Passed: "where can i found ugu" detected as search_products');

  // Create a clean test session and user
  let testUser = await prisma.user.findFirst({ where: { role: 'BUYER' } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'testbuyer_cart_fix@wcommerce.com',
        fullName: 'Cart Fix Test Buyer',
        passwordHash: 'dummy',
        role: 'BUYER'
      }
    });
  }

  const session = await prisma.payAISession.create({
    data: {
      userId: testUser.id,
      marketCode: 'NIGERIA',
      destinationCountry: 'NG'
    }
  });

  // Test 2: Multi-item Combo add: "add Fresh Ugu and Pounded Yam to cart"
  console.log('\nTesting multi-item combo: "add Fresh Ugu and Pounded Yam to cart"...');
  const comboRes = await payaiOrchestrator.executeTool({
    toolName: 'add_to_cart',
    toolArgs: { userPrompt: 'add Fresh Ugu and Pounded Yam to cart' },
    sessionId: session.id,
    userId: testUser.id,
    destinationCountry: 'NG',
    marketCode: 'NIGERIA'
  });

  console.log('Combo Result Success:', comboRes.success);
  console.log('Combo Items Added:', comboRes.items?.map(it => ({ title: it.title, price: it.price })));

  assert.strictEqual(comboRes.success, true, 'Combo add must succeed');
  assert.strictEqual(comboRes.isCombo, true, 'Must be marked as combo');
  assert.strictEqual(comboRes.items.length, 2, 'Must have added exactly 2 items');

  const titles = comboRes.items.map(i => i.title.toLowerCase());
  assert.ok(titles.some(t => t.includes('ugu')), 'Must contain Ugu');
  assert.ok(titles.some(t => t.includes('yam')), 'Must contain Pounded Yam');
  assert.ok(!titles.some(t => t.includes('vibe') || t.includes('smart board')), 'Must NEVER add Vibe Smart Board!');

  const comboTotal = comboRes.items.reduce((s, it) => s + Number(it.price), 0);
  console.log(`Total Combo Price: ₦${comboTotal.toLocaleString()} NGN (Expected: ₦2,500 NGN)`);
  assert.strictEqual(comboTotal, 2500, 'Combo total must be exactly ₦2,500 NGN');

  // Verify formatted response for combo
  const formattedReply = payaiOrchestrator._generateResponse('add_to_cart', comboRes, 'add Fresh Ugu and Pounded Yam to cart');
  console.log('\nFormatted Reply:\n', formattedReply);
  assert.ok(formattedReply.includes('Combo Successfully Added'), 'Reply must announce combo added');
  assert.ok(formattedReply.includes('2,500 NGN'), 'Reply must include ₦2,500 NGN');
  assert.ok(!formattedReply.includes('18,200,000') && !formattedReply.includes('16,200,000'), 'Reply must NOT mention 16M/18M NGN!');
  assert.ok(!formattedReply.includes('Vibe'), 'Reply must NOT mention Vibe');
  console.log('✔ Test 2 Passed: Multi-item combo adds Ugu + Yam (₦2,500) and NEVER Vibe Smart Board');

  // Test 3: Unmatched product request must cleanly fail and NOT fall back to arbitrary product
  console.log('\nTesting unmatched product: "add purple titanium starship to cart"...');
  const failRes = await payaiOrchestrator.executeTool({
    toolName: 'add_to_cart',
    toolArgs: { userPrompt: 'add purple titanium starship to cart' },
    sessionId: session.id,
    userId: testUser.id,
    destinationCountry: 'NG',
    marketCode: 'NIGERIA'
  });

  console.log('Fail Result:', failRes);
  assert.strictEqual(failRes.success, false, 'Must fail for nonexistent item');
  assert.ok(failRes.message.includes('Could not find'), 'Must give clear catalog message');
  console.log('✔ Test 3 Passed: Nonexistent product returns clean error without adding arbitrary product');

  // Clean up test session
  await prisma.payAIMessage.deleteMany({ where: { sessionId: session.id } });
  await prisma.payAISession.delete({ where: { id: session.id } });

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! PayAI cart resolution is fully verified and bulletproof.');
}

runTests()
  .catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
