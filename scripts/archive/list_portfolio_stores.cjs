// Read all store config files and list stores by tier/portfolio style
const fs = require('fs');
const path = require('path');

const engines = ['restaurant', 'fashion', 'creator', 'property', 'healthcare', 'automotive'];

// Portfolio tier mapping (from PortfolioLoader.jsx)
const PORTFOLIO_MAP = {
  free:       'FreePortfolio',
  essential:  'FreePortfolio',
  plus:       'FreePortfolio',
  premium:    'PremiumPortfolio',
  pro:        'ProPortfolio',
  studio:     'ProPortfolio',
  ultra:      'UltraPortfolio',
  signature:  'PremiumPortfolio',
  enterprise: 'EnterprisePortfolio',
};

const allStores = [];

engines.forEach(engine => {
  const filePath = path.join(__dirname, 'src', 'store-config', `${engine}Stores.js`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract id, name, tier, price using regex
  const matches = [...content.matchAll(/id:\s*['"]([^'"]+)['"].*?name:\s*['"]([^'"]+)['"].*?price:\s*(\d+).*?tier:\s*['"]([^'"]+)['"]/gs)];

  matches.forEach(m => {
    allStores.push({
      id: m[1],
      name: m[2],
      price: parseInt(m[3]),
      tier: m[4],
      engine,
      portfolio: PORTFOLIO_MAP[m[4]] || 'FreePortfolio'
    });
  });
});

// Group by portfolio style
const grouped = {};
allStores.forEach(s => {
  if (!grouped[s.portfolio]) grouped[s.portfolio] = [];
  grouped[s.portfolio].push(s);
});

console.log(`\n📊 TOTAL STORES: ${allStores.length}\n`);
console.log('═'.repeat(80));

Object.entries(grouped).forEach(([portfolioStyle, stores]) => {
  console.log(`\n🎨 ${portfolioStyle} (${stores.length} stores)`);
  console.log('─'.repeat(80));
  stores.forEach(s => {
    console.log(`  • [${s.id}] ${s.name} | Tier: ${s.tier} | $${s.price}/mo | Engine: ${s.engine}`);
  });
});

// Also show breakdown by engine
console.log('\n\n📈 BREAKDOWN BY ENGINE:');
console.log('─'.repeat(80));
engines.forEach(engine => {
  const engineStores = allStores.filter(s => s.engine === engine);
  const portfolioCounts = {};
  engineStores.forEach(s => {
    portfolioCounts[s.portfolio] = (portfolioCounts[s.portfolio] || 0) + 1;
  });
  console.log(`  ${engine}: ${engineStores.length} stores | ${JSON.stringify(portfolioCounts)}`);
});
