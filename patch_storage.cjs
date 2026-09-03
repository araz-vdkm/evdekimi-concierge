const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

const saveFind = `    // Also update local storage for instant UI updates
    try {
      localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(data));
    if (collectionName === 'guest_reg') {`;

const saveReplace = `    // Also update local storage for instant UI updates
    try {
      // Create a shallow copy to strip base64 payloads to avoid quota errors
      let cacheData = data;
      if (collectionName === 'pre_checkin' || collectionName === 'post_checkout') {
          // deep clone so we can scrub
          cacheData = JSON.parse(JSON.stringify(data));
          if (cacheData.data) {
             Object.keys(cacheData.data).forEach(sec => {
                Object.keys(cacheData.data[sec]).forEach(item => {
                   if (cacheData.data[sec][item].photos) {
                      cacheData.data[sec][item].photos = cacheData.data[sec][item].photos.map((p) => 
                         (typeof p === 'string' && p.startsWith('data:image')) ? 'local-cache-omitted' : p
                      );
                   }
                });
             });
          }
          if (typeof cacheData.signature === 'string' && cacheData.signature.startsWith('data:image')) {
             cacheData.signature = 'local-cache-omitted';
          }
      }
      if (collectionName === 'users' && cacheData.photoBase64) {
          cacheData.photoBase64 = 'local-cache-omitted';
      }
      
      try {
         localStorage.setItem(\`\${collectionName}_\${id}\`, JSON.stringify(cacheData));
      } catch(e) {
         console.warn("Storage quota exceeded even after scrubbing, skipping local cache.");
      }
    if (collectionName === 'guest_reg') {`;

code = code.replace(saveFind, saveReplace);

fs.writeFileSync('src/lib/db.ts', code);
