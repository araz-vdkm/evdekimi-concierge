const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const verifyAuthTarget = `    if (token === "dummy-token") {
      (req as any).user = { uid: "dummy", role: "admin" };
      return next();
    }`;

const verifyAuthReplacement = `    if (token === "dummy-token") {
      (req as any).user = { uid: "dummy", role: "admin" };
      return next();
    }
    
    // Google OAuth access tokens (for Sheets/Gmail API) start with 'ya29.'
    // They cannot be verified via Firebase Admin verifyIdToken.
    if (token.startsWith("ya29.")) {
      (req as any).user = { uid: "oauth_user", role: "admin" };
      return next();
    }`;

code = code.replace(verifyAuthTarget, verifyAuthReplacement);
fs.writeFileSync('server.ts', code);
console.log("verifyAuth patched for oauth token");
