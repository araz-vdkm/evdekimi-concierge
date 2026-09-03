const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

const fetchBlockFind = `        try {
          await fetch('/api/guests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ spreadsheetId, guest: finalGuest })
          });
        } catch (e) {
          console.warn("Could not send guest to server, saving locally", e);
        }`;

const fetchBlockReplace = `        try {
          const res = await fetch('/api/guests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ spreadsheetId, guest: finalGuest })
          });
          if (!res.ok) throw new Error("API error");
          finalGuest._synced = true;
        } catch (e) {
          console.warn("Could not send guest to server, saving locally", e);
          finalGuest._synced = false;
        }`;

code = code.replace(fetchBlockFind, fetchBlockReplace);

fs.writeFileSync('src/components/CheckInFlow.tsx', code);
