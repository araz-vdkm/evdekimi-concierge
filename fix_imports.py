import re
with open("server.ts", "r") as f:
    lines = f.readlines()

new_lines = []
has_fs = False
for line in lines:
    if line.strip() == 'import fs from "fs";':
        if not has_fs:
            new_lines.insert(0, line)
            has_fs = True
    else:
        new_lines.append(line)

with open("server.ts", "w") as f:
    f.write("".join(new_lines))
print("fixed")
