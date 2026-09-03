const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const regex = /\/\/\ 3\.\ If guest list is empty or to complement registered guests, add reservation guests\s+if \(resList\.length > 0\) \{[\s\S]*?\}\s+\/\/\ Save consolidated guest list/g;

content = content.replace(regex, '// Save consolidated guest list');

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
