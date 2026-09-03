const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const originalLogic = `  useEffect(() => {
    document.title = "Concierge Pro by EVDEkimi";
    syncAllRecordsToLocal();
    
    const handleRefresh = () => syncAllRecordsToLocal();
    window.addEventListener('refresh-data', handleRefresh);`;

const newLogic = `  useEffect(() => {
    document.title = "Concierge Pro by EVDEkimi";
    syncAllRecordsToLocal();
    
    const handleRefresh = () => syncAllRecordsToLocal();
    window.addEventListener('refresh-data', handleRefresh);
    
    // Background watchdog: periodically sync database state to local storage every 5 minutes
    const dbWatchdog = setInterval(() => {
      syncAllRecordsToLocal();
    }, 5 * 60 * 1000);`;

const originalLogic2 = `    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
    };
  }, []);`;

const newLogic2 = `    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
      clearInterval(dbWatchdog);
    };
  }, []);`;

code = code.replace(originalLogic, newLogic);
code = code.replace(originalLogic2, newLogic2);
fs.writeFileSync('src/App.tsx', code);
console.log('done');
