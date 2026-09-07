const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HomePC/.gemini/antigravity/brain/3760a0c2-e720-496b-8f47-7e12d7878126/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
let origLines = {};
lines.forEach(l => {
  if (!l) return;
  try {
    const j = JSON.parse(l);
    if (j.type === 'VIEW_FILE' && j.status === 'DONE' && typeof j.content === 'string') {
      if (j.content.includes('Dashboard.jsx') && j.step_index < 60) {
        // Parse the lines
        const contentLines = j.content.split('\n');
        contentLines.forEach(cl => {
          const match = cl.match(/^(\d+):\s(.*)$/);
          if (match) {
            const lineNum = parseInt(match[1]);
            if (!origLines[lineNum]) {
              origLines[lineNum] = match[2].replace(/\r$/, '');
            }
          }
        });
      }
    }
  } catch(e) {}
});
const maxLine = Math.max(...Object.keys(origLines).map(Number));
console.log('Max line from transcript:', maxLine);

// Now read the current file to get the rest
const currentDashboard = fs.readFileSync('c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/frontend/src/pages/buyer/Dashboard.jsx', 'utf8').split('\n');
let restLines = [];
let foundPayment = false;
currentDashboard.forEach(line => {
  if (line.includes("case 'payment':")) foundPayment = true;
  if (foundPayment) restLines.push(line.replace(/\r$/, ''));
});
console.log('Found payment:', foundPayment, 'Rest lines count:', restLines.length);

let finalFile = [];
for (let i = 1; i <= maxLine; i++) {
  if (origLines[i] !== undefined) {
    finalFile.push(origLines[i]);
  } else {
    console.log('MISSING LINE:', i);
  }
}

// Check where it joins
console.log('Last few lines of transcript:\n' + finalFile.slice(-5).join('\n'));
console.log('First few lines of rest:\n' + restLines.slice(0, 5).join('\n'));

// Create final
const completeFile = finalFile.join('\n') + '\n' + restLines.join('\n');
fs.writeFileSync('c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/frontend/src/pages/buyer/Dashboard.jsx', completeFile);
console.log('Successfully recovered Dashboard.jsx');
