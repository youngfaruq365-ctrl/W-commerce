const fs = require('fs');
const readline = require('readline');

async function restore() {
    const transcriptPath = 'C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\d00445b3-d95e-4c91-9121-05c7008ee7f5\\.system_generated\\logs\\transcript_full.jsonl';
    
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let foundOutput = null;

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.tool_responses) {
                for (const resp of step.tool_responses) {
                    if (resp.name === 'default_api:view_file' && typeof resp.response === 'string' && resp.response.includes('userController.js')) {
                        if (resp.response.includes('Total Lines: 884')) {
                            foundOutput = resp.response;
                            break;
                        }
                    }
                }
            }
        } catch (e) {}
        if (foundOutput) break;
    }

    if (foundOutput) {
        // extract the content after "Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n"
        const marker = "Please note that any changes targeting the original code should remove the line number, colon, and leading space.";
        let idx = foundOutput.indexOf(marker);
        if (idx !== -1) {
            let contentStr = foundOutput.substring(idx + marker.length).trim();
            // remove trailing marker
            const endMarker = "The above content does NOT show the entire file contents";
            let endIdx = contentStr.indexOf(endMarker);
            if (endIdx !== -1) {
                contentStr = contentStr.substring(0, endIdx).trim();
            } else {
                const endMarker2 = "The above content shows the entire, complete file contents";
                let endIdx2 = contentStr.indexOf(endMarker2);
                if (endIdx2 !== -1) {
                    contentStr = contentStr.substring(0, endIdx2).trim();
                }
            }

            // remove line numbers
            const lines = contentStr.split('\\n');
            const cleanLines = lines.map(l => {
                const match = l.match(/^\\d+:\\s(.*)/);
                if (match) return match[1];
                return l;
            });

            fs.writeFileSync('backend/src/controllers/userController.js', cleanLines.join('\\n'));
            console.log("Restored userController.js to first 800 lines.");
        }
    } else {
        console.log("Could not find transcript response.");
    }
}

restore();
