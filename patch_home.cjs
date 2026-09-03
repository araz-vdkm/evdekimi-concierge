const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

code = code.replace(
  "interface HomeProps {\n  onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard', data?: any) => void;\n  isAdmin: boolean;\n  userRole?: string;\n}",
  "interface HomeProps {\n  onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard', data?: any) => void;\n  isAdmin: boolean;\n  userRole?: string;\n  currentUser?: any;\n}"
);

code = code.replace(
  "export default function Home({ onSelectView, isAdmin, userRole }: HomeProps) {",
  "export default function Home({ onSelectView, isAdmin, userRole, currentUser }: HomeProps) {"
);

// We need to filter processReservations based on currentUser.assignedComplexes
const processResFind = `  const processReservations = (reservationsList: any[], syncTime?: string | null) => {
    if (syncTime) setLastSyncTime(syncTime);
    setAllReservations(reservationsList);`;

const processResReplace = `  const processReservations = (reservationsList: any[], syncTime?: string | null) => {
    if (syncTime) setLastSyncTime(syncTime);
    
    // RBAC: Filter reservations by assigned complexes if not admin/supervisor
    let filteredList = reservationsList;
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
      const allowedComplexes = currentUser.assignedComplexes || [];
      filteredList = reservationsList.filter(r => {
         const cName = r.complexName || r.villa || '';
         return allowedComplexes.includes(cName) || allowedComplexes.length === 0;
      });
    }
    
    setAllReservations(filteredList);
    reservationsList = filteredList;`;

code = code.replace(processResFind, processResReplace);

fs.writeFileSync('src/components/Home.tsx', code);
