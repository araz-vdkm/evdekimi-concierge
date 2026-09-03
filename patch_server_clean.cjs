const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Undo the regex replace if it messed up
code = code.replace(/\$1/g, `guest.id,
              new Date().toISOString(),
              guest.fullName,
              guest.passportNumber,
              guest.nationality,
              guest.dob,
              guest.purpose,
              guest.upsell,
              "Checked In",
              guest.checkInDate,
              guest.checkOutDate,
              guest.complexName,
              guest.unitName,
              guest.guestsCount,
              guest.photo,
              guest.contactNumber,
              guest.contactEmail,
              `);
              
fs.writeFileSync('server.ts', code);
