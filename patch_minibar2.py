import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update fetchComplexes to handle { complexes, unitsByComplex }
old_fetch = """        if (res.ok) {
          const data = await res.json();
          const allowedComplexes = currentUser?.assignedComplexes || [];
          const allowedUnits = currentUser?.assignedUnits || [];
          
          let filteredData = data;
          if (currentUser?.role !== 'admin' && allowedComplexes.length > 0) {
            filteredData = data.filter((c: any) => {
              const cName = (c.name || '').toLowerCase().trim();
              return allowedComplexes.some((allowed: string) => {
                const aName = allowed.toLowerCase().trim();
                return cName.includes(aName) || aName.includes(cName);
              });
            });
          }
          
          setComplexes(filteredData.map((c: any) => c.name));
          
          const uMap: Record<string, string[]> = {};
          filteredData.forEach((c: any) => {
            let units = c.units || [];
            if (currentUser?.role !== 'admin' && allowedUnits.length > 0) {
              units = units.filter((u: string) => {
                const searchStr = (`${c.name} - ${u}`).toLowerCase().trim();
                return allowedUnits.some((allowed: string) => {
                  const aName = allowed.toLowerCase().trim();
                  return searchStr.includes(aName) || aName.includes(searchStr);
                });
              });
            }
            uMap[c.name] = units;
          });
          setUnitsByComplex(uMap);
        }"""

new_fetch = """        if (res.ok) {
          const data = await res.json();
          const allComplexes = data.complexes || [];
          const allUnitsMap = data.unitsByComplex || {};
          
          const allowedComplexes = currentUser?.assignedComplexes || [];
          const allowedUnits = currentUser?.assignedUnits || [];
          
          let filteredComplexes = allComplexes;
          if (currentUser?.role !== 'admin' && allowedComplexes.length > 0) {
            filteredComplexes = allComplexes.filter((cName: string) => {
              const nameLower = (cName || '').toLowerCase().trim();
              return allowedComplexes.some((allowed: string) => {
                const aName = allowed.toLowerCase().trim();
                return nameLower.includes(aName) || aName.includes(nameLower);
              });
            });
          }
          
          setComplexes(filteredComplexes);
          
          const uMap: Record<string, string[]> = {};
          filteredComplexes.forEach((cName: string) => {
            let units = allUnitsMap[cName] || [];
            if (currentUser?.role !== 'admin' && allowedUnits.length > 0) {
              units = units.filter((u: string) => {
                const searchStr = (`${cName} - ${u}`).toLowerCase().trim();
                const justUnitSearchStr = u.toLowerCase().trim();
                return allowedUnits.some((allowed: string) => {
                  const aName = allowed.toLowerCase().trim();
                  return searchStr.includes(aName) || aName.includes(searchStr) || justUnitSearchStr === aName;
                });
              });
            }
            uMap[cName] = units;
          });
          setUnitsByComplex(uMap);
        }"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("Patched fetchComplexes")
else:
    print("Could not find old_fetch")

# 2. Update PREDEFINED_ITEMS
old_items_regex = r"const PREDEFINED_ITEMS = \[\s*\{ name: 'Coca-Cola.*?\];"

new_items = """const PREDEFINED_ITEMS = [
  { name: 'Organique Water', defaultPrice: 35000 },
  { name: 'Pocari Sweat', defaultPrice: 25000 },
  { name: 'Soda Water', defaultPrice: 25000 },
  { name: 'Buavita Juice', defaultPrice: 25000 },
  { name: 'Coca-Cola', defaultPrice: 25000 },
  { name: 'Coca-Cola Zero', defaultPrice: 25000 },
  { name: 'UC 1000 Vitamin C', defaultPrice: 30000 },
  { name: 'Redbull', defaultPrice: 50000 },
  { name: 'Snickers', defaultPrice: 30000 },
  { name: 'Oatside Oatmilk', defaultPrice: 20000 },
  { name: 'Bintang', defaultPrice: 50000 },
  { name: 'Bali Hai', defaultPrice: 50000 },
  { name: 'Kura Kura Hazy', defaultPrice: 90000 },
  { name: 'Kura Kura Ale', defaultPrice: 90000 },
  { name: 'Pringless', defaultPrice: 35000 },
  { name: 'Roasted Peanut', defaultPrice: 25000 },
  { name: 'Granobar', defaultPrice: 25000 },
  { name: 'Oatside Cereal Bar', defaultPrice: 25000 },
  { name: 'Roasted Almond', defaultPrice: 30000 },
  { name: 'Salted Pistachio', defaultPrice: 35000 }
];"""

content = re.sub(old_items_regex, new_items, content, flags=re.DOTALL)
print("Patched PREDEFINED_ITEMS")


with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)

