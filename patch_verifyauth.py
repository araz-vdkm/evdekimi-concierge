import re

with open("server.ts", "r") as f:
    content = f.read()

content = re.sub(
    r'// Google OAuth access tokens.*?if \(token\.startsWith\("ya29\."\)\) \{\s*\(req as any\)\.user = \{ uid: "oauth_user", role: "admin" \};\s*return next\(\);\s*\}',
    '',
    content,
    flags=re.DOTALL
)

with open("server.ts", "w") as f:
    f.write(content)
print("Removed ya29 bypass")
