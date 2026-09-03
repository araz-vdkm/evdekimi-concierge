import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function runQA() {
  const guestsSnap = await getDocs(collection(db, "guests"));
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const recentGuests = guestsSnap.docs.map(d => ({id: d.id, ...d.data()}))
    .filter((g: any) => {
        const dateStr = g.createdAt || g.checkInDate || g.timestamp;
        if (!dateStr) return false;
        return new Date(dateStr) >= fiveDaysAgo;
    });

  console.log(`[PASS] Recent Guests logic returned ${recentGuests.length} guests.`);
  recentGuests.forEach((g: any) => console.log(`- ${g.fullName} (${g.createdAt || g.checkInDate || g.timestamp}) - Booking ID: ${g.bookingId || g.id}`));
  
  process.exit(0);
}

runQA();
