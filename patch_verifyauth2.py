import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace(
    'const token = authHeader.split(" ")[1];',
    'const token = authHeader.split(" ")[1];\n    if (!token) { return res.status(401).json({ error: "Unauthorized: Missing token value" }); }'
)

with open("server.ts", "w") as f:
    f.write(content)
print("Patched verifyAuth empty token check")
