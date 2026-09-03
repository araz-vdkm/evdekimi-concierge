path = "index.html"
with open(path, "r") as f:
    content = f.read()

import re
content = re.sub(r'<link rel="icon"[^>]+>', '<link rel="icon" type="image/png" href="/logo-ev-white.png" />', content)

with open(path, "w") as f:
    f.write(content)
print("index patched")
