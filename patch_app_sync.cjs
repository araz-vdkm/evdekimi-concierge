const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const watchdogFind = `    // Background watchdog: periodically sync database state to local storage every 5 minutes
    const dbWatchdog = setInterval(() => {
      syncAllRecordsToLocal();
    }, 5 * 60 * 1000);`;

const watchdogReplace = `    // Background watchdog: periodically sync database state to local storage every 5 minutes
    const dbWatchdog = setInterval(() => {
      syncAllRecordsToLocal();
      syncOfflineGuests();
    }, 5 * 60 * 1000);
    
    // Also try syncing on load and when online
    const syncOfflineGuests = async () => {
      const savedId = localStorage.getItem('conciergeSpreadsheetId');
      if (!savedId) return;
      try {
        let savedGuests = JSON.parse(localStorage.getItem('concierge_registered_guests') || '[]');
        let needsSave = false;
        
        for (let i = 0; i < savedGuests.length; i++) {
           const g = savedGuests[i];
           if (g._synced === false) {
              try {
                const token = await import('./lib/auth').then(m => m.getAccessToken());
                const res = await fetch('/api/guests', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                  },
                  body: JSON.stringify({ spreadsheetId: savedId, guest: g })
                });
                if (res.ok) {
                   g._synced = true;
                   needsSave = true;
                }
              } catch(e) {
                 // Still offline
                 break; 
              }
           }
        }
        
        if (needsSave) {
           localStorage.setItem('concierge_registered_guests', JSON.stringify(savedGuests));
        }
      } catch(e) {}
    };
    
    window.addEventListener('online', syncOfflineGuests);
    syncOfflineGuests();`;

code = code.replace(watchdogFind, watchdogReplace);

fs.writeFileSync('src/App.tsx', code);
