const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  'XLSX.writeFile(workbook, fileName);',
  `XLSX.writeFile(workbook, fileName);
      console.log("XLSX.writeFile called with fileName:", fileName);
      alert("Export triggered! If the download did not start, please click the 'Open in New Tab' icon in the top right of the preview window and try again, as iframe previews sometimes block downloads.");`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
