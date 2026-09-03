import re

with open("src/components/Home.tsx", "r") as f:
    content = f.read()

target = """    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
      const allowedComplexes = currentUser.assignedComplexes || [];
      filteredList = reservationsList.filter(r => {
         const cName = r.complexName || r.villa || '';
         return allowedComplexes.includes(cName) || allowedComplexes.length === 0;
      });
    }"""

replacement = """    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
      const allowedComplexes = currentUser.assignedComplexes || [];
      filteredList = reservationsList.filter(r => {
         const cName = (r.complexName || r.villa || '').toLowerCase().trim();
         return allowedComplexes.length === 0 || allowedComplexes.some((allowed: string) => {
            const aName = allowed.toLowerCase().trim();
            return cName.includes(aName) || aName.includes(cName);
         });
      });
    }"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched Home.tsx")
else:
    print("Could not find target in Home.tsx")

with open("src/components/Home.tsx", "w") as f:
    f.write(content)


with open("src/components/MinibarDashboard.tsx", "r") as f:
    content2 = f.read()

target2 = """          if (currentUser?.role !== 'admin' && allowedComplexes.length > 0) {
            filteredData = data.filter((c: any) => allowedComplexes.includes(c.name));
          }"""

replacement2 = """          if (currentUser?.role !== 'admin' && allowedComplexes.length > 0) {
            filteredData = data.filter((c: any) => {
              const cName = (c.name || '').toLowerCase().trim();
              return allowedComplexes.some((allowed: string) => {
                const aName = allowed.toLowerCase().trim();
                return cName.includes(aName) || aName.includes(cName);
              });
            });
          }"""

if target2 in content2:
    content2 = content2.replace(target2, replacement2)
    print("Patched MinibarDashboard.tsx")
else:
    print("Could not find target in MinibarDashboard.tsx")

with open("src/components/MinibarDashboard.tsx", "w") as f:
    f.write(content2)

