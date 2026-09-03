const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  '  const { totalGuests, checkoutsToday, upsellsCount, topNationality } = useMemo(() => {',
  `  const { totalGuests, checkoutsToday, upsellsCount, topNationality, lastMinuteBookingsPct } = useMemo(() => {`
);

code = code.replace(
  '    let upsells = 0;',
  `    let upsells = 0;
    let lastMinuteCount = 0;`
);

code = code.replace(
  '      if (g.upsell && g.upsell !== \'\') upsells++;',
  `      if (g.upsell && g.upsell !== '') upsells++;
      
      // Calculate last-minute booking % (< 48 hours)
      // We will compare g.timestamp (registration time) to g.checkInDate
      if (g.timestamp && g.checkInDate) {
        const regTime = new Date(g.timestamp).getTime();
        // checkInDate is usually YYYY-MM-DD. We assume it starts at 14:00 (2PM) local time.
        const checkInTime = new Date(g.checkInDate + 'T14:00:00Z').getTime();
        
        if (!isNaN(regTime) && !isNaN(checkInTime)) {
          const hoursDiff = (checkInTime - regTime) / (1000 * 60 * 60);
          if (hoursDiff > 0 && hoursDiff < 48) {
            lastMinuteCount++;
          } else if (hoursDiff <= 0) {
            // If they registered *after* check-in date or exactly on it, it's definitely < 48 hours
            lastMinuteCount++;
          }
        }
      }`
);

code = code.replace(
  '      checkoutsToday: checkouts,',
  `      checkoutsToday: checkouts,
      lastMinuteBookingsPct: guests.length > 0 ? Math.round((lastMinuteCount / guests.length) * 100) : 0,`
);

// Add the KPI to the UI
code = code.replace(
  '<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">',
  `<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-orange-50 p-3 rounded-xl shrink-0">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Last Min. Bookings (&lt;48h)</p>
              <h3 className="text-2xl font-bold text-slate-900">{lastMinuteBookingsPct}%</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">`
);

// Import Clock icon if missing
code = code.replace('Download, Search, X, CheckCircle2, FileText, Wrench, AlertTriangle, Coffee }', 'Download, Search, X, CheckCircle2, FileText, Wrench, AlertTriangle, Coffee, Clock }');

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Dashboard patched!");
