const fs = require('fs');
const path = require('path');

const engines = ['restaurant', 'fashion', 'creator', 'property', 'healthcare', 'automotive'];

const tiersList = ['essential', 'plus', 'pro', 'studio', 'signature'];

const generatePrice = (tier) => {
  if (tier === 'essential') return Math.floor(Math.random() * 5) + 5;
  if (tier === 'plus') return Math.floor(Math.random() * 5) + 9;
  if (tier === 'pro') return Math.floor(Math.random() * 5) + 14;
  if (tier === 'studio') return Math.floor(Math.random() * 5) + 19;
  return Math.floor(Math.random() * 6) + 24;
};

const getFeatures = (engine) => {
  return ['AI', 'Analytics', 'Booking', 'Loyalty', 'Automation'].sort(() => 0.5 - Math.random()).slice(0, 3);
};

engines.forEach(engine => {
  const filePath = path.join(__dirname, 'src', 'store-config', `${engine}Stores.js`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the closing bracket of the array
  const insertIndex = content.lastIndexOf('];');
  
  if (insertIndex === -1) {
    console.error(`Could not find closing array for ${engine}`);
    return;
  }

  let appended = '';
  for (let i = 16; i <= 50; i++) {
    const tier = tiersList[Math.floor(Math.random() * tiersList.length)];
    const price = generatePrice(tier);
    const store = {
      id: `${engine.substring(0, 4)}-${i}`,
      engine: engine,
      name: `${engine.charAt(0).toUpperCase() + engine.slice(1)} Store ${i}`,
      price: price,
      tier: tier,
      description: `Unique and dynamic ${engine} experience crafted for conversion.`,
      pages: ['home', 'about', 'contact', 'services'],
      features: getFeatures(engine),
      preview: { hero: `https://picsum.photos/seed/${engine}-${i}/2000/1200` },
      rating: Math.floor(Math.random() * 15) + 80,
      motion: { level: Math.floor(Math.random() * 5) + 1 },
      design: { 
        typography: Math.random() > 0.5 ? 'sans' : 'serif',
        primary: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        backgroundColor: Math.random() > 0.5 ? '#ffffff' : '#0a0a0a',
        textColor: Math.random() > 0.5 ? '#111111' : '#ffffff'
      }
    };

    appended += `,\n  ${JSON.stringify(store).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")}`;
  }

  content = content.slice(0, insertIndex) + appended + '\n' + content.slice(insertIndex);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${engine}Stores.js with 35 new stores!`);
});

