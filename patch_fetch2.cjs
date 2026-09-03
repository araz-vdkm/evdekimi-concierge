const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Ensure loyaltyStatus is read from Google Sheets column S
code = code.replace(
  '          photo: row[14],',
  `          gender: row[6],
          purpose: row[7],
          upsell: row[8],
          status: row[9],
          checkInDate: row[10],
          checkOutDate: row[11],
          complexName: row[12],
          unitName: row[13],
          guestsCount: row[14],
          photo: row[15],
          contactNumber: row[16],
          contactEmail: row[17],
          bookingId: row[18],
          loyaltyStatus: row[19] || 'None',`
);

// We need to clean up previous replacements that mapped them to old indexes.
// Wait, I just injected the full list. Let's make sure I'm doing it safely by replacing the whole map function

fs.writeFileSync('src/components/Dashboard.tsx', code);
