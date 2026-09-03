const fs = require('fs');

let code = fs.readFileSync('src/lib/db.ts', 'utf8');

code = code.replace(
  `    localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(data));
    if (collectionName === 'guest_reg') { 
      localStorage.setItem(\`guest_reg_\${id}\`, 'true');
    }`,
  `    try {
      localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(data));
      if (collectionName === 'guest_reg') { 
        localStorage.setItem(\`guest_reg_\${id}\`, 'true');
      }
    } catch (e) {
      console.warn('Local storage quota exceeded or unavailable');
    }`
);

// We need to do this globally because it appears in the try and catch blocks
code = code.replace(
  `    localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(data));
    if (collectionName === 'guest_reg') { 
      localStorage.setItem(\`guest_reg_\${id}\`, 'true');
    }`,
  `    try {
      localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(data));
      if (collectionName === 'guest_reg') { 
        localStorage.setItem(\`guest_reg_\${id}\`, 'true');
      }
    } catch (e) {
      console.warn('Local storage quota exceeded or unavailable');
    }`
);

fs.writeFileSync('src/lib/db.ts', code);
console.log('Patched db.ts localstorage');
