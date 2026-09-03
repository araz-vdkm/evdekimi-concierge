const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

code = code.replace(
  'if (Array.isArray(parsed) && parsed.length > 0) {\n          processReservations(parsed, savedTime);\n          setIsLoading(false);\n        }',
  'if (Array.isArray(parsed) && parsed.length > 0) {\n          processReservations(parsed, savedTime);\n          if (!refresh) setIsLoading(false);\n        }'
);

code = code.replace(
  'const [isSyncing, setIsSyncing] = useState(false);',
  ''
);

if (!code.includes('isSyncingBookings')) {
  code = code.replace(
    'const [isLoading, setIsLoading] = useState(true);',
    'const [isLoading, setIsLoading] = useState(true);\n  const [isSyncingBookings, setIsSyncingBookings] = useState(false);'
  );
  
  code = code.replace(
    'const fetchReservations = async (refresh: boolean = false) => {',
    'const fetchReservations = async (refresh: boolean = false) => {\n    if (refresh) setIsSyncingBookings(true);'
  );
  
  code = code.replace(
    '} finally {\n      setIsLoading(false);\n    }',
    '} finally {\n      setIsLoading(false);\n      if (refresh) setIsSyncingBookings(false);\n    }'
  );
  
  code = code.replace(
    '<RefreshCw className="w-3.5 h-3.5" />\n            Sync Bookings',
    '<RefreshCw className={`w-3.5 h-3.5 ${isSyncingBookings ? "animate-spin" : ""}`} />\n            {isSyncingBookings ? "Syncing..." : "Sync Bookings"}'
  );
}

fs.writeFileSync('src/components/Home.tsx', code);
console.log('done');
