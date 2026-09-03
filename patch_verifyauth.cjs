const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \\(token === "dummy-token"\\) \\{[\\s\\S]*?\\}/;
code = code.replace(regex, `if (token === "dummy-token") {
      (req as any).user = { uid: "dummy", role: "admin" };
      return next();
    }`);

fs.writeFileSync('server.ts', code);
