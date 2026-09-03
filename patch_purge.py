import re

with open("src/lib/db.ts", "r") as f:
    content = f.read()

# Remove the line `key === 'concierge_registered_guests' ||`
content = content.replace("key === 'concierge_registered_guests' ||\n", "")

# Add `await idbDel('concierge_registered_guests');` after `keysToRemove.forEach...`
content = content.replace(
    "keysToRemove.forEach(k => localStorage.removeItem(k));",
    "keysToRemove.forEach(k => localStorage.removeItem(k));\n    await idbDel('concierge_registered_guests');"
)

with open("src/lib/db.ts", "w") as f:
    f.write(content)

print("Purge patched")
