const fs = require('fs');
const path = 'backend/src/controllers/userController.js';
let content = fs.readFileSync(path, 'utf8');

const replacement = `        if (users.length === 0) {
            return res.json({ success: true, users: [], message: 'No members found' });
        }

        res.json({ success: true, users });
    } catch (error) {
        logger.error(\`Find Member Error: \${error.message}\`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get Public Profile of any Member by ID
exports.getMemberProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                store: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const publicProfile = {
            id: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isVerified: user.isVerified,
            storeName: user.store?.storeName || null,
            rating: user.store?.averageRating || 0,
            country: user.store?.country || null
        };

        res.json({ success: true, user: publicProfile });
    } catch (error) {
        logger.error(\`Get Member Profile Error: \${error.message}\`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Deposit Funds to Wallet
exports.depositFunds = async (req, res) => {
    return res.status(404).json({ success: false, message: 'This feature is not available' });
};

// Wallet transaction history for the signed-in user
exports.getWalletTransactions = async (req, res) => {
    try {
        const walletEntries = await walletService.listTransactions(req.user.id, req.query);
        const transactions = walletEntries.map(entry => ({
            id: entry.id,
            type: entry.direction,
            amount: entry.amount,
            currency: entry.coin,
            status: entry.status,
            referenceId: entry.referenceId,
            description: entry.description,
            createdAt: entry.createdAt
        }));

        res.json({ success: true, transactions });
    } catch (error) {
        logger.error(\`Get Wallet Transactions Error: \${error.message}\`);
        res.status(500).json({ success: false, message: 'Failed to load wallet transactions' });
    }
};

// Create a wallet withdrawal request and hold the requested funds
exports.requestWalletWithdrawal = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const destination = String(req.body.destination || '').trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        if (!destination) {
            return res.status(400).json({ success: false, message: 'Withdrawal destination is required' });
        }`;

let idx1 = content.indexOf('        if (!destination) {');

if (idx1 !== -1) {
    // The broken file has missing code before this. We need to find the start of the missing block.
    let startIdx = content.lastIndexOf('        if (users.length === 0) {', idx1);
    if (startIdx === -1) {
        // If that's gone too, let's find the closing brace of the previous block
        startIdx = content.lastIndexOf('            });\\n        }', idx1);
        if (startIdx === -1) startIdx = content.lastIndexOf('            });\\r\\n        }', idx1);
        if (startIdx !== -1) startIdx += 20; // Skip the brace
    }
    
    // Fallback: search for "        if (!destination) {" and step back 200 chars. Wait, no.
    // The best anchor is the "take: 20," block of findMember
    startIdx = content.indexOf('            });\\n        }');
    if (startIdx === -1) startIdx = content.indexOf('            });\\r\\n        }');
    if (startIdx === -1) {
        startIdx = content.indexOf('            });');
        startIdx = content.indexOf('        }', startIdx);
        startIdx += 9;
    }
    
    const endStr = '        if (!destination) {';
    const idxEnd = content.indexOf(endStr);
    const endBlockStr = '        }';
    let endIdx = content.indexOf(endBlockStr, idxEnd);
    endIdx += endBlockStr.length;
    
    const part1 = content.substring(0, startIdx);
    const part2 = content.substring(endIdx);
    
    fs.writeFileSync(path, part1 + "\\n" + replacement + part2);
    console.log("Replaced using string logic.");
} else {
    console.log("Could not find anchors");
}
