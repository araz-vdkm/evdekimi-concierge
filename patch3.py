import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('value={g.id}>{g.fullName}', 'value={g.bookingId || g.id}>{g.fullName}')
content = content.replace('const guest = recentGuests.find(g => g.id === gId);', 'const guest = recentGuests.find(g => (g.bookingId || g.id) === gId);')

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
