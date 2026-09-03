import re

with open("src/components/MinibarDashboard.tsx", "r") as f:
    content = f.read()

target = """            if (currentUser?.role !== 'admin' && allowedUnits.length > 0) {
              units = units.filter((u: string) => allowedUnits.includes(`${c.name} - ${u}`));
            }"""

replacement = """            if (currentUser?.role !== 'admin' && allowedUnits.length > 0) {
              units = units.filter((u: string) => {
                const searchStr = (`${c.name} - ${u}`).toLowerCase().trim();
                return allowedUnits.some((allowed: string) => {
                  const aName = allowed.toLowerCase().trim();
                  return searchStr.includes(aName) || aName.includes(searchStr);
                });
              });
            }"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched MinibarDashboard.tsx units")
    with open("src/components/MinibarDashboard.tsx", "w") as f:
        f.write(content)
else:
    print("Could not find target for units")
