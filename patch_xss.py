import re
with open("server.ts", "r") as f:
    content = f.read()

# Replace ${(message || "").replace(/\n/g, "<br />")} with sanitized version
old_str = r'${(message || "").replace(/\\n/g, "<br />")}'
new_str = r'${(message || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, "<br />")}'

content = content.replace(old_str, new_str)

with open("server.ts", "w") as f:
    f.write(content)
print("XSS patched")
