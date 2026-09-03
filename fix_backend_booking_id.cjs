const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/Guests!A1:Q1/g, 'Guests!A1:R1');
content = content.replace(/"Contact Number", "Contact Email"/g, '"Contact Number", "Contact Email", "Booking ID"');

content = content.replace(/Guests!A2:Q/g, 'Guests!A2:R');
content = content.replace(
  /guestsCount: row\[13\] || "",\n              photo: row\[14\] || "",\n              contactNumber: row\[15\] || "",\n              contactEmail: row\[16\] || ""\n            \}\)/g,
  `guestsCount: row[13] || "",
              photo: row[14] || "",
              contactNumber: row[15] || "",
              contactEmail: row[16] || "",
              bookingId: row[17] || ""
            })`
);

content = content.replace(/Guests!A:Q/g, 'Guests!A:R');

content = content.replace(
  /              guest.contactNumber \|\| '',\n              guest.contactEmail \|\| ''\n            \]/g,
  `              guest.contactNumber || '',
              guest.contactEmail || '',
              guest.bookingId || ''
            ]`
);

content = content.replace(/Guests!A\$\{rowIndex \+ 2\}:Q\$\{rowIndex \+ 2\}/g, 'Guests!A${rowIndex + 2}:R${rowIndex + 2}');

// Add bookingId to mockGuestsData pushes
content = content.replace(
  /contactEmail: guest\.contactEmail\n        \}\);/g,
  `contactEmail: guest.contactEmail,
          bookingId: guest.bookingId
        });`
);

fs.writeFileSync('server.ts', content, 'utf8');
