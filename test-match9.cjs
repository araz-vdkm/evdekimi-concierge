const ts = require('typescript');
const fs = require('fs');

const source = fs.readFileSync('src/lib/villaMatcher.ts', 'utf8');
const jsCode = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
fs.writeFileSync('test-match-compiled-9.cjs', jsCode.replace(/require\("firebase\/firestore"\)/g, '{}').replace(/require\("\.\/auth"\)/g, '{}'));
