const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const logoutMatch = `  const handleLogout = async () => {
    localStorage.removeItem('conciergeAuth');
    localStorage.removeItem('conciergeUser');
    setCurrentUser(null);
    setToken(null);
    setUsername('');
    setPassword('');
    setNeedsAuth(true);
  };`;

const newLogout = `  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setNeedsAuth(true);
    setCurrentView('home');
    setIsMenuOpen(false);
  };`;

if(code.includes(logoutMatch)) {
    code = code.replace(logoutMatch, newLogout);
}

// Now adding User Management to the Menu
const dashboardMenuMatch = `{isAdmin && (
                  <button
                    onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }}
                    className={\`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors \${currentView === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}\`}
                  >
                    <LayoutDashboard className="w-5 h-5" /> Guest Insights
                  </button>
                )}`;

const newDashboardMenuMatch = `{isAdmin && (
                  <>
                  <button
                    onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }}
                    className={\`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors \${currentView === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}\`}
                  >
                    <LayoutDashboard className="w-5 h-5" /> Guest Insights
                  </button>
                  <button
                    onClick={() => { setCurrentView('usermanagement'); setIsMenuOpen(false); }}
                    className={\`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors \${currentView === 'usermanagement' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}\`}
                  >
                    <Users className="w-5 h-5" /> User Management
                  </button>
                  </>
                )}`;

if(code.includes(dashboardMenuMatch)) {
    code = code.replace(dashboardMenuMatch, newDashboardMenuMatch);
}

// Add the User Management view
const viewMatch = `{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} />}`;

const newViewMatch = `{currentView === 'dashboard' && <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} />}
            {currentView === 'usermanagement' && isAdmin && <UserManagement />}`;

if(code.includes(viewMatch)) {
    code = code.replace(viewMatch, newViewMatch);
}

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx views and menus');
