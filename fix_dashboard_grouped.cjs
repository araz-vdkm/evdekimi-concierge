const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Add import
content = content.replace(/Building \} from 'lucide-react'/, 'Building, CornerDownRight } from \'lucide-react\'');

// 2. Add state
content = content.replace(
  /const \[selectedReportModal, setSelectedReportModal\] = useState<any \| null>\(null\);/,
  "const [selectedReportModal, setSelectedReportModal] = useState<any | null>(null);\n  const [selectedGuestModal, setSelectedGuestModal] = useState<any | null>(null);"
);

// 3. Add groupedGuests logic
const groupedGuestsLogic = `
  const groupedGuests = useMemo(() => {
    const groups = new Map();
    
    enrichedGuests.forEach(g => {
      const key = g.bookingId || \`\${g.unitName}_\${g.checkInDate}\`;
      if (!groups.has(key)) groups.set(key, { master: null, aliases: [] });
      
      const group = groups.get(key);
      if (g.isMaster) {
        group.master = g;
      } else {
        group.aliases.push(g);
      }
    });

    // Ensure every group has a master
    groups.forEach(group => {
      if (!group.master && group.aliases.length > 0) {
         group.master = group.aliases.shift();
      }
    });

    return Array.from(groups.values()).filter(group => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      
      const masterMatches = group.master && (
        group.master.fullName?.toLowerCase().includes(term) ||
        group.master.passportNumber?.toLowerCase().includes(term) ||
        group.master.complexName?.toLowerCase().includes(term) ||
        group.master.unitName?.toLowerCase().includes(term)
      );
      
      const aliasMatches = group.aliases.some((a) => (
        a.fullName?.toLowerCase().includes(term) ||
        a.passportNumber?.toLowerCase().includes(term) ||
        a.complexName?.toLowerCase().includes(term) ||
        a.unitName?.toLowerCase().includes(term)
      ));
      
      return masterMatches || aliasMatches;
    });
  }, [enrichedGuests, searchTerm]);
`;

content = content.replace(
  /const filteredGuests = enrichedGuests\.filter\(g =>[\s\S]*?g\.unitName\?\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)\n  \);/,
  `const filteredGuests = enrichedGuests.filter(g => 
    g.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.complexName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.unitName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  ${groupedGuestsLogic}`
);

// 4. Replace rendering logic
const oldRender = `{filteredGuests.map(guest => (
                    <tr key={guest.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        {guest.photo ? (
                          <img src={\`data:image/jpeg;base64,\${guest.photo}\`} alt="Guest" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-sm font-bold">
                            {guest.fullName?.charAt(0) || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-base mb-0.5">{guest.fullName || 'Unknown Guest'}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            {(guest as any).aliasRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {guest.nationality || 'N/A'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{guest.passportNumber}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">DOB: {guest.dob} (Age: {(guest as any).calculatedAge})</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 mb-0.5">{guest.unitName || '—'}</div>
                        <div className="text-xs text-slate-500">{guest.complexName}</div>
                        {guest.guestsCount && <div className="text-xs text-slate-400 mt-1">{guest.guestsCount} guest(s) total</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium text-xs">{guest.checkInDate || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-xs">{guest.checkOutDate || '—'}</span>
                        </div>
                        <div className="text-xs text-slate-400">{(guest as any).durationOfStay}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 mb-1">{guest.contactNumber || '—'}</div>
                        <div className="text-xs text-slate-500">{guest.contactEmail || '—'}</div>
                      </td>
                    </tr>
                  ))}`;

const newRender = `{groupedGuests.map((group, idx) => {
                    const master = group.master;
                    if (!master) return null;
                    return (
                      <React.Fragment key={master.id || idx}>
                        <tr onClick={() => setSelectedGuestModal(master)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                          <td className="px-6 py-4">
                            {master.photo ? (
                              <img src={\`data:image/jpeg;base64,\${master.photo}\`} alt="Guest" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-sm font-bold">
                                {master.fullName?.charAt(0) || '?'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 text-base mb-0.5">{master.fullName || 'Unknown Guest'}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold">
                                Master
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono">{master.passportNumber}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">DOB: {master.dob} (Age: {master.calculatedAge})</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800 mb-0.5">{master.unitName || '—'}</div>
                            <div className="text-xs text-slate-500">{master.complexName}</div>
                            {master.guestsCount && <div className="text-xs text-slate-400 mt-1">{master.guestsCount} guest(s) total</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-medium text-xs">{master.checkInDate || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Clock className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-xs">{master.checkOutDate || '—'}</span>
                            </div>
                            <div className="text-xs text-slate-400">{master.durationOfStay}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-800 mb-1">{master.contactNumber || '—'}</div>
                            <div className="text-xs text-slate-500">{master.contactEmail || '—'}</div>
                          </td>
                        </tr>
                        {group.aliases.map((alias: any) => (
                          <tr key={alias.id} onClick={() => setSelectedGuestModal(alias)} className="hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50/50 group">
                            <td className="px-6 py-3 pl-10 flex items-center gap-3">
                              <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />
                              {alias.photo ? (
                                <img src={\`data:image/jpeg;base64,\${alias.photo}\`} alt="Alias" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-sm font-bold">
                                  {alias.fullName?.charAt(0) || '?'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <div className="font-bold text-slate-700 text-sm mb-0.5">{alias.fullName || 'Unknown Guest'}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                <span className="flex items-center gap-1 text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                                  Alias
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alias.nationality || 'N/A'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono">{alias.passportNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm">
                              {/* Inherited unit */}
                              <span className="italic text-xs text-slate-400">Accompanied</span>
                            </td>
                            <td className="px-6 py-3">
                               <div className="text-xs text-slate-400 mt-1">DOB: {alias.dob} (Age: {alias.calculatedAge})</div>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm">
                              <div className="text-sm font-medium text-slate-700 mb-1">{alias.contactNumber || '—'}</div>
                              <div className="text-xs text-slate-500">{alias.contactEmail || '—'}</div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}`;

// If the exact match fails we can just split and join.
if (content.includes(oldRender)) {
   content = content.replace(oldRender, newRender);
} else {
   console.log("Could not find oldRender block to replace");
}

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
console.log("Fixed dashboard render");
