const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

const originalLogic = `                if (localStr.length > remoteStr.length) {
                  // Keep local data or merge photos into remoteData
                  const merged = {
                    ...remoteData,
                    ...localData,
                    data: localData.data || remoteData.data,
                    minibarPhoto: localData.minibarPhoto || remoteData.minibarPhoto,
                    signature: localData.signature || remoteData.signature
                  };
                  localStorage.setItem(key, JSON.stringify(merged));
                  return;
                }`;

// Instead of string comparison length which can be buggy with nested JSON data objects,
// let's prefer the remote data if it exists, UNLESS the local data explicitly has more photos
// but the remote data doesn't. We will just always merge them by taking the remote metadata,
// and preserving any local heavy data if remote is missing it.
const newLogic = `                // Merge strategy:
                // Remote has truth for metadata.
                // Local might have photos that failed to upload to storage but were saved locally.
                const merged = {
                  ...localData,
                  ...remoteData, // remote overwrites local
                };
                
                // If remote is missing data entirely (stripped payload), restore it from local
                if (localData.data && (!remoteData.data || Object.keys(remoteData.data).length === 0)) {
                  merged.data = localData.data;
                }
                
                localStorage.setItem(key, JSON.stringify(merged));
                return;`;

code = code.replace(originalLogic, newLogic);
fs.writeFileSync('src/lib/db.ts', code);
console.log('done');
