const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace Q to R in the sheet range configs safely using string methods

content = content.split('Guests!A1:Q1').join('Guests!A1:R1');
content = content.split('"Contact Number", "Contact Email"').join('"Contact Number", "Contact Email", "Booking ID"');

content = content.split('Guests!A2:Q').join('Guests!A2:R');
content = content.split('Guests!A:Q').join('Guests!A:R');
content = content.split('Guests!A${rowIndex + 2}:Q${rowIndex + 2}').join('Guests!A${rowIndex + 2}:R${rowIndex + 2}');

// Updating the mock data arrays
content = content.split(`contactEmail: guest.contactEmail
        });`).join(`contactEmail: guest.contactEmail,
          bookingId: guest.bookingId || ""
        });`);

// Adding bookingId to GET mapping
const targetGet = `guestsCount: row[13] || "",
              photo: row[14] || "",
              contactNumber: row[15] || "",
              contactEmail: row[16] || ""
            })`;
const replacementGet = `guestsCount: row[13] || "",
              photo: row[14] || "",
              contactNumber: row[15] || "",
              contactEmail: row[16] || "",
              bookingId: row[17] || ""
            })`;
content = content.split(targetGet).join(replacementGet);

// Adding bookingId to POST mapping
const targetPost = `guest.contactNumber || '',
              guest.contactEmail || ''
            ]`;
const replacementPost = `guest.contactNumber || '',
              guest.contactEmail || '',
              guest.bookingId || ''
            ]`;
content = content.split(targetPost).join(replacementPost);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed server.ts');
