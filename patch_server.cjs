const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const loyaltyLogic = `
function calculateLoyaltyStatus(passportNumber, currentGuests) {
  if (!passportNumber) return 'None';
  
  const previousStays = currentGuests.filter(g => g.passportNumber === passportNumber && g.status === 'Checked Out');
  
  if (previousStays.length === 0) return 'None';
  
  const totalBookings = previousStays.length;
  let totalNights = 0;
  
  previousStays.forEach(stay => {
    if (stay.checkInDate && stay.checkOutDate) {
      const inDate = new Date(stay.checkInDate);
      const outDate = new Date(stay.checkOutDate);
      if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
        const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalNights += diffDays;
      }
    }
  });

  if (totalBookings > 5 || totalNights > 10) return 'Gold';
  if (totalBookings > 3 || totalNights > 7) return 'Silver';
  if (totalBookings > 1) return 'Bronze';
  
  return 'None';
}
`;

if (!code.includes('calculateLoyaltyStatus')) {
  code = code.replace(
    'async function startServer() {',
    loyaltyLogic + '\nasync function startServer() {'
  );
}

// Ensure the Guests sheet header gets the Loyalty Column
code = code.replace(
  '          values: [["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID"]]',
  '          values: [["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID", "Loyalty Status"]]'
);

code = code.replace(
  /await sheets\.spreadsheets\.values\.append\(\{\s*spreadsheetId,\s*range: `Guests!A:[A-Z]`,\s*valueInputOption: "USER_ENTERED",\s*requestBody: \{\s*values: \[\s*\[([\s\S]*?)guest\.bookingId \|\| ""\s*\]\s*\]\s*\}\s*\}\);/,
  `// Check loyalty before saving
      let loyaltyStatus = 'None';
      try {
        const allGuestsData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: \`Guests!A:S\`
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
        range: \`Guests!A:S\`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              $1guest.bookingId || "",
              loyaltyStatus
            ]
          ]
        }
      });`
);

// We need to carefully replace the nested values array.
// Instead of full regex replace, let's just do a string replace since we know the exact shape.
fs.writeFileSync('server.ts', code);
console.log('patched');
