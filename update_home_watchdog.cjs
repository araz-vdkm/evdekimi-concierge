const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

const originalLogic = `  useEffect(() => {
    fetchReservations();
    
    const handleRefresh = () => fetchReservations(true);
    const handleStorageSync = () => {
      try {
        setSentSurveys(JSON.parse(localStorage.getItem('sent_surveys') || '{}'));
      } catch (e) {}
      // Force a re-render to pick up other localStorage changes (like guest_reg_*)
      setAllReservations(prev => [...prev]);
    };
    
    window.addEventListener('refresh-data', handleRefresh);
    window.addEventListener('local-storage-synced', handleStorageSync);

    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
      window.removeEventListener('local-storage-synced', handleStorageSync);
    };
  }, []);`;

const newLogic = `  useEffect(() => {
    fetchReservations();
    
    const handleRefresh = () => fetchReservations(true);
    const handleStorageSync = () => {
      try {
        setSentSurveys(JSON.parse(localStorage.getItem('sent_surveys') || '{}'));
      } catch (e) {}
      // Force a re-render to pick up other localStorage changes (like guest_reg_*)
      setAllReservations(prev => [...prev]);
    };
    
    window.addEventListener('refresh-data', handleRefresh);
    window.addEventListener('local-storage-synced', handleStorageSync);

    // Watchdog: automatically sync reservations every 5 minutes
    const watchdog = setInterval(() => {
      fetchReservations(true);
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
      window.removeEventListener('local-storage-synced', handleStorageSync);
      clearInterval(watchdog);
    };
  }, []);`;

code = code.replace(originalLogic, newLogic);
fs.writeFileSync('src/components/Home.tsx', code);
console.log('done');
