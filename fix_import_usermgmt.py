import re

with open("src/components/UserManagement.tsx", "r") as f:
    content = f.read()

if "getAccessToken" not in content[:500]:
    content = content.replace(
        "import { db } from '../lib/auth';",
        "import { db, getAccessToken, getGoogleToken } from '../lib/auth';"
    )

with open("src/components/UserManagement.tsx", "w") as f:
    f.write(content)

print("fixed import")
