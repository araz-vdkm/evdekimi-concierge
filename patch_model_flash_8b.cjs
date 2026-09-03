const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace passport scanning model
code = code.replace(
  /model: 'gemini-3.7-flash'/g, 
  "model: 'gemini-2.0-flash-lite-preview-02-05'"
);

fs.writeFileSync('server.ts', code);
console.log('Patched server.ts to use gemini-2.0-flash-lite-preview-02-05');
