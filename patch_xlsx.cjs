const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  "'Upsell Opportunities': g.upsell || '',",
  "'Upsell Opportunities': typeof g.upsell === 'string' ? g.upsell : (g.upsell ? Object.entries(g.upsell).map(([k,v])=>k+': '+v).join(', ') : ''),"
);

code = code.replace(
  /const worksheet = XLSX\.utils\.json_to_sheet\(exportData\);[\s\S]*?XLSX\.writeFile\(workbook, fileName\);/,
  `try {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, fileName);
    } catch (e) {
      console.error("Export XLSX error:", e);
      alert("Failed to export. Check console.");
    }`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("XLSX patched");
