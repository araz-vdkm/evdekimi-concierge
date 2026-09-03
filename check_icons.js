const fs = require('fs');
const content = fs.readFileSync('src/components/MinibarDashboard.tsx', 'utf8');
const match = content.match(/import \{([^}]+)\} from 'lucide-react';/);
console.log(match[1]);
