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
    
    for(let i=0; i<lines.length; i++) {
        let line = lines[i];
        // Check for async req, res controllers missing try/catch
        if (line.match(/async\s*(function)?\s*\(?\s*req\s*,\s*res/) || line.match(/exports\.\w+\s*=\s*async\s*\(/)) {
            let foundTry = false;
            for(let j=i; j<Math.min(i+10, lines.length); j++) {
                if (lines[j].includes('try {') || lines[j].includes('try{')) {
                    foundTry = true; break;
                }
            }
            if (!foundTry) {
                issues.missingTryCatch.push(`${file}:${i+1} - missing try/catch in controller`);
            }
        }
        
        // Check for returning password
        if (line.match(/res\.(json|send)\(/) || line.match(/return.*(user|admin|data)/)) {
            // Need a better way to check if password is sent, let's just grep `password:` in the controller
        }
        
        if (line.match(/password:/)) {
            // issues.exposedData.push(`${file}:${i+1} - password exposure check`);
        }
    }
});

// 2. Check Routes for missing guards
routes.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let hasAuth = content.includes('auth') || content.includes('verifyToken');
    
    for(let i=0; i<lines.length; i++) {
        let line = lines[i];
        if (line.match(/router\.(post|put|delete)\(/)) {
            if (!line.includes('auth') && !line.includes('admin') && !line.includes('verify') && !line.includes('upload')) {
                // Ignore login/register
                if (!line.includes('login') && !line.includes('register') && !line.includes('webhook')) {
                     issues.missingGuards.push(`${file}:${i+1} - unprotected route: ${line.trim()}`);
                }
            }
        }
    }
});

fs.writeFileSync('c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/backend/issues2.json', JSON.stringify(issues, null, 2));
