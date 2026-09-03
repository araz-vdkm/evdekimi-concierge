import re

with open("src/components/Home.tsx", "r") as f:
    content = f.read()

# Replace by matching lines explicitly
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if "const findGuestRegEmail = (resId" in line:
        skip = True
    if skip:
        if line.strip() == "};":
            skip = False
        continue
    new_lines.append(line)

with open("src/components/Home.tsx", "w") as f:
    f.write('\n'.join(new_lines))

print("Home patched cleanly")
