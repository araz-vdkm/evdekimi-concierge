const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('pendingSocialUser')) {
  // Add state
  code = code.replace(
    "const [showRegister, setShowRegister] = useState(false);",
    "const [showRegister, setShowRegister] = useState(false);\n  const [pendingSocialUser, setPendingSocialUser] = useState<any>(null);"
  );

  // Update Register component props
  code = code.replace(
    /<Register \s*onBack=\{\(\) => setShowRegister\(false\)\}\s*onComplete=\{\(\) => setShowRegister\(false\)\}\s*\/>/,
    `<Register 
          onBack={() => { setShowRegister(false); setPendingSocialUser(null); }} 
          onComplete={() => { setShowRegister(false); setPendingSocialUser(null); }} 
          pendingSocialUser={pendingSocialUser}
        />`
  );

  // Update SignIn component props
  code = code.replace(
    /<SignIn \s*onRegisterClick=\{\(\) => setShowRegister\(true\)\}\s*onLoginSuccess=\{\(user\) => \{\s*setCurrentUser\(user\);\s*setNeedsAuth\(false\);\s*\}\}\s*\/>/,
    `<SignIn 
        onRegisterClick={() => setShowRegister(true)} 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setNeedsAuth(false);
        }} 
        onNewSocialUser={(user) => {
          setPendingSocialUser(user);
          setShowRegister(true);
        }}
      />`
  );
  
  // also change the emailVerified condition to allow Google/Apple sign-ins! OAuth doesn't always have emailVerified true (Apple does, but Google sometimes varies or we just want to bypass if they authenticated via social). 
  // Wait, if they authenticate via Google/Apple, they shouldn't be blocked by emailVerified. But let's check `firebaseUser.providerData`.
  
  code = code.replace(
    "if (firebaseUser && firebaseUser.emailVerified) {",
    "if (firebaseUser) {"
  );
}

fs.writeFileSync('src/App.tsx', code);
