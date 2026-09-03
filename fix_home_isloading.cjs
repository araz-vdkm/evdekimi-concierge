const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

code = code.replace(
  'const fetchReservations = async (refresh: boolean = false) => {\n    if (refresh) setIsSyncingBookings(true);\n    setIsLoading(true);',
  'const fetchReservations = async (refresh: boolean = false) => {\n    if (refresh) {\n      setIsSyncingBookings(true);\n    } else {\n      setIsLoading(true);\n    }'
);

code = code.replace(
  '} finally {\n      setIsLoading(false);\n      if (refresh) setIsSyncingBookings(false);\n    }',
  '} finally {\n      setIsLoading(false);\n      if (refresh) setIsSyncingBookings(false);\n    }'
); // Keep finally as is, it's harmless to set isLoading(false) again.

fs.writeFileSync('src/components/Home.tsx', code);
console.log('done');
