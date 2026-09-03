const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  'setPreCheckInReports(preReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));',
  'setPreCheckInReports(preReports.sort((a, b) => (new Date(b.timestamp || 0).getTime() || 0) - (new Date(a.timestamp || 0).getTime() || 0)));'
);

code = code.replace(
  'setPostCheckOutReports(postReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));',
  'setPostCheckOutReports(postReports.sort((a, b) => (new Date(b.timestamp || 0).getTime() || 0) - (new Date(a.timestamp || 0).getTime() || 0)));'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('done');
