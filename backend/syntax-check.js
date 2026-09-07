import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = [
  path.join(__dirname, 'src', 'services'),
  path.join(__dirname, 'src', 'utils'),
  path.join(__dirname, 'src', 'cron')
];

let hasError = false;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      // 1. Check syntax
      try {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
      } catch (e) {
        console.error(`Syntax Error in ${fullPath}:\n`, e.stderr.toString());
        hasError = true;
      }
      
      // 2. Check unresolved relative imports
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          let resolved = path.join(path.dirname(fullPath), importPath);
          if (!fs.existsSync(resolved) && !fs.existsSync(resolved + '.js') && !fs.existsSync(resolved + '/index.js')) {
            console.error(`Unresolved import in ${fullPath}: ${importPath}`);
            hasError = true;
          }
        }
      }
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          let resolved = path.join(path.dirname(fullPath), importPath);
          if (!fs.existsSync(resolved) && !fs.existsSync(resolved + '.js') && !fs.existsSync(resolved + '/index.js')) {
            console.error(`Unresolved require in ${fullPath}: ${importPath}`);
            hasError = true;
          }
        }
      }
    }
  }
}

for (const dir of dirs) {
  checkDir(dir);
}

if (!hasError) {
  console.log("No syntax or import errors found!");
}
