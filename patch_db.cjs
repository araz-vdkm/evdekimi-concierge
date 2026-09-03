const fs = require('fs');

let code = fs.readFileSync('src/lib/db.ts', 'utf8');

code = code.replace(
  `await withTimeout(setDocPromise, 30000);`,
  `await withTimeout(setDocPromise, 5000);`
);

code = code.replace(
  `const docSnap = await withTimeout(getDocPromise, 30000);`,
  `const docSnap = await withTimeout(getDocPromise, 5000);`
);

fs.writeFileSync('src/lib/db.ts', code);
console.log('Patched db.ts');
