const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const loadLocalReports = `  const loadLocalReports = (currentGuests: Guest[], reservations: any[] = []) => {
    const preReports: any[] = [];
    const postReports: any[] = [];
    
    // Process local storage sequentially and safely
    const len = localStorage.length;
    for (let i = 0; i < len; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('pre_checkin_')) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const report = JSON.parse(val);
            if (!report.timestamp) report.timestamp = new Date(0).toISOString();
            preReports.push(report);
          } else if (val === 'true') {
            const bookingId = key.replace('pre_checkin_', '');
            const guest = currentGuests.find(g => g.id === bookingId);
            const res = reservations.find(r => (r.confirmationCode || r.id) === bookingId) || reservations.find(r => \`arr-\${reservations.indexOf(r)}\` === bookingId);
            preReports.push({
              type: 'pre_checkin',
              timestamp: new Date(0).toISOString(),
              bookingId,
              guestName: guest?.fullName || res?.guestName || res?.guest?.name || 'Unknown',
              unitName: guest?.unitName || res?.unitName || 'Unknown',
              complexName: guest?.complexName || res?.villa || 'Unknown',
              isLegacy: true
            });
          }
        } catch (e) {
          console.warn("Failed parsing pre_checkin report from local storage", e);
        }
      } else if (key.startsWith('post_checkout_')) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const report = JSON.parse(val);
            if (!report.timestamp) report.timestamp = new Date(0).toISOString();
            postReports.push(report);
          } else if (val === 'true') {
            const bookingId = key.replace('post_checkout_', '');
            const guest = currentGuests.find(g => g.id === bookingId);
            const res = reservations.find(r => (r.confirmationCode || r.id) === bookingId) || reservations.find(r => \`dep-\${reservations.indexOf(r)}\` === bookingId);
            postReports.push({
              type: 'post_checkout',
              timestamp: new Date(0).toISOString(),
              bookingId,
              guestName: guest?.fullName || res?.guestName || res?.guest?.name || 'Unknown',
              unitName: guest?.unitName || res?.unitName || 'Unknown',
              complexName: guest?.complexName || res?.villa || 'Unknown',
              isLegacy: true
            });
          }
        } catch (e) {
          console.warn("Failed parsing post_checkout report from local storage", e);
        }
      }
    }
    
    // Sort descending by timestamp
    preReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    postReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setPreCheckInReports(preReports);
    setPostCheckOutReports(postReports);
  };`;

// Replace existing loadLocalReports
code = code.replace(/  const loadLocalReports = \([^]*?setPostCheckOutReports[^]*?\};/, loadLocalReports);
fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('done');
