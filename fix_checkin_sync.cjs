const fs = require('fs');
let content = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

const replacement = `        // Always save to local storage cache so guest list is persistent
        try {
          const savedGuests = JSON.parse(localStorage.getItem('concierge_registered_guests') || '[]');
          savedGuests.unshift(finalGuest);
          localStorage.setItem('concierge_registered_guests', JSON.stringify(savedGuests));
        } catch (e) {}
        
        // Also save to Firebase guests collection for cross-device sync
        try {
           await saveRecord('guests', finalGuest.id, finalGuest);
        } catch (e) {
           console.warn("Failed to save guest to Firebase collection:", e);
        }
      }`;

content = content.replace(
/        \/\/ Always save to local storage cache so guest list is persistent[\s\S]*?\} catch \(e\) \{\}\n      \}/,
replacement
);

fs.writeFileSync('src/components/CheckInFlow.tsx', content, 'utf8');
console.log('Successfully updated CheckInFlow to save guests to Firebase');
