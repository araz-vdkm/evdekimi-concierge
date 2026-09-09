import { safeSetItem } from './lib/safeStorage';
import { saveConciergeUserSession } from './lib/db';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import React, { useState, useEffect, useRef } from 'react';
import CheckInFlow from './components/CheckInFlow';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import MinibarDashboard from './components/MinibarDashboard';
import PreCheckInFlow from './components/PreCheckInFlow';
import PostCheckOutFlow from './components/PostCheckOutFlow';
import SurveyFlow from './components/SurveyFlow';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import UpsellDashboard from './components/UpsellDashboard';
import ReportingDashboard from './components/ReportingDashboard';
import QATestingSuite from './components/QATestingSuite';
import { Hotel, LogOut, LayoutDashboard, UserPlus, Home as HomeIcon, ShieldCheck, UserCheck, Key, RefreshCw, Menu, X, Users, Wrench, Coffee, Activity, FlaskConical, Sparkles, BarChart3 } from 'lucide-react';
import SignIn from './components/SignIn';
import Register from './components/Register';
import UserManagement from './components/UserManagement';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, getAccessToken, getGoogleToken, isSuperUserEmail } from './lib/auth';
import { UserAccount, ScreenKey } from './types';
import EvdekimiLogo from './components/EvdekimiLogo';
import { useRoles, getScreenAccess, canViewScreen, canEditScreen, isSuperuserAccount } from './lib/roles';

// Accounts database removed

