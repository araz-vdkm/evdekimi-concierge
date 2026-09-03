const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "{currentView === 'home' && <Home onSelectView={(view, data) => { setCurrentView(view); if (data) setCheckinData(data); else setCheckinData(null); }} isAdmin={isAdmin} userRole={currentUser?.role} />}",
  "{currentView === 'home' && <Home onSelectView={(view, data) => { setCurrentView(view); if (data) setCheckinData(data); else setCheckinData(null); }} isAdmin={isAdmin} userRole={currentUser?.role} currentUser={currentUser} />}"
);

code = code.replace(
  "{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} />}",
  "{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} currentUser={currentUser} />}"
);

fs.writeFileSync('src/App.tsx', code);
