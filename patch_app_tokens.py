import re

with open("src/App.tsx", "r") as f:
    content = f.read()

if "getGoogleToken" not in content and "getAccessToken" in content:
    content = content.replace(
        "import { auth, getAccessToken } from './lib/auth';",
        "import { auth, getAccessToken, getGoogleToken } from './lib/auth';"
    )
elif "import { auth } from './lib/auth';" in content:
    content = content.replace(
        "import { auth } from './lib/auth';",
        "import { auth, getAccessToken, getGoogleToken } from './lib/auth';"
    )

with open("src/App.tsx", "w") as f:
    f.write(content)

print("App patched")
