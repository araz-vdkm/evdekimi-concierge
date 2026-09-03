const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Ensure loyaltyStatus is read from Google Sheets column S
code = code.replace(
  '          photo: row[14],',
  `          photo: row[14],
          loyaltyStatus: row[18],`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Read patched");
