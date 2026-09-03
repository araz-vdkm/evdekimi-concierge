import re
with open("src/components/MinibarDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("import { Coffee, ChevronLeft", "import { Coffee, ChevronLeft, Camera")
with open("src/components/MinibarDashboard.tsx", "w") as f:
    f.write(c)
