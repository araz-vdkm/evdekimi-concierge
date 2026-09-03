import re

with open("src/components/MinibarDashboard.tsx", "r") as f:
    content = f.read()

# Update fetchTrackingReports to fetch guests
fetch_target = """      const manualSnap = await getDocs(collection(db, 'minibar'));
      
      const bookingsMap: Record<string, any> = {};"""

fetch_replacement = """      const manualSnap = await getDocs(collection(db, 'minibar'));
      const guestsSnap = await getDocs(collection(db, 'guests'));
      
      const bookingsMap: Record<string, any> = {};
      
      guestsSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.bookingId) return;
        if (!bookingsMap[d.bookingId]) bookingsMap[d.bookingId] = { bookingId: d.bookingId, unitName: d.unitName, complexName: d.complexName, guestName: d.fullName, checkInDate: d.checkInDate, checkOutDate: d.checkOutDate };
        if (!bookingsMap[d.bookingId].guests) bookingsMap[d.bookingId].guests = [];
        bookingsMap[d.bookingId].guests.push({ id: doc.id, ...d });
      });"""

content = content.replace(fetch_target, fetch_replacement)

# Create age helper and new export function
export_target = """  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Guest Name,Complex,Unit,Initial Stock Value (Rp),Consumed Value (Rp),Manual Charges (Rp),Total Earned Revenue (Rp)\\n";
    
    reports.forEach(report => {
      const preVal = report.preCheckIn?.totalMinibar || 0;
      const postVal = report.postCheckOut?.totalMinibar || 0;
      const manualTotal = (report.manualLogs || []).reduce((acc: number, log: any) => acc + (log.totalRevenue || 0), 0);
      const earnedValue = postVal + manualTotal;
      
      const guestName = (report.guestName || 'Unknown').replace(/"/g, '""');
      const complex = (report.complexName || '').replace(/"/g, '""');
      const unit = (report.unitName || '').replace(/"/g, '""');
      
      csvContent += `${report.bookingId},"${guestName}","${complex}","${unit}",${preVal},${postVal},${manualTotal},${earnedValue}\\n`;
    });"""

export_replacement = """  const calculateAge = (dobString: string) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 'N/A';
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Guest Name,Check-in Date,Check-out Date,Age,Nationality,Qty of Alias,Ages of Alias,Complex,Unit,Initial Stock Value (Rp),Consumed Value (Rp),Manual Charges (Rp),Total Earned Revenue (Rp)\\n";
    
    reports.forEach(report => {
      const preVal = report.preCheckIn?.totalMinibar || 0;
      const postVal = report.postCheckOut?.totalMinibar || 0;
      const manualTotal = (report.manualLogs || []).reduce((acc: number, log: any) => acc + (log.totalRevenue || 0), 0);
      const earnedValue = postVal + manualTotal;
      
      const guests = report.guests || [];
      const primaryGuest = guests.find((g:any) => g.status === 'Primary') || guests[0] || {};
      const aliasGuests = guests.filter((g:any) => g.id !== primaryGuest.id && g.status !== 'Primary');
      
      const guestName = (report.guestName || primaryGuest.fullName || 'Unknown').replace(/"/g, '""');
      const checkInDate = report.checkInDate || primaryGuest.checkInDate || '';
      const checkOutDate = report.checkOutDate || primaryGuest.checkOutDate || '';
      const age = primaryGuest.dob ? calculateAge(primaryGuest.dob) : 'N/A';
      const nationality = (primaryGuest.nationality || '').replace(/"/g, '""');
      const qtyOfAlias = guests.length > 0 ? guests.length - 1 : 0;
      const agesOfAlias = aliasGuests.map((g:any) => g.dob ? calculateAge(g.dob) : 'N/A').join('; ');

      const complex = (report.complexName || '').replace(/"/g, '""');
      const unit = (report.unitName || '').replace(/"/g, '""');
      
      csvContent += `${report.bookingId},"${guestName}","${checkInDate}","${checkOutDate}",${age},"${nationality}",${qtyOfAlias},"${agesOfAlias}","${complex}","${unit}",${preVal},${postVal},${manualTotal},${earnedValue}\\n`;
    });"""

content = content.replace(export_target, export_replacement)

with open("src/components/MinibarDashboard.tsx", "w") as f:
    f.write(content)

print("Patched successfully")
