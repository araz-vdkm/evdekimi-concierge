import re

with open('src/components/Register.tsx', 'r') as f:
    content = f.read()

# Make sure collection and getDocs are imported
if "from 'firebase/firestore'" in content:
    if "collection" not in content or "getDocs" not in content:
        # We need to add them
        old_import = re.search(r"import\s+\{[^}]+\}\s+from\s+['\"]firebase/firestore['\"];?", content).group(0)
        # It's easier to just ensure they are there
        new_import = "import { collection, getDocs } from 'firebase/firestore';"
        if new_import not in content:
             content = content.replace(old_import, old_import + "\n" + new_import)
else:
    # No firestore imports yet
    content = "import { collection, getDocs } from 'firebase/firestore';\n" + content

if "import { db } from '../lib/auth';" not in content:
    # Try finding an auth import
    auth_match = re.search(r"import\s+\{.*\}\s+from\s+['\"]../lib/auth['\"];?", content)
    if auth_match:
        old_auth = auth_match.group(0)
        if "db" not in old_auth:
            new_auth = old_auth.replace("{", "{ db, ")
            content = content.replace(old_auth, new_auth)
    else:
        content = "import { db } from '../lib/auth';\n" + content


old_use_effect = """  useEffect(() => {
    fetch('/api/complexes')
      .then(res => (res.ok && res.headers.get("content-type")?.includes("application/json")) ? res.json() : { complexes: [], unitsByComplex: {} })
      .then(data => {
        setComplexes(data.complexes || []);
        setUnitsByComplex(data.unitsByComplex || {});
      })
      .catch(err => console.error(err));
  }, []);"""

new_use_effect = """  useEffect(() => {
    getDocs(collection(db, "villaMappings"))
      .then(querySnapshot => {
        const complexSet = new Set<string>();
        const unitsMap: Record<string, string[]> = {};
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const c = data.complexType?.trim();
          const u = data.unitName?.trim();
          if (c) {
            complexSet.add(c);
            if (!unitsMap[c]) unitsMap[c] = [];
            if (u && !unitsMap[c].includes(u)) {
              unitsMap[c].push(u);
            }
          }
        });

        const sortedComplexes = Array.from(complexSet).sort();
        for (const c of sortedComplexes) {
          unitsMap[c].sort();
        }

        setComplexes(sortedComplexes);
        setUnitsByComplex(unitsMap);
      })
      .catch(err => console.error("Failed to fetch villa mappings:", err));
  }, []);"""

if old_use_effect in content:
    content = content.replace(old_use_effect, new_use_effect)
    print("Patched Register.tsx successfully")
else:
    print("Could not find useEffect in Register.tsx")

with open('src/components/Register.tsx', 'w') as f:
    f.write(content)
