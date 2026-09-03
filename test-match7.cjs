const fs = require('fs');
let code = fs.readFileSync('src/lib/villaMatcher.ts', 'utf8');

code = code.replace(/if \(cSubsetOfT \|\| tSubsetOfC\) return true;/g, "if (cSubsetOfT) return true;");

fs.writeFileSync('src/lib/villaMatcher-temp.ts', code);
