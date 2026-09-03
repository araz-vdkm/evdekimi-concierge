const fs = require('fs');

let code = fs.readFileSync('src/components/PostCheckOutFlow.tsx', 'utf8');

const oldLoop = `      const processedData: Record<string, Record<string, { photos: string[] }>> = {};
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
      }`;

const newLoop = `      const processedData: Record<string, Record<string, { photos: string[] }>> = {};
      const uploadTasks: Promise<void>[] = [];
      
      for (const [sectionId, itemsObj] of Object.entries(data)) {
        processedData[sectionId] = {};
        for (const [itemId, itemData] of Object.entries(itemsObj)) {
          processedData[sectionId][itemId] = { photos: [] };
          (itemData.photos || []).forEach((photo, idx) => {
             const task = (async () => {
                const compressed = await compressImage(photo, 1200, 1200, 0.85);
                const path = \`reports/post_checkout/\${bookingId}/\${sectionId}_\${itemId}_\${idx}.jpg\`;
                const url = await uploadImageToStorage(compressed, path);
                processedData[sectionId][itemId].photos[idx] = url;
             })();
             uploadTasks.push(task);
          });
        }
      }
      await Promise.all(uploadTasks);`;

code = code.replace(oldLoop, newLoop);
fs.writeFileSync('src/components/PostCheckOutFlow.tsx', code);
console.log('Patched PostCheckOutFlow loop');
