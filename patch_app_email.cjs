const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "if (firebaseUser) {",
  "if (firebaseUser && (firebaseUser.emailVerified || firebaseUser.providerData.some((p: any) => p.providerId !== 'password'))) {"
);

fs.writeFileSync('src/App.tsx', code);
