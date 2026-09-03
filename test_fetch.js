import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const firestoreDbId = firebaseConfig.firestoreDatabaseId;
const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, 'users'));
  console.log("Users count:", querySnapshot.size);
  process.exit(0);
}
run();
