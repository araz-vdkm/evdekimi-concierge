const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const canDeleteLine = `  const canDelete = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';\n`;

if (!code.includes('const canDelete')) {
  code = code.replace(/const \[isLoading, setIsLoading\] = useState\(true\);/, "const [isLoading, setIsLoading] = useState(true);\n" + canDeleteLine);
}

const deleteGuestCode = `
  const handleDeleteGuest = async (guest: Guest) => {
    if (!window.confirm("Are you sure you want to delete this guest registration?")) return;
    try {
      const id = guest.id || guest.passportNumber || \`\${guest.fullName}_\${guest.unitName}_\${guest.checkInDate}\`;
      await deleteRecord('guests', id);
      setSelectedGuestModal(null);
      setGuests(prev => prev.filter(g => g.id !== guest.id && g.passportNumber !== guest.passportNumber));
    } catch (e) {
      alert("Failed to delete guest.");
    }
  };
`;

const deleteReportCode = `
  const handleDeleteReport = async (report: any) => {
    if (!window.confirm(\`Are you sure you want to delete this \${report.type} report?\`)) return;
    try {
      const id = report.bookingId || report.id;
      await deleteRecordWithAliases(report.type, id, report.bookingId);
      setSelectedReportModal(null);
      if (report.type === 'pre_checkin') {
        setPreCheckInReports(prev => prev.filter(r => r.bookingId !== report.bookingId));
      } else {
        setPostCheckOutReports(prev => prev.filter(r => r.bookingId !== report.bookingId));
      }
    } catch (e) {
      alert("Failed to delete report.");
    }
  };
`;

if (!code.includes('handleDeleteGuest')) {
  code = code.replace(/const enrichedGuests = useMemo/, deleteGuestCode + deleteReportCode + "\n  const enrichedGuests = useMemo");
}

code = code.replace(
  /{[\s]*\/\* Modal Footer \*\/[\s]*<div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">/g,
  `{/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {canDelete ? (
                <button
                  onClick={() => handleDeleteGuest(selectedGuestModal)}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : <div></div>}
              <div className="flex gap-2">`
);

// We have two places with `Modal Footer`. We need to fix the guest one explicitly and the report one explicitly.
fs.writeFileSync('src/components/Dashboard.tsx', code);
