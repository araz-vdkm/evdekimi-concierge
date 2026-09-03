const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));
const srcIndex = map.sources.findIndex(s => s === 'server.ts' || s.endsWith('server.ts'));
if (srcIndex !== -1) {
  const content = map.sourcesContent[srcIndex];
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log('Recovered server.ts from source map!');
} else {
  console.log('Could not find server.ts in source map');
}
