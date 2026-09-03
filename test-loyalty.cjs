const loyaltyLogic = `
function calculateLoyaltyStatus(passportNumber, currentGuests) {
  if (!passportNumber) return 'None';
  
  const previousStays = currentGuests.filter(g => g.passportNumber === passportNumber && g.status === 'Checked Out');
  
  if (previousStays.length === 0) return 'None';
  
  const totalBookings = previousStays.length;
  let totalNights = 0;
  
  previousStays.forEach(stay => {
    if (stay.checkInDate && stay.checkOutDate) {
      const inDate = new Date(stay.checkInDate);
      const outDate = new Date(stay.checkOutDate);
      if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
        const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalNights += diffDays;
      }
    }
  });

  if (totalBookings > 5 || totalNights > 10) return 'Gold';
  if (totalBookings > 3 || totalNights > 7) return 'Silver';
  if (totalBookings > 1) return 'Bronze';
  
  return 'None';
}
`;
console.log("Ready");
