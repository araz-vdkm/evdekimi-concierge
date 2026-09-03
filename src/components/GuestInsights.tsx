import React, { useState, useMemo } from 'react';
import { Guest } from '../types';
import { normalizeCountryName } from '../lib/utils';

interface GuestInsightsProps {
  guests: Guest[];
}

function parseAge(dobStr: string): number | null {
  if (!dobStr) return null;
  const parts = dobStr.split(/[\.\/\-]/);
  let date = new Date(dobStr);
  if (parts.length === 3) {
     if (parts[2].length === 4) { 
         date = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
     } else if (parts[0].length === 4) { 
         date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
     }
  }
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
  }
  return age >= 0 ? age : null;
}

function getStayDuration(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  if (isNaN(inD.getTime()) || isNaN(outD.getTime())) return 0;
  const diffTime = Math.abs(outD.getTime() - inD.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMonthKey(dateStr: string) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function GuestInsights({ guests }: GuestInsightsProps) {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  const allMonths = useMemo(() => {
    const m = new Set<string>();
    guests.forEach(g => {
      if (g.checkInDate) {
        const k = getMonthKey(g.checkInDate);
        if (k !== 'Unknown') m.add(k);
      }
    });
    return Array.from(m).sort().reverse();
  }, [guests]);

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const filteredGuests = useMemo(() => {
    if (selectedMonths.length === 0) return guests;
    return guests.filter(g => {
      const k = getMonthKey(g.checkInDate);
      return selectedMonths.includes(k);
    });
  }, [guests, selectedMonths]);

  const {
    totalGuests,
    bookings,
    kpis,
    ageStats,
    typeStats,
    countryStats,
    stayStats,
    villaStats
  } = useMemo(() => {
    const totalGuests = filteredGuests.length;
    
    let liveGuestsCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group by booking ID
    const bookingMap = new Map<string, Guest[]>();
    filteredGuests.forEach(g => {
      if (g.checkOutDate) {
        let outDate = new Date(g.checkOutDate);
        if (g.checkOutDate.includes('.') || g.checkOutDate.includes('/')) {
            const parts = g.checkOutDate.split(/[\.\/\-]/);
            if (parts.length === 3) {
                if (parts[2].length === 4) outDate = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
                else if (parts[0].length === 4) outDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            }
        }
        if (!isNaN(outDate.getTime()) && outDate >= today) {
            liveGuestsCount++;
        }
      }

      const bId = g.bookingId || `${g.complexName}-${g.unitName}-${g.checkInDate}-${g.checkOutDate}`;
      const arr = bookingMap.get(bId) || [];
      arr.push(g);
      bookingMap.set(bId, arr);
    });
    
    const bookings = Array.from(bookingMap.values());
    const totalBookings = bookings.length;
    
    let totalNights = 0;
    let sumAge = 0;
    let countAge = 0;
    let bookingsWithChildren = 0;
    let successfulPassports = 0;
    
    const countries = new Map<string, number>();
    
    // Age brackets
    const ageBrackets = {
      '0-2': 0, '2-7': 0, '7-12': 0, '12-17': 0,
      '18-37': 0, '38-55': 0, '56-65': 0, '66+': 0
    };
    
    // Booking Types
    const typeCount = { Solo: 0, Couple: 0, Family: 0 };
    const typeGuestCount = { Solo: 0, Couple: 0, Family: 0 };
    
    // Stay Duration Brackets
    const stayBrackets = {
      '1 night': { b: 0, g: 0, typeCount: { Solo: 0, Couple: 0, Family: 0 } },
      '2-5 nights': { b: 0, g: 0, typeCount: { Solo: 0, Couple: 0, Family: 0 } },
      '6+ night': { b: 0, g: 0, typeCount: { Solo: 0, Couple: 0, Family: 0 } }
    };
    
    // Villa Stats
    const villaMap = new Map<string, {
        units: Map<string, { Solo: 0, Couple: 0, Family: 0 }>,
        g: 0, b: 0, typeCount: { Solo: 0, Couple: 0, Family: 0 },
        countries: Map<string, number>,
        stayNights: number
    }>();

    bookings.forEach(bGuests => {
      const g0 = bGuests[0];
      const nights = getStayDuration(g0.checkInDate, g0.checkOutDate);
      totalNights += nights;
      
      let hasChild = false;
      bGuests.forEach(g => {
        const age = parseAge(g.dob);
        if (age !== null) {
          sumAge += age;
          countAge++;
          if (age < 18) hasChild = true;
          
          if (age <= 2) ageBrackets['0-2']++;
          else if (age <= 7) ageBrackets['2-7']++;
          else if (age <= 12) ageBrackets['7-12']++;
          else if (age <= 17) ageBrackets['12-17']++;
          else if (age <= 37) ageBrackets['18-37']++;
          else if (age <= 55) ageBrackets['38-55']++;
          else if (age <= 65) ageBrackets['56-65']++;
          else ageBrackets['66+']++;
        }
        
        if (g.passportNumber?.trim().length > 3) {
          successfulPassports++;
        }
        
        const nat = normalizeCountryName(g.nationality);
        countries.set(nat, (countries.get(nat) || 0) + 1);
      });
      
      if (hasChild) bookingsWithChildren++;
      
      let bType = 'Solo';
      if (bGuests.length === 1) bType = 'Solo';
      else if (bGuests.length === 2) bType = 'Couple';
      else bType = 'Family';
      
      typeCount[bType as keyof typeof typeCount]++;
      typeGuestCount[bType as keyof typeof typeGuestCount] += bGuests.length;
      
      let sBracket = '1 night';
      if (nights >= 6) sBracket = '6+ night';
      else if (nights >= 2) sBracket = '2-5 nights';
      
      stayBrackets[sBracket as keyof typeof stayBrackets].b++;
      stayBrackets[sBracket as keyof typeof stayBrackets].g += bGuests.length;
      stayBrackets[sBracket as keyof typeof stayBrackets].typeCount[bType as 'Solo']++;
      
      const villa = g0.complexName?.trim() || 'Unknown';
      const unit = g0.unitName?.trim() || 'Unknown';
      
      if (!villaMap.has(villa)) {
         villaMap.set(villa, { 
             units: new Map(), g: 0, b: 0, 
             typeCount: { Solo: 0, Couple: 0, Family: 0 },
             countries: new Map(), stayNights: 0
         });
      }
      const vData = villaMap.get(villa)!;
      vData.b++;
      vData.g += bGuests.length;
      vData.typeCount[bType as 'Solo']++;
      vData.stayNights += nights;
      bGuests.forEach(g => {
          const nat = normalizeCountryName(g.nationality);
          vData.countries.set(nat, (vData.countries.get(nat) || 0) + 1);
      });
      
      if (!vData.units.has(unit)) {
          vData.units.set(unit, { Solo: 0, Couple: 0, Family: 0 });
      }
      vData.units.get(unit)![bType as 'Solo']++;
    });

    let topCountry = 'N/A';
    let maxC = 0;
    Array.from(countries.entries()).forEach(([c, val]) => {
      if (val > maxC && c !== 'Unknown') {
        maxC = val;
        topCountry = c;
      }
    });

    const kpis = {
      guests: totalGuests,
      liveGuests: liveGuestsCount,
      bookings: totalBookings,
      guestsPerBooking: totalBookings ? (totalGuests / totalBookings).toFixed(1) : '0',
      nightsPerBooking: totalBookings ? (totalNights / totalBookings).toFixed(1) : '0',
      avgAge: countAge ? Math.round(sumAge / countAge) : 0,
      childrenPct: totalBookings ? Math.round((bookingsWithChildren / totalBookings) * 100) : 0,
      uniqueCountries: countries.size - (countries.has('Unknown') ? 1 : 0),
      passportPct: totalGuests ? Math.round((successfulPassports / totalGuests) * 100) : 0,
      topCountry
    };

    const ageStats = Object.entries(ageBrackets).map(([bracket, qty]) => ({
      bracket, qty, share: totalGuests ? Math.round((qty / totalGuests) * 100) : 0
    }));

    const typeStats = ['Solo', 'Couple', 'Family'].map(t => {
      const q = typeGuestCount[t as 'Solo'];
      const bQ = typeCount[t as 'Solo'];
      return {
        type: t,
        qty: q,
        gShare: totalGuests ? Math.round((q / totalGuests) * 100) : 0,
        bShare: totalBookings ? Math.round((bQ / totalBookings) * 100) : 0
      };
    });
    
    const countryStats = Array.from(countries.entries())
      .filter(([c]) => c !== 'Unknown')
      .sort((a,b) => b[1] - a[1])
      .map(([country, qty]) => ({
        country, qty, share: totalGuests ? Math.round((qty / totalGuests) * 100) : 0
      }));
      
    const stayStats = Object.entries(stayBrackets).map(([duration, data]) => {
        const dBook = data.b;
        return {
            duration,
            qtyB: data.b,
            pctB: totalBookings ? Math.round((data.b / totalBookings) * 100) : 0,
            qtyG: data.g,
            pctG: totalGuests ? Math.round((data.g / totalGuests) * 100) : 0,
            avgSize: data.b ? (data.g / data.b).toFixed(1) : '0',
            soloPct: dBook ? Math.round((data.typeCount.Solo / dBook) * 100) : 0,
            couplePct: dBook ? Math.round((data.typeCount.Couple / dBook) * 100) : 0,
            familyPct: dBook ? Math.round((data.typeCount.Family / dBook) * 100) : 0
        };
    });
    
    const villaStats = Array.from(villaMap.entries()).map(([villa, vData]) => {
        const top3 = Array.from(vData.countries.entries())
            .filter(([c]) => c !== 'Unknown')
            .sort((a,b) => b[1] - a[1])
            .slice(0, 3)
            .map(x => x[0])
            .join(', ');
            
        return {
            villa,
            units: Array.from(vData.units.entries()).map(([u, c]) => {
               const tot = c.Solo + c.Couple + c.Family;
               return {
                   unit: u,
                   soloPct: tot ? Math.round((c.Solo / tot) * 100) : 0,
                   couplePct: tot ? Math.round((c.Couple / tot) * 100) : 0,
                   familyPct: tot ? Math.round((c.Family / tot) * 100) : 0
               }
            }),
            top3,
            g: vData.g,
            b: vData.b,
            avgStay: vData.b ? (vData.stayNights / vData.b).toFixed(1) : '0',
            soloPct: vData.b ? Math.round((vData.typeCount.Solo / vData.b) * 100) : 0,
            couplePct: vData.b ? Math.round((vData.typeCount.Couple / vData.b) * 100) : 0,
            familyPct: vData.b ? Math.round((vData.typeCount.Family / vData.b) * 100) : 0
        };
    });

    return { totalGuests, bookings, kpis, ageStats, typeStats, countryStats, stayStats, villaStats };
  }, [filteredGuests]);

  // A single cell inside the shared KPI strip below (no border/shadow of its own —
  // the strip's own card + divide-x/divide-y draw the separators between cells).
  const KpiCard = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="font-bold text-lg text-slate-800">Date Range</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedMonths([])}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedMonths.length === 0 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Period
          </button>
          {allMonths.map(m => (
            <button 
                key={m}
                onClick={() => toggleMonth(m)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedMonths.includes(m) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs: one combined strip (card + dividers), not ten separate boxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <KpiCard label="Total Guests" value={kpis.guests} />
        <KpiCard label="Live Guests" value={kpis.liveGuests} />
        <KpiCard label="Total Bookings" value={kpis.bookings} />
        <KpiCard label="Guests / Booking" value={kpis.guestsPerBooking} />
        <KpiCard label="Avg Nights / Booking" value={kpis.nightsPerBooking} />
        <KpiCard label="Avg Age" value={`${kpis.avgAge} yrs`} />
        <KpiCard label="Bookings w/ Children" value={`${kpis.childrenPct}%`} />
        <KpiCard label="Unique Countries" value={kpis.uniqueCountries} />
        <KpiCard label="Passport Scans" value={`${kpis.passportPct}%`} />
        <KpiCard label="Top Country" value={<span className="text-lg">{kpis.topCountry}</span>} />
      </div>

      {/* Age Stats & Type Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">Age Distribution</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr><th className="px-4 py-2">Age Bracket</th><th className="px-4 py-2">Qty of Guests</th><th className="px-4 py-2">Share %</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ageStats.map(s => (
                  <tr key={s.bracket} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{s.bracket}</td>
                    <td className="px-4 py-2">{s.qty}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{s.share}%</span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${s.share}%`}}></div></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">Booking Types</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Qty Guests</th><th className="px-4 py-2">Share Guests %</th><th className="px-4 py-2">Share Bookings %</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {typeStats.map(s => (
                  <tr key={s.type} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{s.type}</td>
                    <td className="px-4 py-2">{s.qty}</td>
                    <td className="px-4 py-2">{s.gShare}%</td>
                    <td className="px-4 py-2">{s.bShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stay Duration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">Stay Duration Insights</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Stay Duration</th>
                <th className="px-4 py-2">Qty Bookings</th>
                <th className="px-4 py-2">% Bookings</th>
                <th className="px-4 py-2">Qty Guests</th>
                <th className="px-4 py-2">% Guests</th>
                <th className="px-4 py-2">Avg Size</th>
                <th className="px-4 py-2">Solo %</th>
                <th className="px-4 py-2">Couple %</th>
                <th className="px-4 py-2">Family %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stayStats.map(s => (
                <tr key={s.duration} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{s.duration}</td>
                  <td className="px-4 py-2">{s.qtyB}</td>
                  <td className="px-4 py-2">{s.pctB}%</td>
                  <td className="px-4 py-2">{s.qtyG}</td>
                  <td className="px-4 py-2">{s.pctG}%</td>
                  <td className="px-4 py-2">{s.avgSize}</td>
                  <td className="px-4 py-2">{s.soloPct}%</td>
                  <td className="px-4 py-2">{s.couplePct}%</td>
                  <td className="px-4 py-2">{s.familyPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Countries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">Top Countries</div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 shadow-sm">
              <tr><th className="px-4 py-2">Country</th><th className="px-4 py-2">Qty of Guests</th><th className="px-4 py-2">Share %</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {countryStats.map(s => (
                <tr key={s.country} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{s.country}</td>
                  <td className="px-4 py-2">{s.qty}</td>
                  <td className="px-4 py-2">{s.share}%</td>
                </tr>
              ))}
              {countryStats.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No country data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Villa Stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">Villa Insights</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Villa</th>
                <th className="px-4 py-2">Top 3 Countries</th>
                <th className="px-4 py-2">Qty Guests</th>
                <th className="px-4 py-2">Qty Bookings</th>
                <th className="px-4 py-2">Avg Stay</th>
                <th className="px-4 py-2">Solo %</th>
                <th className="px-4 py-2">Couple %</th>
                <th className="px-4 py-2">Family %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {villaStats.map(v => (
                <React.Fragment key={v.villa}>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">{v.villa}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={v.top3}>{v.top3 || '-'}</td>
                    <td className="px-4 py-3 font-medium">{v.g}</td>
                    <td className="px-4 py-3 font-medium">{v.b}</td>
                    <td className="px-4 py-3 font-medium">{v.avgStay}</td>
                    <td className="px-4 py-3 font-medium">{v.soloPct}%</td>
                    <td className="px-4 py-3 font-medium">{v.couplePct}%</td>
                    <td className="px-4 py-3 font-medium">{v.familyPct}%</td>
                  </tr>
                  {/* Units for this villa */}
                  {v.units.map(u => (
                    <tr key={`${v.villa}-${u.unit}`} className="hover:bg-slate-50 text-slate-500 text-xs">
                      <td className="px-4 py-1.5 pl-8 font-medium">↳ {u.unit}</td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5">{u.soloPct}%</td>
                      <td className="px-4 py-1.5">{u.couplePct}%</td>
                      <td className="px-4 py-1.5">{u.familyPct}%</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
