const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Mock out browser APIs so firebase doesn't crash
global.window = { addEventListener: () => {}, removeEventListener: () => {} };
global.document = { addEventListener: () => {}, removeEventListener: () => {} };
global.navigator = { userAgent: 'node' };

const app = initializeApp({
  projectId: "ai-studio-conciergepro-2a79d820-6722-4a45-b504-22a78ad12275",
});
const db = getFirestore(app);

getDocs(collection(db, 'villaMappings')).then(snap => {
  console.log("Mappings found:", snap.size);
  snap.forEach(doc => console.log(doc.data()));
  process.exit(0);
}).catch(console.error);
