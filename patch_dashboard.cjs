const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  "interface DashboardProps {\n  spreadsheetId: string;\n  initialSearchTerm?: string;\n  initialTab?: 'overview' | 'list' | 'pre-checkin' | 'post-checkout';\n  onComplete?: () => void;\n}",
  "interface DashboardProps {\n  spreadsheetId: string;\n  initialSearchTerm?: string;\n  initialTab?: 'overview' | 'list' | 'pre-checkin' | 'post-checkout';\n  onComplete?: () => void;\n  currentUser?: any;\n}"
);

code = code.replace(
  "export default function Dashboard({ spreadsheetId, initialSearchTerm, initialTab, onComplete }: DashboardProps) {",
  "export default function Dashboard({ spreadsheetId, initialSearchTerm, initialTab, onComplete, currentUser }: DashboardProps) {"
);

const dashFilterFind = `        const data = await res.json();
        setGuests(data.guests || []);`;

const dashFilterReplace = `        const data = await res.json();
        let fetchedGuests = data.guests || [];
        
        // RBAC Filter
        if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
          const allowedComplexes = currentUser.assignedComplexes || [];
          if (allowedComplexes.length > 0) {
            fetchedGuests = fetchedGuests.filter((g: any) => allowedComplexes.includes(g.complexName));
          }
        }
        
        setGuests(fetchedGuests);`;

code = code.replace(dashFilterFind, dashFilterReplace);

fs.writeFileSync('src/components/Dashboard.tsx', code);
