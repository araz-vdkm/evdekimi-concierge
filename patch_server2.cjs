const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// fix the mock object syntax error
code = code.replace(
  'dob: guest.dob,\n              guest.gender || "",\n          purpose: guest.purpose,',
  'dob: guest.dob,\n          gender: guest.gender || "",\n          purpose: guest.purpose,'
);

// fix ensureGuestsSheet headers
code = code.replace(
  'values: [["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID"]]',
  'values: [["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Gender", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID", "Loyalty Status"]]'
);

// Replace the append call for POST /api/guests
const postRegex = /await sheets\.spreadsheets\.values\.append\(\{\s*spreadsheetId,\s*range: `Guests!A:R`,\s*valueInputOption: "USER_ENTERED",\s*requestBody: \{\s*values: \[\s*\[[\s\S]*?guest\.bookingId \|\| ''\s*\]\s*\]\s*\}\s*\}\);/;

const postReplacement = `
      // Calculate Loyalty
      let loyaltyStatus = 'None';
      try {
        const allGuestsData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: \`Guests!A:T\`
        });
        const rows = allGuestsData.data.values || [];
        if (rows.length > 1) {
          const headers = rows[0];
          const passportIdx = headers.indexOf("Passport Number");
          const statusIdx = headers.indexOf("Status");
          const checkInIdx = headers.indexOf("Check-in Date");
          const checkOutIdx = headers.indexOf("Check-out Date");

          const parsedGuests = rows.slice(1).map(r => ({
            passportNumber: r[passportIdx],
            status: r[statusIdx],
            checkInDate: r[checkInIdx],
            checkOutDate: r[checkOutIdx]
          }));
          
          loyaltyStatus = calculateLoyaltyStatus(guest.passportNumber, parsedGuests);
        }
      } catch (e) {
        console.warn("Failed to calculate loyalty", e);
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: \`Guests!A:T\`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              guest.id,
              new Date().toISOString(),
              guest.fullName,
              guest.passportNumber,
              guest.nationality,
              guest.dob,
              guest.gender || "",
              guest.purpose,
              typeof guest.upsell === 'object' ? JSON.stringify(guest.upsell) : guest.upsell,
              "Checked In",
              guest.checkInDate,
              guest.checkOutDate,
              guest.complexName,
              guest.unitName,
              guest.guestsCount,
              guest.photo,
              guest.contactNumber || '',
              guest.contactEmail || '',
              guest.bookingId || '',
              loyaltyStatus
            ]
          ]
        }
      });
`;

code = code.replace(postRegex, postReplacement);

// Fix PUT /api/guests/:id to also map things correctly if needed.
// PUT /api/guests/:id replaces the whole row. Let's find how it forms the values array.
const putRegex = /const updateValues = \[\s*\[[\s\S]*?guest\.bookingId \|\| ""\s*\]\s*\];/;

const putReplacement = `
        const updateValues = [
          [
            guest.id,
            guest.timestamp || new Date().toISOString(),
            guest.fullName,
            guest.passportNumber,
            guest.nationality,
            guest.dob,
            guest.gender || "",
            guest.purpose,
            typeof guest.upsell === 'object' ? JSON.stringify(guest.upsell) : guest.upsell,
            guest.status || "Checked In",
            guest.checkInDate,
            guest.checkOutDate,
            guest.complexName,
            guest.unitName,
            guest.guestsCount,
            guest.photo,
            guest.contactNumber || '',
            guest.contactEmail || '',
            guest.bookingId || '',
            guest.loyaltyStatus || 'None'
          ]
        ];
`;

code = code.replace(putRegex, putReplacement);

code = code.replace(
  /range: \`Guests!A\$\{rowIndex\}:R\$\{rowIndex\}\`/,
  "range: `Guests!A${rowIndex}:T${rowIndex}`"
);

fs.writeFileSync('server.ts', code);
console.log("Server phase 2 patched");
