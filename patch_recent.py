import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

old = """        .filter(g => {
          if (!g.timestamp) return false;
          return new Date(g.timestamp) >= fiveDaysAgo;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());"""

new = """        .filter(g => {
          const dateStr = g.createdAt || g.checkInDate || g.timestamp;
          if (!dateStr) return false;
          return new Date(dateStr) >= fiveDaysAgo;
        })
        .sort((a, b) => {
          const dateA = a.createdAt || a.checkInDate || a.timestamp || '';
          const dateB = b.createdAt || b.checkInDate || b.timestamp || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });"""

content = content.replace(old, new)

# Also update the dropdown to show checkInDate instead of timestamp
old_option = "{new Date(g.timestamp).toLocaleDateString()}"
new_option = "{new Date(g.createdAt || g.checkInDate || g.timestamp).toLocaleDateString()}"
content = content.replace(old_option, new_option)

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
