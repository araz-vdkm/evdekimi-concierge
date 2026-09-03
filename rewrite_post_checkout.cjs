const fs = require('fs');
let code = fs.readFileSync('src/components/PostCheckOutFlow.tsx', 'utf8');

// add import
code = code.replace(
  "import { compressImage } from '../lib/utils';",
  "import { compressImage } from '../lib/utils';\nimport { uploadImageToStorage } from '../lib/storage';"
);

// replace the compression loops
const originalLoop = `      // Compress photos inside nested data object
      const compressedData: Record<string, Record<string, { photos: string[] }>> = {};
      for (const [sectionId, itemsObj] of Object.entries(data)) {
        compressedData[sectionId] = {};
        for (const [itemId, itemData] of Object.entries(itemsObj)) {
          compressedData[sectionId][itemId] = {
            photos: await Promise.all(
              (itemData.photos || []).map(photo => compressImage(photo, 400, 400, 0.4))
            )
          };
        }
      }

      const compressedSignature = report.signature ? await compressImage(report.signature, 400, 200, 0.5) : null;
      const compressedMinibarPhoto = report.minibarPhoto ? await compressImage(report.minibarPhoto, 400, 400, 0.4) : null;`;

const newLoop = `      // Process and upload photos to Firebase Storage
      const processedData: Record<string, Record<string, { photos: string[] }>> = {};
      for (const [sectionId, itemsObj] of Object.entries(data)) {
        processedData[sectionId] = {};
        for (const [itemId, itemData] of Object.entries(itemsObj)) {
          processedData[sectionId][itemId] = {
            photos: await Promise.all(
              (itemData.photos || []).map(async (photo, idx) => {
                const compressed = await compressImage(photo, 1200, 1200, 0.85);
                const path = \`reports/post_checkout/\${bookingId}/\${sectionId}_\${itemId}_\${idx}.jpg\`;
                return await uploadImageToStorage(compressed, path);
              })
            )
          };
        }
      }

      let processedSignature = null;
      if (report.signature) {
        const compSig = await compressImage(report.signature, 600, 300, 0.8);
        processedSignature = await uploadImageToStorage(compSig, \`reports/post_checkout/\${bookingId}/signature.jpg\`);
      }
      
      let processedMinibarPhoto = null;
      if (report.minibarPhoto) {
        const compMini = await compressImage(report.minibarPhoto, 1200, 1200, 0.85);
        processedMinibarPhoto = await uploadImageToStorage(compMini, \`reports/post_checkout/\${bookingId}/minibar.jpg\`);
      }`;

code = code.replace(originalLoop, newLoop);
code = code.replace(
  '        data: compressedData,\n        signature: compressedSignature,\n        minibarPhoto: compressedMinibarPhoto',
  '        data: processedData,\n        signature: processedSignature,\n        minibarPhoto: processedMinibarPhoto'
);

fs.writeFileSync('src/components/PostCheckOutFlow.tsx', code);
console.log('done');
