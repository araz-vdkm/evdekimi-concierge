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
        signature
      };"""

replacement = """      const report = {
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

if target in content:
    content = content.replace(target, replacement)
else:
    print("Target not found for report object")

target_save = """      await saveRecord('pre_checkin', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        lastEditedAt: new Date().toISOString()
      });"""

replacement_save = """      await saveRecord('pre_checkin', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        minibarPhoto: uploadedMinibarPhoto,
        lastEditedAt: new Date().toISOString()
      });"""

if target_save in content:
    content = content.replace(target_save, replacement_save)
else:
    print("Target not found for saveRecord")

with open("src/components/PreCheckInFlow.tsx", "w") as f:
    f.write(content)
print("Patched PreCheckInFlow")
