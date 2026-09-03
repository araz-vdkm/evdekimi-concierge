const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'import admin from "firebase-admin";',
  'import admin from "firebase-admin";\nimport { getAuth } from "firebase-admin/auth";'
);

code = code.replace(
  'await admin.auth().updateUser(uid, { disabled: isBlocked });',
  'await getAuth().updateUser(uid, { disabled: isBlocked });'
);

code = code.replace(
  'const decodedToken = await admin.auth().verifyIdToken(token);',
  'const decodedToken = await getAuth().verifyIdToken(token);'
);

fs.writeFileSync('server.ts', code);
console.log("Auth patched");
