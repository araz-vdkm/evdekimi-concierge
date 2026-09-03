const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `    // Save consolidated guest list in localStorage cache
    try {
      localStorage.setItem('concierge_registered_guests', JSON.stringify(guestsList));
    } catch(e) {}

    setGuests(guestsList);`;

const replacement = `    // Save consolidated guest list in localStorage cache
    const finalGuests = guestsList.filter(g => g.passportNumber && g.passportNumber !== 'REG-PENDING' && g.passportNumber !== 'Unknown');
    try {
      localStorage.setItem('concierge_registered_guests', JSON.stringify(finalGuests));
    } catch(e) {}

    setGuests(finalGuests);`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
