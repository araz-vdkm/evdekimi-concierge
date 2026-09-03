const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

if (!code.includes('query')) {
  code = code.replace(/import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase\/firestore";/, 'import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";');
}

const deleteWithAliases = `
export const deleteRecordWithAliases = async (collectionName: string, id: string, bookingId?: string) => {
  try {
    const q = query(collection(db, collectionName), where('bookingId', '==', bookingId || id));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
    
    // Also delete by direct ID just in case it doesn't have the bookingId field
    deletePromises.push(deleteDoc(doc(db, collectionName, id)));
    
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn(\`Firestore delete failed for \${collectionName}/\${id}:\`, err);
  }
};
`;

if (!code.includes('deleteRecordWithAliases')) {
  code += deleteWithAliases;
  fs.writeFileSync('src/lib/db.ts', code);
}
