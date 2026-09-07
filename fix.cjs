const fs = require('fs');
const path = require('path');
const dir = 'frontend/src/pages/portfolios';
fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.jsx')) return;
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/\\\$\{Math/g, '`${Math').replace(/\}\%\\/g, '}%`');
    fs.writeFileSync(p, content);
});
console.log('Done');
