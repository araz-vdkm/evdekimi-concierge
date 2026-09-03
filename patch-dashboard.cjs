const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const canDeleteLine = `  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'supervisor' || currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';\n`;

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
      setGuests(prev => prev.filter(g => {
        const gid = g.id || g.passportNumber || \`\${g.fullName}_\${g.unitName}_\${g.checkInDate}\`;
        return gid !== id;
      }));
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
        setPreCheckInReports(prev => prev.filter(r => r.bookingId !== report.bookingId && r.id !== id));
      } else {
        setPostCheckOutReports(prev => prev.filter(r => r.bookingId !== report.bookingId && r.id !== id));
      }
    } catch (e) {
      alert("Failed to delete report.");
    }
  };
`;

if (!code.includes('handleDeleteGuest')) {
  code = code.replace(/const enrichedGuests = useMemo/, deleteGuestCode + deleteReportCode + "\n  const enrichedGuests = useMemo");
}

fs.writeFileSync('src/components/Dashboard.tsx', code);
