import re

with open("src/lib/auth.ts", "r") as f:
    content = f.read()

# Add enableIndexedDbPersistence import and initialization
if "enableIndexedDbPersistence" not in content:
    content = content.replace(
        "import { getFirestore }",
        "import { getFirestore, enableIndexedDbPersistence }"
    )

    init_str = """export const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Offline persistence error:", err.code);
});"""

    content = content.replace("export const storage = getStorage(app);", init_str)

    with open("src/lib/auth.ts", "w") as f:
        f.write(content)
print("Auth offline patched")
