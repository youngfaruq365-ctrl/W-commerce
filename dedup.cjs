const fs = require('fs');
const lines = fs.readFileSync('backend/server.cjs', 'utf8').split('\n');

const m1 = lines.findIndex(l => l.includes('// Middleware'));
const m2 = lines.findIndex((l, idx) => idx > m1 && l.includes('// Middleware'));
const imports = lines.findIndex(l => l.includes('// Import Backend Modules'));

if (m1 !== -1 && m2 !== -1 && imports !== -1) {
    console.log('Found m1:', m1, 'm2:', m2, 'imports:', imports);
    const newLines = [...lines.slice(0, m2), ...lines.slice(imports)];
    fs.writeFileSync('backend/server.cjs', newLines.join('\n'));
    console.log('Fixed server.cjs deduplication by removing m2 to imports');
} else {
    console.log('Could not find markers');
}
