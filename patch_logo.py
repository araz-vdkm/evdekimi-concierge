import re

with open("src/components/EvdekimiLogo.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'className="h-full w-auto object-contain shrink-0"',
    'className="h-full w-auto object-contain shrink-0"\n        referrerPolicy="no-referrer"'
)

with open("src/components/EvdekimiLogo.tsx", "w") as f:
    f.write(content)
print("Logo patched")
