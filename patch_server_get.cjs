const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /range: \`Guests!A2:R\`,\s*\}\);\s*const rows = response\.data\.values \|\| \[\];\s*const guests = rows\.map\(\(row: any\) => \(\{\s*id: row\[0\] \|\| "",\s*timestamp: row\[1\] \|\| "",\s*fullName: row\[2\] \|\| "",\s*passportNumber: row\[3\] \|\| "",\s*nationality: row\[4\] \|\| "",\s*dob: row\[5\] \|\| "",\s*purpose: row\[6\] \|\| "",\s*upsell: row\[7\] \|\| "",\s*status: row\[8\] \|\| "",\s*checkInDate: row\[9\] \|\| "",\s*checkOutDate: row\[10\] \|\| "",\s*complexName: row\[11\] \|\| "",\s*unitName: row\[12\] \|\| "",\s*guestsCount: row\[13\] \|\| "",\s*photo: row\[14\] \|\| "",\s*contactNumber: row\[15\] \|\| "",\s*contactEmail: row\[16\] \|\| "",\s*bookingId: row\[17\] \|\| ""\s*\}\)\);/;

const replacement = `range: \`Guests!A2:T\`,
      });
      const rows = response.data.values || [];
      const guests = rows.map((row: any) => {
        let upsellVal = row[8] || "";
        try { if (upsellVal.startsWith("{")) upsellVal = JSON.parse(upsellVal); } catch(e){}
        return {
          id: row[0] || "",
          timestamp: row[1] || "",
          fullName: row[2] || "",
          passportNumber: row[3] || "",
          nationality: row[4] || "",
          dob: row[5] || "",
          gender: row[6] || "",
          purpose: row[7] || "",
          upsell: upsellVal,
          status: row[9] || "",
          checkInDate: row[10] || "",
          checkOutDate: row[11] || "",
          complexName: row[12] || "",
          unitName: row[13] || "",
          guestsCount: row[14] || "",
          photo: row[15] || "",
          contactNumber: row[16] || "",
          contactEmail: row[17] || "",
          bookingId: row[18] || "",
          loyaltyStatus: row[19] || "None"
        };
      });`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
