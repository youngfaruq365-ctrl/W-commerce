const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, 'src', 'store-config');
const files = fs.readdirSync(configDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(configDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace lines that only contain a comma (possibly with whitespace)
    const newContent = content.replace(/^\s*,\s*$/gm, '');
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Fixed ${file}`);
    }
});
