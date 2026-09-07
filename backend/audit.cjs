const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/backend/src';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) { 
            results.push(file);
        }
    });
    return results;
}

const controllers = walk(path.join(srcDir, 'controllers'));
const routes = walk(path.join(srcDir, 'routes'));
const services = walk(path.join(srcDir, 'services'));

const issues = {
    missingTryCatch: [],
    incorrectStatus: [],
    exposedData: [],
    missingGuards: [],
    unhandledPromise: []
};

// 1. Check Controllers
controllers.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    // Check for async functions without try-catch
    const asyncFuncRegex = /async\s+(?:function\s+\w+\s*\([^)]*\)|\([^)]*\)\s*=>)/g;
    let match;
    let inAsync = false;
    let tryCount = 0;
    
    // Simplified: check if file has `async` but missing `try {` or `catch`
    let hasAsync = content.includes('async ');
    let hasTry = content.includes('try {') || content.includes('try{');
    let hasCatch = content.includes('catch');
    
    // To be more precise, let's look line by line
    for(let i=0; i<lines.length; i++) {
        let line = lines[i];
        if (line.match(/async\s+/) && !line.includes('//')) {
            // Found async, scan ahead a bit to see if there's a try
            let foundTry = false;
            for(let j=i; j<Math.min(i+15, lines.length); j++) {
                if (lines[j].includes('try {') || lines[j].includes('try{')) {
                    foundTry = true; break;
                }
            }
            if (!foundTry) {
                issues.missingTryCatch.push(`${file}:${i+1} - missing try/catch in async block`);
            }
        }
        
        // Exposed sensitive data
        if (line.match(/res\.(json|send).*\b(user|data)\b/) && !line.includes('delete') && !line.includes('select')) {
            // Need to inspect models if they return password, but this is a heuristic
        }
    }
});

// Write issues to a JSON
fs.writeFileSync('c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/backend/issues.json', JSON.stringify(issues, null, 2));
console.log('Audit complete.');
