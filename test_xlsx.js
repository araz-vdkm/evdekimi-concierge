const XLSX = require('xlsx');

const exportData = [{
  name: "John",
  upsell: { "John": "Spa" }
}];

try {
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  console.log("Success", worksheet);
} catch (e) {
  console.error("Error", e);
}
