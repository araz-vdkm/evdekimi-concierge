import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const manualSnap = await getDocs(collection(db, "minibar"));
  console.log(`Found ${manualSnap.size} minibar records.`);
  manualSnap.docs.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}
check();
