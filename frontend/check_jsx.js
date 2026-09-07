const fs = require('fs');
const glob = require('glob');
const babel = require('@babel/core');

const dir = 'src/components/seller/Dashboard';
const files = glob.sync(`${dir}/*Studio.jsx`);

let hasErrors = false;

files.forEach(file => {
    const code = fs.readFileSync(file, 'utf-8');
    try {
        babel.parseSync(code, {
            filename: file,
            presets: ['@babel/preset-react']
        });
        console.log(`✅ ${file}`);
    } catch (err) {
        console.error(`❌ ${file}: ${err.message}`);
        hasErrors = true;
    }
});

if (hasErrors) {
    process.exit(1);
}
