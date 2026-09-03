const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require("fs");

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const firestoreDbId = firebaseConfig.firestoreDatabaseId;
const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);

async function run() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log("Users count:", querySnapshot.size);
    querySnapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
    });
  } catch (e) {
    console.error(e);
  }
}
run();
