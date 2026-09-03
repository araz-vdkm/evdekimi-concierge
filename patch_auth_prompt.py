import re
with open("src/lib/auth.ts", "r") as f:
    content = f.read()

content = re.sub(r'const provider = new GoogleAuthProvider\(\);\s*let isSigningIn = false;', 'const provider = new GoogleAuthProvider();\nprovider.setCustomParameters({ prompt: "select_account" });\nlet isSigningIn = false;', content)

with open("src/lib/auth.ts", "w") as f:
    f.write(content)

print("Patched prompt via regex.")
