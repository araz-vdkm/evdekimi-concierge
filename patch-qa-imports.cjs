const fs = require('fs');
let code = fs.readFileSync('src/components/QATestingSuite.tsx', 'utf8');

if (!code.includes('firebase/firestore')) {
  code = code.replace("import { saveRecord, getRecord, deleteRecord } from '../lib/db';", "import { saveRecord, getRecord, deleteRecord } from '../lib/db';\nimport { db } from '../lib/auth';\nimport { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';");
}

fs.writeFileSync('src/components/QATestingSuite.tsx', code);
