const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function list() {
  try {
    const preSnapshot = await getDocs(collection(db, 'pre_checkin'));
    console.log("PRE_CHECKIN count:", preSnapshot.docs.length);
    preSnapshot.docs.forEach(d => console.log(" - ", d.id));
    
    const postSnapshot = await getDocs(collection(db, 'post_checkout'));
    console.log("POST_CHECKOUT count:", postSnapshot.docs.length);
    postSnapshot.docs.forEach(d => console.log(" - ", d.id));
  } catch (e) {
    console.error(e);
  }
}
list();
