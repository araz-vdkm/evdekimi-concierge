const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

// add import
code = code.replace(
  "import { compressImage } from '../lib/utils';",
  "import { compressImage } from '../lib/utils';\nimport { uploadImageToStorage } from '../lib/storage';"
);

const finalSubmitLogic = `  const handleFinalSubmit = async () => {
    setIsProcessing(true);
    try {
      const token = await getAccessToken();
      
      for (let i = 0; i < guestsDetails.length; i++) {
        const guestDetail = guestsDetails[i];
        
        let uploadedPhotoUrl = '';
        if (guestDetail.photoBase64) {
          const compPhoto = await compressImage(\`data:image/jpeg;base64,\${guestDetail.photoBase64}\`, 1200, 1200, 0.85);
          uploadedPhotoUrl = await uploadImageToStorage(compPhoto, \`guests/\${initialBooking?.id || 'manual'}/passport_\${i}.jpg\`);
        }
        
        const finalGuest = {`;

code = code.replace(
  `  const handleFinalSubmit = async () => {\n    setIsProcessing(true);\n    try {\n      const token = await getAccessToken();\n      \n      for (const guestDetail of guestsDetails) {\n        const finalGuest = {`,
  finalSubmitLogic
);

code = code.replace(
  '          photo: guestDetail.photoBase64 || \'\',',
  '          photo: uploadedPhotoUrl,'
);

// We need to fix CheckInFlow's fallback compression 
code = code.replace(/await compressImage\(reader\.result as string, 800, 800\)/g, 'await compressImage(reader.result as string, 1200, 1200, 0.8)');

fs.writeFileSync('src/components/CheckInFlow.tsx', code);
console.log('done');
