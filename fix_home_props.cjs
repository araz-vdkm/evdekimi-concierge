const fs = require('fs');
let homeCode = fs.readFileSync('src/components/Home.tsx', 'utf8');

homeCode = homeCode.replace(
  `interface HomeProps {
  onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard', data?: any) => void;
  isAdmin: boolean;
}`,
  `interface HomeProps {
  onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard', data?: any) => void;
  isAdmin: boolean;
  userRole?: string;
}`
);

homeCode = homeCode.replace(
  `export default function Home({ onSelectView, isAdmin }: HomeProps) {`,
  `export default function Home({ onSelectView, isAdmin, userRole }: HomeProps) {`
);

fs.writeFileSync('src/components/Home.tsx', homeCode);
console.log('Fixed HomeProps');
