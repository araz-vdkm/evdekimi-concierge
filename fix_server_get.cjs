const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "range: \`Guests!A2:O\`,",
  "range: \`Guests!A2:Q\`,"
);

content = content.replace(
  `      const guests = rows.map((row: any) => ({
        id: row[0] || "",
        timestamp: row[1] || "",
        fullName: row[2] || "",
        passportNumber: row[3] || "",
        nationality: row[4] || "",
        dob: row[5] || "",
        purpose: row[6] || "",
        upsell: row[7] || "",
        status: row[8] || "",
        checkInDate: row[9] || "",
        checkOutDate: row[10] || "",
        complexName: row[11] || "",
        unitName: row[12] || "",
        guestsCount: row[13] || "",
        photo: row[14] || "",
      }));`,
  `      const guests = rows.map((row: any) => ({
        id: row[0] || "",
        timestamp: row[1] || "",
        fullName: row[2] || "",
        passportNumber: row[3] || "",
        nationality: row[4] || "",
        dob: row[5] || "",
        purpose: row[6] || "",
        upsell: row[7] || "",
        status: row[8] || "",
        checkInDate: row[9] || "",
        checkOutDate: row[10] || "",
        complexName: row[11] || "",
        unitName: row[12] || "",
        guestsCount: row[13] || "",
        photo: row[14] || "",
        contactNumber: row[15] || "",
        contactEmail: row[16] || "",
      }));`
);

fs.writeFileSync('server.ts', content, 'utf8');
