const fs = require('fs');
let content = fs.readFileSync('src/components/Home.tsx', 'utf8');

const processOld = `  const processReservations = (reservationsList: any[], syncTime?: string | null, forceAll = showAllBookings) => {
    if (syncTime) setLastSyncTime(syncTime);
    setAllReservations(reservationsList);

    const localDate = new Date();
    
    const yesterday = new Date(localDate);
    yesterday.setDate(localDate.getDate() - 1);
    const yYear = yesterday.getFullYear();
    const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = \`\${yYear}-\${yMonth}-\${yDay}\`;

    const next2Days = new Date(localDate);
    next2Days.setDate(localDate.getDate() + 2);
    const n2Year = next2Days.getFullYear();
    const n2Month = String(next2Days.getMonth() + 1).padStart(2, '0');
    const n2Day = String(next2Days.getDate()).padStart(2, '0');
    const next2DaysStr = \`\${n2Year}-\${n2Month}-\${n2Day}\`;

    let arr = reservationsList.filter((r: any) => {
      const ci = r.checkInDate || r.checkIn || '';
      return ci >= yesterdayStr && ci <= next2DaysStr;
    });

    let dep = reservationsList.filter((r: any) => {
      const co = r.checkOutDate || r.checkOut || '';
      return co >= yesterdayStr && co <= next2DaysStr;
    });

    // If 3-day window is empty or forceAll is true, display all reservations so screen is never blank!
    if ((arr.length === 0 && dep.length === 0 && reservationsList.length > 0) || forceAll) {
      arr = reservationsList;
      dep = reservationsList;
    }

    setArrivals(arr);
    setDepartures(dep);
  };`;

const processNew = `  const processReservations = (reservationsList: any[], syncTime?: string | null, forceAll = showAllBookings) => {
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

    if (forceAll) {
      arr = reservationsList;
      dep = reservationsList;
    }

    setArrivals(arr);
    setDepartures(dep);
  };`;

content = content.replace(processOld, processNew);
content = content.replace("{showAllBookings ? 'Mode: All Bookings' : 'Mode: 3-Day Window'}", "{showAllBookings ? 'Mode: All Bookings' : 'Mode: Today & Tomorrow'}");

fs.writeFileSync('src/components/Home.tsx', content, 'utf8');
