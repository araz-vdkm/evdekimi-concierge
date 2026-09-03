import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

payload_find = """        complexName: selectedComplex,
        unitName: selectedUnit,"""
payload_replace = """        complexName: selectedComplex,
        unitName: selectedUnit,
        bookingId: selectedGuestId || `manual-${Date.now()}`,"""

if "bookingId: selectedGuestId" not in content:
    content = content.replace(payload_find, payload_replace)
    with open('src/components/MinibarDashboard.tsx', 'w') as f:
        f.write(content)
        print("Updated bookingId payload")
else:
    print("Already updated")
