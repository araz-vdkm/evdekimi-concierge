const fs = require('fs');
const ts = require('typescript');
const source = fs.readFileSync('src/lib/villaMatcher-temp.ts', 'utf8');
const jsCode = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
fs.writeFileSync('test-match-compiled-temp.cjs', jsCode.replace(/require\("firebase\/firestore"\)/g, '{}').replace(/require\("\.\/auth"\)/g, '{}'));
