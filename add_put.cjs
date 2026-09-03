const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const putRoute = `
  // PUT /api/guests/:id
  app.put("/api/guests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { guest, spreadsheetId } = req.body;
      if (!guest) return res.status(400).json({ error: "Missing guest data" });
      if (!spreadsheetId) return res.status(400).json({ error: "Missing spreadsheetId" });

      const sheets = getSheetsClient(req.headers.authorization);
      
      if (sheets.isMock) {
        const index = mockGuestsData.findIndex(g => g.id === id);
        if (index !== -1) {
          mockGuestsData[index] = { ...mockGuestsData[index], ...guest };
        }
        return res.json({ success: true, mock: true });
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: \`Guests!A2:A\`,
      });
      
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: any) => row[0] === id);
      
      if (rowIndex === -1) {
         return res.status(404).json({ error: "Guest not found" });
      }
      
      // Update specific columns: Full Name (C), Passport (D), Nationality (E), DOB (F), Status (I)
      // Columns are A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9
      
      // We can just update the whole row if we get all fields, but we only have some fields in \`guest\`.
      // Let's do a partial update of just those fields if provided.
      // But maybe it's easier to just fetch the full row, update it, and write it back.
      const fullRowResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: \`Guests!A\${rowIndex + 2}:Q\${rowIndex + 2}\`
      });
      
      const row = fullRowResp.data.values[0];
      if (guest.fullName) row[2] = guest.fullName;
      if (guest.passportNumber) row[3] = guest.passportNumber;
      if (guest.nationality) row[4] = guest.nationality;
      if (guest.dob) row[5] = guest.dob;
      if (guest.status) row[8] = guest.status;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: \`Guests!A\${rowIndex + 2}:Q\${rowIndex + 2}\`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row]
        }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.warn("Error updating guest:", error);
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace(
  /  \/\/ POST \/api\/analyze-passport/,
  putRoute + '\n  // POST /api/analyze-passport'
);

fs.writeFileSync('server.ts', content, 'utf8');
