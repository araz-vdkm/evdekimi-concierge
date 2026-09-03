const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  /g\.passportNumber && g\.passportNumber !== 'REG-PENDING' && g\.passportNumber !== 'Unknown'/g,
  "g.photo && g.photo.length > 20"
);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
