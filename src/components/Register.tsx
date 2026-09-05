import { collection, getDocs } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { EvdekimiLogo } from './EvdekimiLogo';
import { User, Mail, Phone, Building, ShieldCheck, FileText, Loader2, ArrowLeft, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { db, signInWithSocial, isSuperUserEmail } from '../lib/auth';
import { saveRecord, getRecord } from '../lib/db';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function Register({ onBack, onComplete, pendingSocialUser }: { onBack: () => void, onComplete: (user?: any) => void, pendingSocialUser?: any }) {
  const [socialUser, setSocialUser] = useState<any>(pendingSocialUser || null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  
  const [firstName, setFirstName] = useState(pendingSocialUser?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(pendingSocialUser?.displayName?.split(' ').slice(1).join(' ') || '');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(pendingSocialUser?.email || '');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<'admin'|'supervisor'|'frontdesk'>('frontdesk');
  
  const [complexes, setComplexes] = useState<string[]>([]);
  const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});
  
  const [assignedComplexes, setAssignedComplexes] = useState<string[]>([]);
  const [assignedUnits, setAssignedUnits] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registrationSubmitted, setRegistrationSubmitted] = useState<any>(null);

  useEffect(() => {
    getDocs(collection(db, "villaMappings"))
      .then(querySnapshot => {
        const complexSet = new Set<string>();
        const unitsMap: Record<string, string[]> = {};
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const c = data.complexType?.trim();
          const u = data.unitName?.trim();
          if (c) {
            complexSet.add(c);
            if (!unitsMap[c]) unitsMap[c] = [];
            if (u && !unitsMap[c].includes(u)) {
              unitsMap[c].push(u);
            }
          }
        });

        const sortedComplexes = Array.from(complexSet).sort();
        for (const c of sortedComplexes) {
          unitsMap[c].sort();
        }

        setComplexes(sortedComplexes);
        setUnitsByComplex(unitsMap);
      })
      .catch(err => console.error("Failed to fetch villa mappings:", err));
  }, []);

  const handleComplexToggle = (complex: string) => {
    setAssignedComplexes(prev => {
      const isSelected = prev.includes(complex);
      const newComplexes = isSelected ? prev.filter(c => c !== complex) : [...prev, complex];
      
      const unitsForComplex = unitsByComplex[complex] || [];
      if (!isSelected) {
        setAssignedUnits(prevUnits => {
          const toAdd = unitsForComplex.filter(u => !prevUnits.includes(u));
          return [...prevUnits, ...toAdd];
        });
      } else {
        setAssignedUnits(prevUnits => prevUnits.filter(u => !unitsForComplex.includes(u)));
      }
      
      return newComplexes;
    });
  };

  const handleUnitToggle = (unit: string) => {
    setAssignedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const handleConnectSocial = async (provider: 'google' | 'apple') => {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await signInWithSocial(provider);
      
      const existingUserData = await getRecord('users', user.uid);
      if (existingUserData) {
        if (existingUserData.isBlocked) {
          throw new Error('Your account has been blocked. Please contact support.');
        }
        if (existingUserData.isApproved === false && !isSuperUserEmail(existingUserData.email)) {
          throw new Error('Your account is waiting for approval by Super Admin (roman@evdekimi.com). You cannot log in until approved.');
        }
        localStorage.setItem('conciergeAuth', 'oauth');
        localStorage.setItem('conciergeUser', JSON.stringify(existingUserData));
        onComplete(existingUserData);
        return;
      }
      
      setSocialUser(user);
      if (user.email) setEmail(user.email);
      if (user.displayName) {
        const parts = user.displayName.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('popup-closed-by-user')) {
        setError('Sign-in window was closed before completing authentication. Please try again when ready.');
      } else {
        setError(err.message || `Failed to sign in with ${provider}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialUser) {
      setError('Please connect your Google or Apple account first.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    try {
      const userEmail = socialUser.email || email;
      const finalRole = userEmail.endsWith('@evdekimi.com') ? 'admin' : role;
      const isSuperUser = isSuperUserEmail(userEmail);
      
      const newUserData = {
        uid: socialUser.uid,
        email: userEmail,
        username: socialUser.displayName || `${firstName} ${lastName}`.trim() || 'Staff User',
        title: company || 'Evdekimi',
        role: finalRole,
        assignedComplexes: assignedComplexes,
        assignedUnits: assignedUnits,
        firstName,
        lastName,
        mobile,
        isBlocked: false,
        isApproved: isSuperUser, // Only roman@evdekimi.com is auto-approved; all other users are false (pending Super Admin approval)
        createdAt: new Date().toISOString()
      };
      
      await saveRecord('users', socialUser.uid, newUserData);

      if (isSuperUser) {
        localStorage.setItem('conciergeAuth', 'oauth');
        localStorage.setItem('conciergeUser', JSON.stringify(newUserData));
        onComplete(newUserData);
      } else {
        // Clear any lingering session cache to ensure pending user cannot bypass
        localStorage.removeItem('conciergeAuth');
        localStorage.removeItem('conciergeUser');
        setRegistrationSubmitted(newUserData);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <EvdekimiLogo className="mx-auto h-16 w-auto mb-6" variant="blue" />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white py-8 px-6 shadow-xl sm:rounded-2xl border border-slate-200 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <Clock className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" /> Pending Super Admin Approval
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registration Submitted Successfully</h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                Your staff account has been created in the database. For security and access control, all new accounts require approval by the Super Administrator (<strong className="text-slate-900">roman@evdekimi.com</strong>) before you can log in.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Name:</span>
                <span className="font-bold text-slate-800">{registrationSubmitted.firstName} {registrationSubmitted.lastName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-bold text-slate-800">{registrationSubmitted.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Requested Role:</span>
                <span className="font-bold text-blue-700 capitalize">{registrationSubmitted.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-amber-700">Waiting for Super Admin Approval</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-700 mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
        </button>
        <EvdekimiLogo className="mx-auto h-16 w-auto mb-6" variant="blue" />
        <h2 className="text-center text-3xl font-extrabold text-slate-900">Create Staff Account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          
          {!socialUser ? (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-slate-900 text-base mb-1">Step 1: Connect Social Account</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please authenticate with your Google or Apple account to verify your identity and link your staff registration email.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConnectSocial('google')}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-lg shadow-xs bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Register & Connect Google Account
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleConnectSocial('apple')}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-800 rounded-lg shadow-xs bg-slate-900 text-sm font-semibold text-white hover:bg-black focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
                    <>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.92 3.78 2.22-3.2 1.69-2.65 6.02.48 7.31-.77 1.48-1.63 2.72-2.91 3.48zm-3.23-14.8c-.16-1.57 1.04-3.15 2.51-3.48.33 1.76-1.34 3.33-2.51 3.48z"/>
                      </svg>
                      Register & Connect Apple Account
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Authenticated Social Account Connected</span>
                    <span className="font-medium text-emerald-700">{socialUser.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialUser(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px] cursor-pointer"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">First Name</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Last Name</label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Mobile Phone</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={e => setMobile(e.target.value)}
                        className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Company</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Connected Email Address</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={socialUser.email || email}
                      readOnly
                      className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs bg-slate-100 text-slate-600 font-medium cursor-not-allowed text-sm"
                    />
                  </div>
                  {(socialUser.email || email).endsWith('@evdekimi.com') && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Will be automatically assigned EVDEkimi Admin role
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Requested Role</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['admin', 'supervisor', 'frontdesk'].map((r) => (
                      <div 
                        key={r}
                        onClick={() => {
                          if (!(socialUser.email || email).endsWith('@evdekimi.com') && r === 'admin') {
                            setError('Only @evdekimi.com emails can request Admin role directly.');
                            return;
                          }
                          setRole(r as any);
                        }}
                        className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${role === r ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 font-bold text-blue-900' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                      >
                        <span className="text-sm font-medium capitalize">{r === 'frontdesk' ? 'Front Desk' : r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(role === 'supervisor' || role === 'frontdesk') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Villas & Units</label>
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md p-4 space-y-4 bg-slate-50/50">
                      {complexes.map(c => (
                        <div key={c} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <label className="flex items-center gap-2 font-semibold text-slate-800 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assignedComplexes.includes(c)}
                              onChange={() => handleComplexToggle(c)}
                              className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                            />
                            {c}
                          </label>
                          <div className="pl-6 grid grid-cols-2 gap-2">
                            {unitsByComplex[c]?.map(u => (
                              <label key={u} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignedUnits.includes(u)}
                                  onChange={() => handleUnitToggle(u)}
                                  className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer"
                                />
                                {u}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : 'Complete Registration'}
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 text-center flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </button>
          </div>
        </div>
      </div>
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
