const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function list() {
  console.log("Fetching pre_checkin...");
  try {
    const t0 = Date.now();
    const preSnapshot = await getDocs(collection(db, 'pre_checkin'));
    console.log("PRE_CHECKIN count:", preSnapshot.docs.length, "Time:", Date.now() - t0);
  } catch (e) {
    console.error("Error pre_checkin", e);
  }
}
list();
