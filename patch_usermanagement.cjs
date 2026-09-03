const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

code = code.replace("import { db as dbRef } from '../lib/auth';", "const dbRef = db; // Reverting bad import");

// Also ensure `import { db } from '../lib/auth';` is at the top
if(!code.includes("import { db } from '../lib/auth';")) {
    code = code.replace("import { db, saveRecord } from '../lib/db';", "import { saveRecord } from '../lib/db';\nimport { db } from '../lib/auth';");
}

fs.writeFileSync('src/components/UserManagement.tsx', code);
