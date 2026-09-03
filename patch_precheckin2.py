import re

with open("src/components/PreCheckInFlow.tsx", "r") as f:
    content = f.read()

target = """      const report = {
        type: 'pre_checkin',
        timestamp: new Date().toISOString(),
        submittedBy: currentUser,
        bookingId: bookingId,
        guestName: initialBooking?.fullName || initialBooking?.guestName || 'Unknown',
        unitName: initialBooking?.unitName || '',
        complexName: initialBooking?.complexName || '',
        checkInDate: initialBooking?.checkInDate || '',
        checkOutDate: initialBooking?.checkOutDate || '',
        data,
        maintenanceNeeded,
        maintenanceNotes,
        signature,
        minibarConsumed,
        totalMinibar: MINIBAR_ITEMS.reduce((acc, curr) => acc + ((minibarConsumed[curr.name] || 0) * curr.price), 0)
      };"""

replacement = """      const consumedList = MINIBAR_ITEMS.map(item => ({
        ...item,
        qtyConsumed: minibarConsumed[item.name] || 0
      })).filter(i => i.qtyConsumed > 0);

      const report = {
        type: 'pre_checkin',
        timestamp: new Date().toISOString(),
        submittedBy: currentUser,
        bookingId: bookingId,
        guestName: initialBooking?.fullName || initialBooking?.guestName || 'Unknown',
        unitName: initialBooking?.unitName || '',
        complexName: initialBooking?.complexName || '',
        checkInDate: initialBooking?.checkInDate || '',
        checkOutDate: initialBooking?.checkOutDate || '',
        data,
        maintenanceNeeded,
        maintenanceNotes,
        signature,
        minibarConsumed: consumedList,
        totalMinibar: consumedList.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0)
      };"""

if target in content:
    content = content.replace(target, replacement)
else:
    print("Target not found for precheckin2")

with open("src/components/PreCheckInFlow.tsx", "w") as f:
    f.write(content)
print("Patched PreCheckInFlow 2")
