const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'app.get("/api/complexes", verifyAuth, async (req, res) => {',
  'app.get("/api/complexes", async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
