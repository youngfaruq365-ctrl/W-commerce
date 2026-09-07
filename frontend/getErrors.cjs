const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE_ERROR:', error.stack || error.message);
  });

  page.on('requestfailed', request => {
    console.log('REQUEST_FAILED:', request.url(), request.failure()?.errorText);
  });

  try {
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Navigation error (might be timeout):', e.message);
  }

  await browser.close();
})();
