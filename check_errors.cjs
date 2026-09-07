const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log('Navigating to http://localhost:5175/login ...');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle0' });
    
    console.log('Page loaded. Capturing errors...');
    // Wait a bit to see if any delayed errors pop up
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log('Done.');
})();
