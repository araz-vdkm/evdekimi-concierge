const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');

// remove export const registerUser
code = code.replace(/export const registerUser = async[\s\S]*?\} catch \(error\) \{\s*throw error;\s*\}\s*\};\n/, "");

fs.writeFileSync('src/lib/auth.ts', code);
