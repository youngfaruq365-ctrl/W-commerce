const puppeteer = require('puppeteer');
(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('Navigating to page...');
  await page.goto('http://localhost:5175/store/fakunle-faruq-s-store', {waitUntil: 'networkidle0'}).catch(console.error);
  
  await browser.close();
  console.log('Done.');
})();
