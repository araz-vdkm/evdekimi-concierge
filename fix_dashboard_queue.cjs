const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const hookInsert = `
  useEffect(() => {
    fetchGuests();
    const handleSync = () => fetchGuests();
    window.addEventListener('local-storage-synced', handleSync);
    
    // Background queue processor
    const queueProcessor = setInterval(async () => {
      try {
        const localSaved = localStorage.getItem('concierge_registered_guests');
        if (!localSaved) return;
        let guests = JSON.parse(localSaved);
        
        let hasUpdates = false;
        const token = await getAccessToken().catch(() => 'dummy-token');
        
        for (let i = 0; i < guests.length; i++) {
          const g = guests[i];
          if (g.status === 'In Queue' && g.photo && g.photo.length > 20) {
            console.log("Processing queued guest photo...");
            try {
              const res = await fetch('/api/analyze-passport', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ imageBase64: g.photo })
              });
              if (res.ok) {
                const data = await res.json();
                guests[i] = { ...g, ...data, status: 'Checked In' };
                hasUpdates = true;
                
                // Update in backend Google Sheet if we can (using our new PUT route)
                if (g.id && spreadsheetId) {
                  await fetch(\`/api/guests/\${g.id}\`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({ spreadsheetId, guest: guests[i] })
                  }).catch(e => console.warn("Failed to update backend sheet", e));
                }
              }
            } catch (err) {
              console.warn("Queue processor failed for a guest:", err);
            }
          }
        }
        
        if (hasUpdates) {
          localStorage.setItem('concierge_registered_guests', JSON.stringify(guests));
          fetchGuests(); // Refresh UI
        }
        
      } catch (e) {
        console.warn("Queue processor error:", e);
      }
    }, 120000); // 2 minutes
    
    return () => {
      window.removeEventListener('local-storage-synced', handleSync);
      clearInterval(queueProcessor);
    };
  }, [spreadsheetId]);
`;

content = content.replace(
  /  useEffect\(\(\) => \{\n    fetchGuests\(\);\n    const handleSync = \(\) => fetchGuests\(\);\n    window\.addEventListener\('local-storage-synced', handleSync\);\n    return \(\) => window\.removeEventListener\('local-storage-synced', handleSync\);\n  \}, \[spreadsheetId\]\);/,
  hookInsert
);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
