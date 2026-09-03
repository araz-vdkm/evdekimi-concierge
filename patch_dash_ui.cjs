const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  /DOB: \{master\.dob\} \(Age: \{master\.calculatedAge\}\)/,
  "DOB: {master.dob} (Age: {master.calculatedAge}) | {master.gender}"
);

code = code.replace(
  /DOB: \{alias\.dob\} \(Age: \{alias\.calculatedAge\}\)/,
  "DOB: {alias.dob} (Age: {alias.calculatedAge}) | {alias.gender}"
);

// Upsell formatting in the Dashboard if it's an object
code = code.replace(
  /\{g\.upsell && \(/g,
  `{g.upsell && Object.keys(g.upsell).length > 0 && (`
);

code = code.replace(
  /<div className="text-xs font-medium text-purple-700">\{g\.upsell\}<\/div>/g,
  `<div className="text-xs font-medium text-purple-700">
    {typeof g.upsell === 'string' ? g.upsell : Object.entries(g.upsell).map(([k,v]) => \`\${k}: \${v}\`).join(' | ')}
  </div>`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
