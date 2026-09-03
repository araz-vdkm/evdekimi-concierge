const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace imports
code = code.replace(
  "import { Hotel, LogOut, LayoutDashboard, UserPlus, Home as HomeIcon, ShieldCheck, UserCheck, Key, RefreshCw, Menu, X } from 'lucide-react';",
  "import { Hotel, LogOut, LayoutDashboard, UserPlus, Home as HomeIcon, ShieldCheck, UserCheck, Key, RefreshCw, Menu, X, Users } from 'lucide-react';\nimport SignIn from './components/SignIn';\nimport Register from './components/Register';\nimport UserManagement from './components/UserManagement';\nimport { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';\nimport { auth } from './lib/auth';"
);

// We want to replace the inside of App function up to the first return
const appBodyMatch = `export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);`;

const newAppBody = `export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          const userData = await getRecord('users', firebaseUser.uid);
          if (userData && !userData.isBlocked) {
             setCurrentUser(userData as UserAccount);
             setNeedsAuth(false);
          } else {
             setNeedsAuth(true);
             setCurrentUser(null);
          }
        } catch (e) {
          setNeedsAuth(true);
          setCurrentUser(null);
        }
      } else {
        setNeedsAuth(true);
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);`;

code = code.replace(appBodyMatch, newAppBody);

// Replace handleLogout
const logoutMatch = `  const handleLogout = () => {
    setCurrentUser(null);
    setNeedsAuth(true);
    setToken(null);
    localStorage.removeItem('conciergeUser');
    localStorage.removeItem('conciergeAuth');
    setCurrentView('home');
    setIsMenuOpen(false);
  };`;

const newLogout = `  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setNeedsAuth(true);
    setCurrentView('home');
    setIsMenuOpen(false);
  };`;

if (code.includes(logoutMatch)) {
  code = code.replace(logoutMatch, newLogout);
} else {
  console.log("Could not find old handleLogout");
}

// Replace the if(needsAuth) return
const needsAuthReturnMatchRegex = /if\s*\(needsAuth\)\s*\{[\s\S]*?return\s*\(\s*<div[\s\S]*?<\/div>\s*\);\s*\}/;

const newNeedsAuthReturn = `  if (needsAuth) {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (showRegister) {
      return (
        <Register 
          onBack={() => setShowRegister(false)} 
          onComplete={() => setShowRegister(false)} 
        />
      );
    }

    return (
      <SignIn 
        onRegisterClick={() => setShowRegister(true)} 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setNeedsAuth(false);
        }} 
      />
    );
  }`;

code = code.replace(needsAuthReturnMatchRegex, newNeedsAuthReturn);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx auth flow');
