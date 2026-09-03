import re

with open("src/components/EvdekimiLogo.tsx", "r") as f:
    content = f.read()

imports = """import React from 'react';
import logoWhitePath from '../../public/logo-ev-white.png';
import logoBluePath from '../../public/logo-ev-blue.png';
"""
content = content.replace("import React from 'react';", imports)

content = content.replace("'/logo-ev-white.png'", "logoWhitePath")
content = content.replace("'/logo-ev-blue.png'", "logoBluePath")

with open("src/components/EvdekimiLogo.tsx", "w") as f:
    f.write(content)
print("Logo import patched")
