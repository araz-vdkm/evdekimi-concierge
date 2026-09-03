import re

with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

# Replace the queueProcessor logic using regex
old_queue = r"const queueProcessor = setInterval\(async \(\) => \{.*?\n\s+return \(\) => \{\n\s+window\.removeEventListener\('local-storage-synced', handleSync\);\n\s+clearInterval\(queueProcessor\);\n\s+\};\n\s+\},"
new_queue = r"""let isProcessorRunning = true;
    const processQueue = async () => {
      if (!isProcessorRunning) return;
      try {
        const localSaved = (await idbGet("concierge_registered_guests"));
        if (!localSaved) return;
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
          await idbSet("concierge_registered_guests", JSON.stringify(guests));
          fetchGuests(); // Refresh UI
        }
      } catch (e) {
        console.warn("Queue processor error:", e);
      }
      if (isProcessorRunning) setTimeout(processQueue, 120000);
    };
    const queueTimeout = setTimeout(processQueue, 120000);
    
    return () => {
      window.removeEventListener('local-storage-synced', handleSync);
      isProcessorRunning = false;
      clearTimeout(queueTimeout);
    };
  ,"""

content = re.sub(old_queue, new_queue, content, flags=re.DOTALL)

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(content)

print("queue patched")
