const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  /'Submitted By': r\.submittedBy \|\| 'Concierge',\s*'Maintenance Defect': r\.maintenanceNeeded \? 'YES' : 'NO',/,
  `'Submitted By': r.submittedBy || 'Concierge',\n        'Minibar Missing Value (IDR)': r.minibarConsumed ? r.minibarConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0) : 0,\n        'Maintenance Defect': r.maintenanceNeeded ? 'YES' : 'NO',`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
