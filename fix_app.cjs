const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  "import { syncAllRecordsToLocal } from './lib/db';",
  "import { syncAllRecordsToLocal, getRecord, saveRecord } from './lib/db';"
);
content = content.replace(
  "  useEffect(() => {\n    document.title = \"Concierge Pro by EVDEkimi\";\n    syncAllRecordsToLocal();\n  }, []);",
  `  useEffect(() => {
    document.title = "Concierge Pro by EVDEkimi";
    syncAllRecordsToLocal();
    
    // Attempt to load global spreadsheet ID from Firestore
    getRecord('config', 'global_spreadsheet').then((config) => {
      if (config && config.spreadsheetId) {
        setSpreadsheetId(config.spreadsheetId);
        localStorage.setItem('conciergeSpreadsheetId', config.spreadsheetId);
      }
    });
  }, []);`
);
content = content.replace(
  "        setSpreadsheetId(data.spreadsheetId);\n        localStorage.setItem('conciergeSpreadsheetId', data.spreadsheetId);",
  `        setSpreadsheetId(data.spreadsheetId);
        localStorage.setItem('conciergeSpreadsheetId', data.spreadsheetId);
        if (data.spreadsheetId !== 'mock-spreadsheet-id') {
          saveRecord('config', 'global_spreadsheet', { spreadsheetId: data.spreadsheetId }).catch(() => {});
        }`
);
fs.writeFileSync('src/App.tsx', content, 'utf8');
