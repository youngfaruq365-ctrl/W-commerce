import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = [
  path.join(__dirname, 'src', 'services'),
  path.join(__dirname, 'src', 'utils'),
  path.join(__dirname, 'src', 'cron')
];

let hasError = false;

async function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      await checkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      try {
        await import(`file://${fullPath}`);
      } catch (e) {
        console.error(`Error in ${fullPath}:`, e.message);
        hasError = true;
      }
    }
  }
}

async function run() {
  for (const dir of dirs) {
    await checkDir(dir);
  }
  if (!hasError) {
    console.log("All files imported successfully!");
  } else {
    process.exit(1);
  }
}

run();
