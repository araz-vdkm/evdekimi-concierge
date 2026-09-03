const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const badMerge = `          if (idKey) {
            const existing = combinedMap.get(idKey);
            combinedMap.set(idKey, existing ? { ...existing, ...g } : g);
          }`;

const goodMerge = `          if (idKey) {
            const existing = combinedMap.get(idKey);
            combinedMap.set(idKey, existing ? { ...existing, ...g, id: docSnap.id || idKey } : { ...g, id: docSnap.id || idKey });
          }`;

code = code.replace(badMerge, goodMerge);

fs.writeFileSync('src/components/Dashboard.tsx', code);
