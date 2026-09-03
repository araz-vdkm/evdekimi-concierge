const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

if (!code.includes('pendingSocialUser')) {
  // Update signature
  code = code.replace(
    'export default function Register({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {',
    'export default function Register({ onBack, onComplete, pendingSocialUser }: { onBack: () => void, onComplete: () => void, pendingSocialUser?: any }) {'
  );

  // Default state initialization
  code = code.replace(
    'const [firstName, setFirstName] = useState(\'\');\n  const [lastName, setLastName] = useState(\'\');\n  const [mobile, setMobile] = useState(\'\');\n  const [email, setEmail] = useState(\'\');\n  const [password, setPassword] = useState(\'\');',
    `const [firstName, setFirstName] = useState(pendingSocialUser?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(pendingSocialUser?.displayName?.split(' ').slice(1).join(' ') || '');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(pendingSocialUser?.email || '');
  const [password, setPassword] = useState('');`
  );

  // Update handleRegister to skip auth creation if pendingSocialUser
  const handleRegStart = `    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const user = await registerUser(email, password);`;

  const newHandleRegStart = `    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      let uid = pendingSocialUser?.uid;
      
      if (!pendingSocialUser) {
        const user = await registerUser(email, password);
        uid = user.uid;
      }
      `;

  code = code.replace(handleRegStart, newHandleRegStart);

  // Update saveRecord call inside handleRegister to use uid
  code = code.replace(
    'uid: user.uid,',
    'uid: uid,'
  );
  code = code.replace(
    `await saveRecord('users', user.uid, userData);`,
    `await saveRecord('users', uid, userData);`
  );

  // Hide password field if pendingSocialUser
  code = code.replace(
    `<div>
                <label className="block text-sm font-medium text-slate-700">Password</label>`,
    `{!pendingSocialUser && (<div>
                <label className="block text-sm font-medium text-slate-700">Password</label>`
  );

  code = code.replace(
    `minLength={6} />
                </div>
              </div>`,
    `minLength={6} />
                </div>
              </div>)}`
  );

  // Make email readonly if pendingSocialUser
  code = code.replace(
    `input type="email" required value={email} onChange={e => setEmail(e.target.value)}`,
    `input type="email" required value={email} onChange={e => setEmail(e.target.value)} readOnly={!!pendingSocialUser} className={pendingSocialUser ? 'bg-slate-100 cursor-not-allowed ' : ''} `
  );

  // Add social buttons to the top of Register form if !pendingSocialUser
  // Actually, wait, let's keep it simple: Social registration happens on SignIn page, then redirects here.
  // The user asked to "allow users to register using Google or Apple".
  // If they click "Register" and want to use Google, maybe they should have the buttons here too.
}

fs.writeFileSync('src/components/Register.tsx', code);
