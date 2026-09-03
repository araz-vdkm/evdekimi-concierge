const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldRender = `{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} />}`;
const newRender = `{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} />}`;

code = code.replace(oldRender, newRender);
fs.writeFileSync('src/App.tsx', code);
