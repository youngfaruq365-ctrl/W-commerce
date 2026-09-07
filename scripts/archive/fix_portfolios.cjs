const fs = require('fs');
const path = require('path');

const dir = 'frontend/src/pages/portfolios';
const files = fs.readdirSync(dir);

files.forEach(f => {
  const fp = path.join(dir, f);
  if (f.endsWith('.jsx')) {
    let content = fs.readFileSync(fp, 'utf8');
    
    // Replace hardcoded "Failed to update follow status" with dynamic message
    content = content.replace(
      /toast\.error\("Failed to update follow status"\)/g,
      'toast.error(e.response?.data?.message || "Failed to update follow status")'
    );
    
    // Do the same for like
    content = content.replace(
      /toast\.error\("Failed to like post"\)/g,
      'toast.error(e.response?.data?.message || "Failed to like post")'
    );

    // Let's also hide the follow button if isOwnStore is true.
    // Wait, let's just do the error message for now since we know it's failing because they are following themselves.
    
    fs.writeFileSync(fp, content);
  }
});

console.log('Done modifying portfolios');
