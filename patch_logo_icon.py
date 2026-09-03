import re

with open("src/components/EvdekimiLogo.tsx", "r") as f:
    content = f.read()

content = content.replace("import React from 'react';", "import React from 'react';\nimport { Building } from 'lucide-react';")

new_icon = """<div className={`flex items-center justify-center rounded-xl bg-blue-600/10 p-2 shrink-0 ${activeVariant === 'white' ? 'bg-white/10 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
        <Building className="w-8 h-8" />
      </div>"""

content = re.sub(r'<img[^>]+/>', new_icon, content)

with open("src/components/EvdekimiLogo.tsx", "w") as f:
    f.write(content)
print("Patched")
