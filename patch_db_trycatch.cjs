const fs = require('fs');

let code = fs.readFileSync('src/lib/db.ts', 'utf8');

const regex = /localStorage\.setItem\(`\$\{collectionName\}_?\$\{id\}`,\s*JSON\.stringify\(data\)\);[\s\S]*?localStorage\.setItem\(`guest_reg_\$\{id\}`,\s*'true'\);\s*\}/g;

code = code.replace(regex, (match) => {
  return `try {
      ${match}
    } catch (e) {
      console.warn('Local storage quota exceeded or unavailable');
    }`;
});

fs.writeFileSync('src/lib/db.ts', code);
console.log('Patched db.ts with try/catch');
