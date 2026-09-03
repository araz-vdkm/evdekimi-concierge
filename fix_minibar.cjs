const fs = require('fs');
let content = fs.readFileSync('src/components/MinibarDashboard.tsx', 'utf8');

content = content.replace(
  'report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));',
  'report.preCheckIn?.minibarStock?.forEach((i:any) => itemNames.add(i.name));\n                             report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));'
);

content = content.replace(
  'const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);',
  'const preItem = report.preCheckIn?.minibarStock?.find((i:any) => i.name === name) || report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);'
);

content = content.replace(
  'const initial = preItem?.qtyConsumed || 0;',
  'const initial = preItem?.qtyStock !== undefined ? preItem.qtyStock : (preItem?.qtyConsumed || 0);'
);

fs.writeFileSync('src/components/MinibarDashboard.tsx', content);
console.log("Fixed!");
