const fs = require('fs');
let code = fs.readFileSync('src/lib/villaMatcher.ts', 'utf8');
const { matchesProperty } = require('./test-match-compiled.cjs');

console.log("Before: Dragon Stone Villas -> Villas:", matchesProperty("Dragon Stone Villas", "Villas"));
