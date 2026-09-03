const fs = require('fs');
let code = fs.readFileSync('src/lib/utils.ts', 'utf8');

code = code.replace(
  'export const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {',
  'export const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.4): Promise<string> => {'
);
code = code.replace(
  "canvas.toDataURL('image/jpeg', 0.6)",
  "canvas.toDataURL('image/jpeg', quality)"
);

fs.writeFileSync('src/lib/utils.ts', code);

// Now fix PreCheckInFlow.tsx and PostCheckOutFlow.tsx to not specify 800
let postCode = fs.readFileSync('src/components/PostCheckOutFlow.tsx', 'utf8');
postCode = postCode.replace(/compressImage\(photo, 800, 800\)/g, 'compressImage(photo, 400, 400, 0.4)');
postCode = postCode.replace(/compressImage\(report.minibarPhoto, 800, 800\)/g, 'compressImage(report.minibarPhoto, 400, 400, 0.4)');
postCode = postCode.replace(/compressImage\(report.signature, 400, 200\)/g, 'compressImage(report.signature, 400, 200, 0.5)');
fs.writeFileSync('src/components/PostCheckOutFlow.tsx', postCode);

let preCode = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');
preCode = preCode.replace(/compressImage\(photo, 800, 800\)/g, 'compressImage(photo, 400, 400, 0.4)');
preCode = preCode.replace(/compressImage\(report.signature, 400, 200\)/g, 'compressImage(report.signature, 400, 200, 0.5)');
fs.writeFileSync('src/components/PreCheckInFlow.tsx', preCode);

console.log('done');
