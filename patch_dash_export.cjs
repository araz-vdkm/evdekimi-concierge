const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Update Export Mapping
code = code.replace(
  "'DOB': g.dob || '',",
  "'DOB': g.dob || '',\n      'Gender': g.gender || '',"
);

// Update UI List Table mapping
// Let's check where the table displays guest info.
fs.writeFileSync('src/components/Dashboard.tsx', code);
