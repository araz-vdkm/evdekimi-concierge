import re

with open('src/components/Home.tsx', 'r') as f:
    content = f.read()

# Find the start of the columns
start_idx = content.find('{/* Arrivals (Check-ins) Column */}')
mid_idx = content.find('{/* Departures (Check-outs) Column */}')
end_idx = content.find('</div>\n\n        </div>\n      )}\n\n      {/* Survey Reconfirmation Modal */}')

if start_idx == -1 or mid_idx == -1 or end_idx == -1:
    print("Could not find markers")
    print(start_idx, mid_idx, end_idx)
    exit(1)

arrivals_block = content[start_idx:mid_idx]
departures_block = content[mid_idx:end_idx]

# I need to be careful not to cut off any div tags. Let's find the exact end of departures block.
# Wait, let's just use the exact indices if they look right.
# The `departures_block` ends right before `</div>\n\n        </div>\n      )}\n\n      {/* Survey...`
# That means it ends with `</div>\n          </div>\n`

# Let's inspect the exact characters
