import re

with open("src/components/CheckInFlow.tsx", "r") as f:
    content = f.read()

# Replace empty dependency array with [initialBooking?.id]
# Find:
#     };
#     fetchExistingData();
#   }, []);

content = re.sub(
    r'(\s+fetchExistingData\(\);\s+\},\s*)\[\](\);)',
    r'\1[initialBooking?.id]\2',
    content
)

with open("src/components/CheckInFlow.tsx", "w") as f:
    f.write(content)
print("CheckInFlow deps patched")
