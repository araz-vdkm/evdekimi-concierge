const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  "guestsList = parsed;",
  "guestsList = parsed.filter((g: any) => g.passportNumber && g.passportNumber !== 'REG-PENDING' && g.passportNumber !== 'Unknown');"
);

content = content.replace(
  "guestsList = remoteGuests;",
  "guestsList = remoteGuests.filter((g: any) => g.passportNumber && g.passportNumber !== 'REG-PENDING' && g.passportNumber !== 'Unknown');"
);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
