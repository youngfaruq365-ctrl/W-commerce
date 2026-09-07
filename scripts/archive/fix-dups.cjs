const fs = require('fs');
const content = fs.readFileSync('backend/server.cjs', 'utf-8');
const lines = content.split('\n');

const occurrences = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const staticAssetOptions = { maxAge: \'7d\', etag: true, lastModified: true };')) {
        occurrences.push(i);
    }
}
console.log("Found staticAssetOptions at lines:", occurrences);

if (occurrences.length > 1) {
    const start1 = occurrences[0];
    const start2 = occurrences[1];
    const length = start2 - start1;
    
    // Check if the block repeats
    let isExactRepeat = true;
    for (let i = 0; i < length; i++) {
        if (lines[start1 + i] !== lines[start2 + i]) {
            isExactRepeat = false;
            console.log("Mismatch at offset", i, ":");
            console.log("1:", lines[start1 + i]);
            console.log("2:", lines[start2 + i]);
            break;
        }
    }
    
    if (isExactRepeat) {
        console.log("Exact repeat found of length", length);
        let newLines = lines.slice(0, start2);
        // Is there a third?
        if (occurrences.length > 2) {
            const start3 = occurrences[2];
            // Since it repeats, start3 is at start1 + 2*length?
            if (start3 === start1 + 2 * length) {
                console.log("Three repeats found! Truncating everything after the first.");
                // We keep up to start2. We need to append the rest of the file after the LAST repeat
                newLines = lines.slice(0, start2).concat(lines.slice(start3 + length));
            } else {
                newLines = lines.slice(0, start2).concat(lines.slice(start2 + length));
            }
        } else {
            newLines = lines.slice(0, start2).concat(lines.slice(start2 + length));
        }
        
        fs.writeFileSync('backend/server.cjs', newLines.join('\n'));
        console.log("Fixed duplicates!");
    }
}
