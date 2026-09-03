import re

with open("src/components/EvdekimiLogo.tsx", "r") as f:
    content = f.read()

content = content.replace("import logoWhitePath from '../../public/logo-ev-white.png';\n", "")
content = content.replace("import logoBluePath from '../../public/logo-ev-blue.png';\n", "")
content = content.replace("""  const logoSrc = activeVariant === 'white' 
    ? logoWhitePath 
    : logoBluePath;
""", "")

with open("src/components/EvdekimiLogo.tsx", "w") as f:
    f.write(content)
print("Patched 2")
