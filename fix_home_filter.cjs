const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

if (!code.includes('selectedVillaFilter')) {
  // Add state
  code = code.replace(
    'const [allReservations, setAllReservations] = useState<any[]>([]);',
    `const [allReservations, setAllReservations] = useState<any[]>([]);\n  const [selectedVillaFilter, setSelectedVillaFilter] = useState<string>('All');`
  );

  // Add filter logic before return
  const filterLogic = `
  const uniqueVillas = Array.from(new Set([
    ...arrivals.map((r: any) => r.villa || r.complexName),
    ...departures.map((r: any) => r.villa || r.complexName)
  ])).filter(Boolean).sort() as string[];

  const filteredArrivals = selectedVillaFilter === 'All' 
    ? arrivals 
    : arrivals.filter((r: any) => (r.villa || r.complexName) === selectedVillaFilter);

  const filteredDepartures = selectedVillaFilter === 'All' 
    ? departures 
    : departures.filter((r: any) => (r.villa || r.complexName) === selectedVillaFilter);

  return (`

  code = code.replace('  return (', filterLogic);

  // Update arrivals mapping
  code = code.replace(
    /\{arrivals\.length === 0 \?/g,
    '{filteredArrivals.length === 0 ?'
  );
  code = code.replace(
    /\[\.\.\.arrivals\]/g,
    '[...filteredArrivals]'
  );

  // Update departures mapping
  code = code.replace(
    /\{departures\.length === 0 \?/g,
    '{filteredDepartures.length === 0 ?'
  );
  code = code.replace(
    /\[\.\.\.departures\]/g,
    '[...filteredDepartures]'
  );

  // Add the dropdown to Upper Bar
  const upperBarDropdown = `
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          
          {uniqueVillas.length > 0 && (
            <select
              value={selectedVillaFilter}
              onChange={(e) => setSelectedVillaFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors cursor-pointer"
            >
              <option value="All">All Villas</option>
              {uniqueVillas.map(villa => (
                <option key={villa} value={villa}>{villa}</option>
              ))}
            </select>
          )}

          <button
`;

  code = code.replace(
    /<div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">\s*<button\s*onClick=\{\(\) => fetchReservations\(true\)\}/g,
    upperBarDropdown.replace('<button', '<button onClick={() => fetchReservations(true)}')
  );
  
  // also need to handle the case if it doesn't match perfectly
  if (!code.includes('selectedVillaFilter}')) {
      code = code.replace(
        '<div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">',
        upperBarDropdown.replace('<button', '<button').replace('onClick={() => fetchReservations(true)}', '')
      );
  }
}

fs.writeFileSync('src/components/Home.tsx', code);
console.log('done');
