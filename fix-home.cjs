const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

code = code.replace(
`  const uniqueVillas = Array.from(new Set([
    ...arrivals.map((r: any) => r.complexName),
    ...arrivals.map((r: any) => r.unitName),
    ...departures.map((r: any) => r.complexName),
    ...departures.map((r: any) => r.unitName)
  ])).filter(Boolean).sort() as string[];`,
`  const allDisplayedRes = [...arrivals, ...departures];
  const uniqueVillasSet = new Set<string>();
  allDisplayedRes.forEach((r: any) => {
    if (r.complexName) uniqueVillasSet.add(r.complexName);
    if (r.unitName) uniqueVillasSet.add(r.unitName);
  });
  const uniqueVillas = Array.from(uniqueVillasSet).sort();`
);

fs.writeFileSync('src/components/Home.tsx', code);
console.log("Fixed Home");
