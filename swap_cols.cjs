const fs = require('fs');
let content = fs.readFileSync('src/components/Home.tsx', 'utf8');

const startStr = '          {/* Arrivals (Check-ins) Column */}';
const midStr = '          {/* Departures (Check-outs) Column */}';
const endStr = '        </div>\n      )}\n\n      {/* Survey Reconfirmation Modal */}';

const startIdx = content.indexOf(startStr);
const midIdx = content.indexOf(midStr);
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || midIdx === -1 || endIdx === -1) {
    console.log("Could not find markers", startIdx, midIdx, endIdx);
    process.exit(1);
}

const before = content.substring(0, startIdx);
const arrivals = content.substring(startIdx, midIdx);
const departures = content.substring(midIdx, endIdx);
const after = content.substring(endIdx);

const newContent = before + departures + arrivals + after;
fs.writeFileSync('src/components/Home.tsx', newContent);
console.log("Swapped!");
