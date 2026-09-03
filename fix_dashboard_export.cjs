const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacement = `  const handleExportXLSX = () => {
    let exportData: any[] = [];
    let fileName = 'Export.xlsx';

    const mapGuestForExport = (g: any) => ({
      'Booking ID': g.bookingId || '',
      'Master/Alias': g.aliasRole || 'Master',
      'Guest ID': g.id || '',
      'Full Name': g.fullName || '',
      'Passport Number': g.passportNumber || '',
      'Nationality': g.nationality || '',
      'DOB': g.dob || '',
      'Age': g.calculatedAge || '',
      'Complex Name': g.complexName || '',
      'Unit Name': g.unitName || '',
      'Check-In Date': g.checkInDate || '',
      'Check-Out Date': g.checkOutDate || '',
      'Duration of Stay': g.durationOfStay || '',
      'Guests Count': g.guestsCount || '',
      'Contact Number': g.contactNumber || '',
      'Contact Email': g.contactEmail || '',
      'Purpose/Celebration': g.purpose || '',
      'Upsell Opportunities': g.upsell || '',
      'Status': g.status || 'Checked In',
      'Submitted At': g.timestamp ? new Date(g.timestamp).toLocaleString() : ''
    });

    if (activeTab === 'list' || activeTab === 'overview') {
      fileName = activeTab === 'list' ? \`Guest_List_\${new Date().toISOString().split('T')[0]}.xlsx\` : \`Guest_Overview_\${new Date().toISOString().split('T')[0]}.xlsx\`;
      const dataToExport = activeTab === 'list' && filteredGuests.length > 0 ? filteredGuests : enrichedGuests;
      exportData = dataToExport.map(mapGuestForExport);
    } else if (activeTab === 'pre-checkin') {
      fileName = \`Pre_CheckIn_Reports_\${new Date().toISOString().split('T')[0]}.xlsx\`;
      exportData = filteredPreReports.map(r => ({
        'Booking ID': r.bookingId || '',
        'Guest Name': r.guestName || '',
        'Complex Name': r.complexName || '',
        'Unit Name': r.unitName || '',
        'Submitted At': r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
        'Submitted By': r.submittedBy || 'Concierge',
        'Maintenance Defect': r.maintenanceNeeded ? 'YES' : 'NO',
        'Maintenance Notes': r.maintenanceNotes || '',
        'Inspector Signature': r.signature || ''
      }));
    } else if (activeTab === 'post-checkout') {
      fileName = \`Post_CheckOut_Reports_\${new Date().toISOString().split('T')[0]}.xlsx\`;
      exportData = filteredPostReports.map(r => ({
        'Booking ID': r.bookingId || '',
        'Guest Name': r.guestName || '',
        'Complex Name': r.complexName || '',
        'Unit Name': r.unitName || '',
        'Submitted At': r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
        'Submitted By': r.submittedBy || 'Concierge',
        'Minibar Total (IDR)': r.totalMinibar || 0,
        'Maintenance Defect': r.maintenanceNeeded ? 'YES' : 'NO',
        'Maintenance Notes': r.maintenanceNotes || '',
        'Inspector Signature': r.signature || ''
      }));
    }

    if (exportData.length === 0) {`;

const startIdx = content.indexOf('  const handleExportXLSX = () => {');
const endIdx = content.indexOf('    if (exportData.length === 0) {', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx + 34);
    fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
    console.log('Successfully updated export logic');
} else {
    console.log('Could not find the target code block.');
}
