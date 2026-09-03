const fs = require('fs');

function removeAlerts(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Replace success alerts
  code = code.replace(/alert\('Inspection Report submitted successfully!.*'\);/g, "console.log('Inspection Report submitted successfully!');");
  code = code.replace(/alert\('Post Check-out report submitted successfully!.*'\);/g, "console.log('Post Check-out report submitted successfully!');");
  code = code.replace(/alert\('Post Check-Out Report submitted successfully!.*'\);/g, "console.log('Post Check-out report submitted successfully!');");
  
  // Replace error alerts
  code = code.replace(/alert\("Error saving check-in."\);/g, "console.error('Error saving check-in');");
  code = code.replace(/alert\('Failed to submit pre-checkin report. Please try again.'\);/g, "console.error('Failed to submit pre-checkin report');");
  code = code.replace(/alert\('Failed to submit post-checkout report. Please check details and try again.'\);/g, "console.error('Failed to submit post-checkout report');");
  code = code.replace(/alert\("Error processing data."\);/g, "console.error('Error processing data');");

  fs.writeFileSync(filePath, code);
}

removeAlerts('src/components/CheckInFlow.tsx');
removeAlerts('src/components/PreCheckInFlow.tsx');
removeAlerts('src/components/PostCheckOutFlow.tsx');
console.log('Patched alerts');
