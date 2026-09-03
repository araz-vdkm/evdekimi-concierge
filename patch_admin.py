import re

with open("server.ts", "r") as f:
    content = f.read()

old_init = """if (admin && admin.getApps && !admin.getApps().length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.warn("Firebase Admin initializeApp warning:", err);
  }
}"""

new_init = """import fs from "fs";

let firebaseProjectId = "gen-lang-client-0643936054";
try {
  const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
  if (config.projectId) {
    firebaseProjectId = config.projectId;
  }
} catch (e) {}

if (admin && admin.getApps && !admin.getApps().length) {
  try {
    admin.initializeApp({
      projectId: firebaseProjectId
    });
  } catch (err) {
    console.warn("Firebase Admin initializeApp warning:", err);
  }
}"""

content = content.replace(old_init, new_init)

with open("server.ts", "w") as f:
    f.write(content)

print("Admin patched")
