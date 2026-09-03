import re

with open("src/components/MinibarDashboard.tsx", "r") as f:
    content = f.read()

target = """  const handleExportCSV = () => {
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

replacement = """  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Guest Name,Check-in Date,Check-out Date,Age,Nationality,Qty of Alias,Ages of Alias,Complex,Unit,Initial Stock Value (Rp),Consumed Value (Rp),Manual Charges (Rp),Total Earned Revenue (Rp),Consumed Items\\n";
    
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
      
      const consumedItems: string[] = [];
      if (report.postCheckOut?.minibarConsumed) {
        report.postCheckOut.minibarConsumed.forEach((i:any) => {
          if (i.qtyConsumed > 0) {
            consumedItems.push(`${i.qtyConsumed}x ${i.name}`);
          }
        });
      }
      (report.manualLogs || []).forEach((log:any) => {
        (log.items || []).forEach((i:any) => {
          if (i.quantity > 0) {
            consumedItems.push(`${i.quantity}x ${i.name} (Manual)`);
          }
        });
      });
      const consumedItemsStr = consumedItems.join(', ').replace(/"/g, '""');
      
      csvContent += `${report.bookingId},"${guestName}","${checkInDate}","${checkOutDate}",${age},"${nationality}",${qtyOfAlias},"${agesOfAlias}","${complex}","${unit}",${preVal},${postVal},${manualTotal},${earnedValue},"${consumedItemsStr}"\\n`;
    });"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/MinibarDashboard.tsx", "w") as f:
        f.write(content)
    print("Patch applied successfully")
else:
    print("Target string not found!")