import { syncAllRecordsToLocal, getRecord, saveRecord } from './lib/db';
import { googleSignIn } from './lib/auth';
import { loadVillaMappings } from './lib/villaMatcher';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [pendingSocialUser, setPendingSocialUser] = useState<any>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    loadVillaMappings();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const savedUserStr = localStorage.getItem('conciergeUser');
      let localSessionUser: any = null;
      if (savedUserStr) {
        try {
          localSessionUser = JSON.parse(savedUserStr);
        } catch (e) {}
      }

      if (firebaseUser) {
        try {
          const userData = await getRecord('users', firebaseUser.uid);
          if (userData && !userData.isBlocked && (userData.isApproved === true || isSuperUserEmail(userData.email))) {
            setCurrentUser(userData as UserAccount);
            setNeedsAuth(false);
            setToken('dummy-token');
            saveConciergeUserSession(userData);
          } else if (localSessionUser && !localSessionUser.isBlocked && (localSessionUser.isApproved === true || isSuperUserEmail(localSessionUser.email))) {
            // Keep active staff session when connecting external Gmail OAuth account
            setCurrentUser(localSessionUser);
            setNeedsAuth(false);
            setToken('dummy-token');
          } else {
            setNeedsAuth(true);
            setCurrentUser(null);
          }
        } catch (e) {
          if (localSessionUser && !localSessionUser.isBlocked && (localSessionUser.isApproved === true || isSuperUserEmail(localSessionUser.email))) {
            setCurrentUser(localSessionUser);
            setNeedsAuth(false);
            setToken('dummy-token');
          } else {
            setNeedsAuth(true);
            setCurrentUser(null);
          }
        }
      } else {
        if (localSessionUser && !localSessionUser.isBlocked && (localSessionUser.isApproved === true || isSuperUserEmail(localSessionUser.email))) {
          setCurrentUser(localSessionUser);
          setNeedsAuth(false);
          setToken('dummy-token');
        } else {
          localStorage.removeItem('conciergeUser');
          localStorage.removeItem('conciergeAuth');
          setNeedsAuth(true);
          setCurrentUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    const handleUserUpdated = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('user-updated', handleUserUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('user-updated', handleUserUpdated);
    };
  }, []);

  useEffect(() => {
    document.title = "Concierge Pro by EVDEkimi";
    syncAllRecordsToLocal();
    
    const handleRefresh = () => syncAllRecordsToLocal();
    window.addEventListener('refresh-data', handleRefresh);
    
    // Background watchdog: periodically sync offline guests
    const dbWatchdog = setInterval(() => {
      syncOfflineGuests();
    }, 5 * 60 * 1000);
    
    // Also try syncing on load and when online
    const syncOfflineGuests = async () => {
      const savedId = localStorage.getItem('conciergeSpreadsheetId');
      if (!savedId) return;
      try {
        let savedGuests = JSON.parse((await idbGet("concierge_registered_guests")) || '[]');
        let needsSave = false;
        
        for (let i = 0; i < savedGuests.length; i++) {
           const g = savedGuests[i];
           if (g._synced === false) {
              try {
                const token = await import('./lib/auth').then(m => m.getAccessToken());
                const res = await fetch('/api/guests', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
                  },
                  body: JSON.stringify({ spreadsheetId: savedId, guest: g })
                });
                if (res.ok) {
                   g._synced = true;
                   needsSave = true;
                }
              } catch(e) {
                 // Still offline
                 break; 
              }
           }
        }
        
        if (needsSave) {
           await idbSet("concierge_registered_guests", JSON.stringify(savedGuests));
        }
      } catch(e) {}
    };
    
    window.addEventListener('online', syncOfflineGuests);
    syncOfflineGuests();
    
    // Attempt to load global spreadsheet ID from Firestore
    getRecord('config', 'global_spreadsheet').then((config) => {
      if (config && config.spreadsheetId) {
        setSpreadsheetId(config.spreadsheetId);
        safeSetItem('conciergeSpreadsheetId', config.spreadsheetId);
      } else {
        const localId = localStorage.getItem('conciergeSpreadsheetId');
        if (localId && localId !== 'mock-spreadsheet-id') {
          saveRecord('config', 'global_spreadsheet', { spreadsheetId: localId }).catch(() => {});
        }
      }
    });
    
    return () => window.removeEventListener('refresh-data', handleRefresh);
  }, []);
  
  const [currentView, setCurrentView] = useState<'home' | 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'usermanagement' | 'maintenance' | 'minibar' | 'upsell' | 'reporting' | 'qatesting'>('home');
  const [simulatedUser, setSimulatedUser] = useState<UserAccount | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [checkinData, setCheckinData] = useState<any>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(localStorage.getItem('conciergeSpreadsheetId'));
  const isInitializingSheetRef = useRef(false);

  useEffect(() => {
    const savedUserStr = localStorage.getItem('conciergeUser');
    const savedAuth = localStorage.getItem('conciergeAuth');
    if (savedUserStr && savedAuth && savedAuth !== 'hardcoded') {
      try {
        const user = JSON.parse(savedUserStr);
        if (user.isBlocked) {
          localStorage.removeItem('conciergeUser');
          setNeedsAuth(true);
          return;
        }
        setCurrentUser(user);
        setNeedsAuth(false);
        setToken('dummy-token');

        // Verify fresh status in background
        const targetId = user.uid || user.username;
        if (targetId) {
          getRecord('users', targetId).then((freshUser) => {
            if (freshUser) {
              if (freshUser.isBlocked || (freshUser.isApproved !== true && !isSuperUserEmail(freshUser.email))) {
                localStorage.removeItem('conciergeUser');
                setCurrentUser(undefined);
                setNeedsAuth(true);
                if (freshUser.isBlocked) alert('Your account has been suspended/blocked. Please contact support.');
              } else {
                setCurrentUser(freshUser);
                saveConciergeUserSession(freshUser);
              }
            }
          }).catch(() => {});
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const checkAndInit = async () => {
      if (token && !spreadsheetId && !isInitializingSheetRef.current) {
        isInitializingSheetRef.current = true;
        try {
          // Wait for config check to definitely finish before creating a new one
          const config = await getRecord('config', 'global_spreadsheet');
          if (config && config.spreadsheetId) {
            setSpreadsheetId(config.spreadsheetId);
            safeSetItem('conciergeSpreadsheetId', config.spreadsheetId);
            return;
          }
          await initSheet(token);
        } catch (e) {
          console.warn('Sheet init check failed, will fall back to mock storage:', e);
        } finally {
          isInitializingSheetRef.current = false;
        }
      }
    };
    checkAndInit();
  }, [token, spreadsheetId]);

  // Hard safety net: Google Sheets is a legacy/optional data store (Firestore is the
  // real DB), so the guest ledger must never block the UI forever. If spreadsheetId
  // hasn't resolved a few seconds after login (Firestore hiccup, slow/offline server,
  // any unexpected error above), force the mock ledger so Guest Insights / Check-in
  // can render instead of spinning on "Preparing guest ledger..." indefinitely.
  useEffect(() => {
    if (!token || spreadsheetId) return;
    const timer = setTimeout(() => {
      setSpreadsheetId((current) => {
        if (current) return current;
        console.warn('Sheet init timed out, falling back to mock storage.');
        safeSetItem('conciergeSpreadsheetId', 'mock-spreadsheet-id');
        return 'mock-spreadsheet-id';
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, [token, spreadsheetId]);

  const initSheet = async (authToken: string) => {
    try {
      const res = await fetch('/api/sheets/init', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, "x-google-oauth-token": getGoogleToken() }
      });
      if (!res.ok) throw new Error("Failed to init sheet");
      const data = await res.json();
      if (data.spreadsheetId) {
        setSpreadsheetId(data.spreadsheetId);
        safeSetItem('conciergeSpreadsheetId', data.spreadsheetId);
        if (data.spreadsheetId !== 'mock-spreadsheet-id') {
          saveRecord('config', 'global_spreadsheet', { spreadsheetId: data.spreadsheetId }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("Error init sheet (server might be restarting):", err?.message);
    }
  };


  const handleLogout = async () => {
    localStorage.removeItem('conciergeUser');
    localStorage.removeItem('conciergeAuth');
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setSimulatedUser(null);
    setNeedsAuth(true);
    setCurrentView('home');
    setIsMenuOpen(false);
  };

  const effectiveUser = simulatedUser || currentUser;
  const { roles } = useRoles();
  const canView = (screen: ScreenKey) => canViewScreen(effectiveUser, roles, screen);
  const canEditHome = canEditScreen(effectiveUser, roles, 'home');
  const isSuperuser = isSuperuserAccount(effectiveUser, roles);

  const MENU_ITEMS: { view: typeof currentView; label: string; icon: React.ReactNode; visible: (cv: (s: ScreenKey) => boolean) => boolean }[] = [
    { view: 'home', label: 'Operations Board', icon: <HomeIcon className="w-5 h-5" />, visible: (cv) => cv('home') },
    { view: 'dashboard', label: 'Guest Insights', icon: <LayoutDashboard className="w-5 h-5" />, visible: (cv) => cv('dashboard') },
    { view: 'maintenance', label: 'Maintenance', icon: <Wrench className="w-5 h-5 text-amber-500" />, visible: (cv) => cv('maintenance') },
    { view: 'minibar', label: 'Minibar', icon: <Coffee className="w-5 h-5 text-emerald-500" />, visible: (cv) => cv('minibar') },
    { view: 'upsell', label: 'Upsell Opportunities', icon: <Sparkles className="w-5 h-5 text-violet-500" />, visible: (cv) => cv('upsell') },
    { view: 'reporting', label: 'Reporting', icon: <BarChart3 className="w-5 h-5 text-blue-500" />, visible: (cv) => cv('reporting') },
    { view: 'usermanagement', label: 'User Management', icon: <Users className="w-5 h-5" />, visible: (cv) => cv('usermanagement') || cv('rolemanagement') },
    { view: 'qatesting', label: 'QA & Roles Suite', icon: <Activity className="w-5 h-5 text-indigo-500" />, visible: (cv) => cv('qatesting') },
  ];

  const isSurveyRoute = window.location.hash.startsWith('#/survey/');
  
  if (isSurveyRoute) {
    const bookingId = window.location.hash.replace('#/survey/', '');
    return <SurveyFlow bookingId={bookingId} onComplete={() => window.location.hash = ''} />;
  }

  useEffect(() => {
    const screenForView: Partial<Record<string, ScreenKey>> = {
      home: 'home', checkin: 'home', pre_checkin: 'home', post_checkout: 'home',
      dashboard: 'dashboard', usermanagement: 'usermanagement', maintenance: 'maintenance',
      minibar: 'minibar', upsell: 'upsell', reporting: 'reporting', qatesting: 'qatesting'
    };
    const requiredScreen = screenForView[currentView];
    const allowed =
      requiredScreen === 'usermanagement'
        ? (canView('usermanagement') || canView('rolemanagement'))
        : requiredScreen
        ? canView(requiredScreen)
        : true;
    if (!allowed) {
      setCurrentView('home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser, roles, currentView]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (needsAuth) {
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
          onBack={() => { setShowRegister(false); setPendingSocialUser(null); }} 
          onComplete={(user) => {
            setShowRegister(false);
            setPendingSocialUser(null);
            if (user) {
              setCurrentUser(user);
              setNeedsAuth(false);
              setToken('dummy-token');
            }
          }}
          pendingSocialUser={pendingSocialUser}
        />
      );
    }

    return (
      <SignIn 
        onRegisterClick={() => setShowRegister(true)} 
        onLoginSuccess={(user) => {
          localStorage.setItem('conciergeAuth', 'oauth');
          saveConciergeUserSession(user);
          setCurrentUser(user);
          setNeedsAuth(false);
          setToken('dummy-token');
        }} 
        onNewSocialUser={(user) => {
          setPendingSocialUser(user);
          setShowRegister(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Floating Simulation Alert Ribbon */}
      {simulatedUser && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shrink-0 shadow-md z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            <span>SIMULATION MODE ACTIVE: Viewing system as <strong>{simulatedUser.username}</strong> ({simulatedUser.role.toUpperCase()})</span>
            {simulatedUser.assignedComplexes && simulatedUser.assignedComplexes.length > 0 && (
              <span className="hidden md:inline text-amber-100 text-xs font-normal">
                — Bound to: {simulatedUser.assignedComplexes.join(', ')}
              </span>
            )}
          </div>
          <button
            onClick={() => setSimulatedUser(null)}
            className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded text-xs font-extrabold shadow-xs transition-colors"
          >
            Exit Simulation
          </button>
        </div>
      )}

      <header className="h-16 bg-[#0F172A] flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-lg relative z-50 border-b border-slate-800">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => { setCurrentView('home'); }}
        >
          <EvdekimiLogo className="h-9" variant="white" />
          <div className="h-6 w-[1px] bg-slate-700 mx-1 hidden sm:block" />
          <span className="text-white font-extrabold tracking-tight text-base sm:text-lg hidden sm:block">
            CONCIERGE<span className="text-blue-400">PRO</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 text-slate-300 text-sm font-medium">
          <button 
            onClick={() => {
              setIsGlobalRefreshing(true);
              window.dispatchEvent(new Event('refresh-data'));
              setTimeout(() => setIsGlobalRefreshing(false), 3000);
            }} 
            className="flex items-center gap-2 shrink-0 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isGlobalRefreshing ? "animate-spin text-blue-400" : ""}`} />
            <span className="text-sm font-semibold hidden sm:inline">Refresh</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors p-1"
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-4 w-60 bg-white rounded-xl shadow-xl py-2 z-50 border border-slate-100">
                {MENU_ITEMS.filter(item => item.visible(canView)).map(item => (
                  <button
                    key={item.view}
                    onClick={() => { setCurrentView(item.view); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === item.view ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}

              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-700 mx-1 shrink-0"></div>
          
          <div className="flex items-center gap-3 sm:border-l sm:border-slate-700 sm:pl-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                isSuperuser ? 'bg-purple-600' : canView('usermanagement') ? 'bg-blue-600' : 'bg-emerald-600'
              }`}>
                {effectiveUser?.username.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                  {effectiveUser?.username}
                  {simulatedUser && <span className="text-[10px] bg-amber-500 text-white px-1 py-0.2 rounded">SIM</span>}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">{effectiveUser?.title}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white p-2 rounded-full transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto flex flex-col">
        {currentView === 'home' && canView('home') && <Home onSelectView={(view, data) => { setCurrentView(view); if (data) setCheckinData(data); else setCheckinData(null); }} isSuperuser={isSuperuser} userRole={effectiveUser?.role} currentUser={effectiveUser} canEdit={canEditHome} />}
        {currentView === 'checkin' && canView('home') && (
          spreadsheetId ? (
            <CheckInFlow spreadsheetId={spreadsheetId} onComplete={() => setCurrentView('home')} initialBooking={checkinData} currentUser={effectiveUser} />
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-500 flex-col gap-4">
              <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
              <p>Preparing guest ledger...</p>
            </div>
          )
        )}
        {currentView === 'pre_checkin' && canView('home') && <PreCheckInFlow onComplete={() => setCurrentView('home')} initialBooking={checkinData} currentUser={effectiveUser} />}
        {currentView === 'post_checkout' && canView('home') && <PostCheckOutFlow onComplete={() => setCurrentView('home')} initialBooking={checkinData} currentUser={effectiveUser} />}
        {currentView === 'dashboard' && canView('dashboard') && (
          spreadsheetId ? (
            <Dashboard spreadsheetId={spreadsheetId} initialSearchTerm={checkinData?.guestName || checkinData?.confirmationCode} initialTab={checkinData?.targetTab} onComplete={() => setCurrentView('home')} currentUser={effectiveUser} />
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-500 flex-col gap-4">
              <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
              <p>Preparing guest ledger...</p>
            </div>
          )
        )}
        {currentView === 'usermanagement' && (canView('usermanagement') || canView('rolemanagement')) && <UserManagement currentUser={effectiveUser || undefined} onNavigateQA={() => setCurrentView('qatesting')} />}
        {currentView === 'maintenance' && canView('maintenance') && <MaintenanceDashboard currentUser={effectiveUser} onBackToHome={() => setCurrentView('home')} />}
        {currentView === 'minibar' && canView('minibar') && <MinibarDashboard currentUser={effectiveUser} onBackToHome={() => setCurrentView('home')} />}
        {currentView === 'upsell' && canView('upsell') && <UpsellDashboard currentUser={effectiveUser} onBackToHome={() => setCurrentView('home')} />}
        {currentView === 'reporting' && canView('reporting') && <ReportingDashboard currentUser={effectiveUser} onBackToHome={() => setCurrentView('home')} />}
        {currentView === 'qatesting' && canView('qatesting') && (
          <QATestingSuite
            currentUser={effectiveUser}
            onBackToHome={() => setCurrentView('home')}
            onSimulateRole={(sim) => setSimulatedUser(sim)}
            simulatedUser={simulatedUser}
          />
        )}
      </main>
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
