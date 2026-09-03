const fs = require('fs');
let content = fs.readFileSync('src/components/Home.tsx', 'utf8');

// Remove showAllBookings state
content = content.replace(
  /  const \[showAllBookings, setShowAllBookings\] = useState\(false\);\n/g,
  ''
);

// Replace processReservations logic completely using regex
content = content.replace(
  /  const processReservations = \([\s\S]*?setDepartures\(dep\);\n  };/,
  `  const processReservations = (reservationsList: any[], syncTime?: string | null) => {
    if (syncTime) setLastSyncTime(syncTime);
    setAllReservations(reservationsList);

    const localDate = new Date();
    
    const tYear = localDate.getFullYear();
    const tMonth = String(localDate.getMonth() + 1).padStart(2, '0');
    const tDay = String(localDate.getDate()).padStart(2, '0');
    const todayStr = \`\${tYear}-\${tMonth}-\${tDay}\`;

    const tomorrow = new Date(localDate);
    tomorrow.setDate(localDate.getDate() + 1);
    const tmYear = tomorrow.getFullYear();
    const tmMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tmDay = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = \`\${tmYear}-\${tmMonth}-\${tmDay}\`;

    let arr = reservationsList.filter((r: any) => {
      const ci = r.checkInDate || r.checkIn || '';
      return ci === todayStr || ci === tomorrowStr;
    });

    let dep = reservationsList.filter((r: any) => {
      const co = r.checkOutDate || r.checkOut || '';
      return co === todayStr || co === tomorrowStr;
    });

    setArrivals(arr);
    setDepartures(dep);
  };`
);

// Remove the toggle button
content = content.replace(
  /<button\s+onClick=\{\(\) => \{\s+const newMode = !showAllBookings;[\s\S]*?<\/button>/,
  ''
);

fs.writeFileSync('src/components/Home.tsx', content, 'utf8');
