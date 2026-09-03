const fs = require('fs');
const source = fs.readFileSync('src/lib/villaMatcher.ts', 'utf8');

// Strip TypeScript types so we can evaluate it
let code = source.replace(/export /g, '')
  .replace(/: \w+(\[\])?/g, '')
  .replace(/<.*?>/g, '')
  .replace(/ as any/g, '');

const ts = require('typescript');
const jsCode = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

fs.writeFileSync('test-match-compiled.js', jsCode);
