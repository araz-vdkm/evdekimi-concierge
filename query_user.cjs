const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));

admin.initializeApp({
  projectId: config.projectId,
});

const db = getFirestore(config.firestoreDatabaseId ? config.firestoreDatabaseId : undefined);

async function run() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'kristinabeletskaya@gmail.com').get();
  if (snapshot.empty) {
    console.log('No user found');
    return;
  }
  snapshot.forEach(doc => {
    console.log('User:', doc.id, JSON.stringify(doc.data(), null, 2));
  });
}
run();
