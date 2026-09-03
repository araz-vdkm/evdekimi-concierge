import os
import re

files_to_patch = [
    "src/components/Dashboard.tsx",
    "src/components/CheckInFlow.tsx",
    "src/App.tsx",
    "src/components/Home.tsx",
    "src/lib/db.ts"
]

for filepath in files_to_patch:
    with open(filepath, 'r') as f:
        content = f.read()

    # Import idb-keyval
    if 'idb-keyval' not in content:
        content = "import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';\n" + content

    # Replace localStorage.getItem('concierge_registered_guests') with await idbGet(...)
    content = re.sub(
        r'localStorage\.getItem\([\'"]concierge_registered_guests[\'"]\)',
        r'(await idbGet("concierge_registered_guests"))',
        content
    )

    # Note: JSON.parse((await idbGet(...)) || '[]') will fail if idbGet returns undefined (which it does if not found).
    # Wait, idbGet returns undefined, not a string. We should replace JSON.parse(localSaved) with just localSaved if we save as an object.
    # If we save as JSON string, we need to parse.
    # Let's save as JSON string to keep compatibility with existing data that might be migrated, or just use string.
    
    # localStorage.setItem('concierge_registered_guests', ...) with await idbSet(...)
    content = re.sub(
        r'localStorage\.setItem\([\'"]concierge_registered_guests[\'"],\s*(.*?)\)',
        r'await idbSet("concierge_registered_guests", \1)',
        content
    )
    
    # localStorage.removeItem('concierge_registered_guests') with await idbDel(...)
    content = re.sub(
        r'localStorage\.removeItem\([\'"]concierge_registered_guests[\'"]\)',
        r'await idbDel("concierge_registered_guests")',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

print("IDB patched")
