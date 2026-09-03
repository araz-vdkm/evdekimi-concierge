const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const startMarker = "{activeTab === 'overview' && (";
const endMarker = "{activeTab === 'list' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) +
        "{activeTab === 'overview' && (\n        <GuestInsights guests={guests} />\n      )}\n\n      " +
        content.substring(endIndex);
    fs.writeFileSync('src/components/Dashboard.tsx', newContent);
    console.log("Successfully replaced overview block");
} else {
    console.log("Could not find markers", {startIndex, endIndex});
}
