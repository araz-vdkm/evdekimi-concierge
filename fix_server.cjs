const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace range from Q to R
content = content.replace(/Guests!A1:Q1/g, 'Guests!A1:R1');
content = content.replace(/Guests!A2:Q/g, 'Guests!A2:R');
content = content.replace(/Guests!A:Q/g, 'Guests!A:R');

// Update column headers
content = content.replace(/"Contact Number", "Contact Email"/g, '"Contact Number", "Contact Email", "Booking ID"');

// Update GET mapping
content = content.replace(/guestsCount: row\[13\] \|\| "",/g, 'guestsCount: row[13] || "",');
content = content.replace(/contactEmail: row\[16\] \|\| ""\n            \}\)/g, 'contactEmail: row[16] || "",\n              bookingId: row[17] || ""\n            })');

// Update POST mapping
content = content.replace(/guest\.contactEmail \|\| ''\n            \]/g, 'guest.contactEmail || "",\n              guest.bookingId || ""\n            ]');

// Update PUT
const putTarget = "range: `Guests!A${rowIndex + 2}:Q${rowIndex + 2}`";
const putReplacement = "range: `Guests!A${rowIndex + 2}:R${rowIndex + 2}`";
content = content.split(putTarget).join(putReplacement);

// Update PUT mock
content = content.replace(/contactEmail: guest\.contactEmail\n        \}\);/g, 'contactEmail: guest.contactEmail,\n          bookingId: guest.bookingId\n        });');

fs.writeFileSync('server.ts', content, 'utf8');
