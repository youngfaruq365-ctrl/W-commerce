const fs = require('fs');
const lines = fs.readFileSync('backend/server.cjs', 'utf8').split('\n');
const fixedLines = [
    "// Guard the root static fallback to avoid exposing backend/source files.",
    "app.use((req, res, next) => {",
    "    if (req.method !== 'GET' && req.method !== 'HEAD') {",
    "        return next();",
    "    }",
    "",
    "    if (isBlockedRootStaticPath(req.path)) {",
    "        return res.status(404).end();",
    "    }",
    "",
    "    return next();",
    "});",
    "",
    "app.use(express.static(__dirname, {",
    "    dotfiles: 'deny',",
    "    index: false,",
    "    redirect: false,",
    "    fallthrough: true,",
    "    maxAge: '0'",
    "})); // Root fallback for legacy frontend assets",
    "",
    "// Privacy & Compliance (GDPR/CCPA)",
    "app.use((req, res, next) => {",
    "    // Check for consent cookie",
    "    const hasConsent = req.headers.cookie?.includes('gx_consent=true');",
    "    req.gdprStatus = hasConsent ? 'CONSENTED' : 'ANONYMOUS';",
    "    next();",
    "});"
];

const startIdx = lines.findIndex(l => l.includes('// Guard the root static fallback to avoid exposing backend/source files.'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('// Middleware'));

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = [
        ...lines.slice(0, startIdx),
        ...fixedLines,
        "",
        ...lines.slice(endIdx)
    ];
    fs.writeFileSync('backend/server.cjs', newLines.join('\n'));
    console.log('Fixed server.cjs!');
} else {
    console.log('Could not find start or end index', startIdx, endIdx);
}
