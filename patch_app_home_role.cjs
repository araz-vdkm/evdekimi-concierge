const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  `const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';`,
  `const isAdmin = currentUser?.role === 'admin';`
);

appCode = appCode.replace(
  `{currentView === 'home' && <Home onSelectView={(view, data) => { setCurrentView(view); if (data) setCheckinData(data); else setCheckinData(null); }} isAdmin={isAdmin} />`,
  `{currentView === 'home' && <Home onSelectView={(view, data) => { setCurrentView(view); if (data) setCheckinData(data); else setCheckinData(null); }} isAdmin={isAdmin} userRole={currentUser?.role} />`
);
fs.writeFileSync('src/App.tsx', appCode);

// Patch Home.tsx
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

// We need to hide the Guest Registration and Send Survey buttons for Supervisors
// They are located inside the `renderReservation` map

const surveyButtonMatch = `                        <button
                          onClick={() => {
                            const surveyUrl = \`https://forms.gle/joBC1gteqn14A1Hs6\`;`;
const surveyButtonReplace = `                        {userRole !== 'supervisor' && (
                        <button
                          onClick={() => {
                            const surveyUrl = \`https://forms.gle/joBC1gteqn14A1Hs6\`;`;

// Need to find the end of the survey button.
// And same for Guest Registration. Let's do it with regex or targeted replaces.
