const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  "  useEffect(() => {\n    if (token && !spreadsheetId) {\n      initSheet(token);\n    }\n  }, [token, spreadsheetId]);",
  `  useEffect(() => {
    const checkAndInit = async () => {
      if (token && !spreadsheetId) {
        // Wait for config check to definitely finish before creating a new one
        const config = await getRecord('config', 'global_spreadsheet');
        if (config && config.spreadsheetId) {
          setSpreadsheetId(config.spreadsheetId);
          localStorage.setItem('conciergeSpreadsheetId', config.spreadsheetId);
          return;
        }
        initSheet(token);
      }
    };
    checkAndInit();
  }, [token, spreadsheetId]);`
);
fs.writeFileSync('src/App.tsx', content, 'utf8');
