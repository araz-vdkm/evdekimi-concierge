import re

with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

old_processor = """    // Background queue processor
    const queueProcessor = setInterval(async () => {
      try {
        const localSaved = localStorage.getItem('concierge_registered_guests');
        if (!localSaved) return;
        let guests = JSON.parse(localSaved);
        
        let hasChanges = false;
        for (let i = 0; i < guests.length; i++) {
          if (guests[i].status === 'In Queue') {
            try {
              // Get auth token
              const token = await getAccessToken();
              // Try adding guest again
              const res = await fetch('/api/guests', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ guest: guests[i], spreadsheetId })
              });
              if (res.ok) {
                guests[i].status = 'Checked In';
                hasChanges = true;
              }
            } catch (e) {
              console.warn("Background queue item failed to sync:", e);
            }
          }
        }
        
        if (hasChanges) {
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
    };"""

new_processor = """    // Background queue processor using recursive setTimeout to prevent race conditions
    let isProcessorRunning = true;
    const processQueue = async () => {
      if (!isProcessorRunning) return;
      try {
        const localSaved = localStorage.getItem('concierge_registered_guests');
        if (localSaved) {
            let guests = JSON.parse(localSaved);
            let hasChanges = false;
            for (let i = 0; i < guests.length; i++) {
              if (guests[i].status === 'In Queue') {
                try {
                  const token = await getAccessToken();
                  const res = await fetch('/api/guests', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'x-google-oauth-token': getGoogleToken()
                    },
                    body: JSON.stringify({ guest: guests[i], spreadsheetId })
                  });
                  if (res.ok) {
                    guests[i].status = 'Checked In';
                    hasChanges = true;
                  }
                } catch (e) {
                  console.warn("Background queue item failed to sync:", e);
                }
              }
            }
            if (hasChanges) {
              localStorage.setItem('concierge_registered_guests', JSON.stringify(guests));
              fetchGuests(); // Refresh UI
            }
        }
      } catch (e) {
        console.warn("Queue processor error:", e);
      }
      
      if (isProcessorRunning) {
        setTimeout(processQueue, 120000); // 2 minutes
      }
    };
    
    // Start initial delay
    const queueTimeout = setTimeout(processQueue, 120000);
    
    return () => {
      window.removeEventListener('local-storage-synced', handleSync);
      isProcessorRunning = false;
      clearTimeout(queueTimeout);
    };"""

content = content.replace(old_processor, new_processor)

# We also need to import getGoogleToken if it's not imported
if 'getGoogleToken' not in content:
    content = content.replace('import { getAccessToken } from \'../lib/auth\';', 'import { getAccessToken, getGoogleToken } from \'../lib/auth\';')

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(content)

print("Dashboard queue processor patched")
