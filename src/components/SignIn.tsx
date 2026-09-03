import React, { useState } from 'react';
import { EvdekimiLogo } from './EvdekimiLogo';
import { Mail, Lock, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { loginUser, signInWithSocial, isSuperUserEmail } from '../lib/auth';
import { getRecord } from '../lib/db';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function SignIn({ onRegisterClick, onLoginSuccess, onNewSocialUser }: { onRegisterClick: () => void, onLoginSuccess: (user: any) => void, onNewSocialUser: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      let loginEmail = email.trim();
      
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@evdekimi.com`;
      }
      const user = await loginUser(loginEmail, password);
      
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before logging in. Check your inbox.');
      }
      
      const userData = await getRecord('users', user.uid);
      if (!userData) {
         throw new Error('User record not found in database. Please contact support.');
      }
      if (userData.isBlocked) {
         throw new Error('Your account has been blocked. Please contact support.');
      }
      if ((userData.isApproved === false || userData.isApproved === undefined) && !isSuperUserEmail(userData.email)) {
         throw new Error('Your account is pending Super Admin approval (roman@evdekimi.com). You cannot log in until approved.');
      }
      
      onLoginSuccess(userData);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await signInWithSocial(provider);
      
      const userData = await getRecord('users', user.uid);
      if (userData) {
        if (userData.isBlocked) {
          throw new Error('Your account has been blocked. Please contact support.');
        }
        if ((userData.isApproved === false || userData.isApproved === undefined) && !isSuperUserEmail(userData.email)) {
           throw new Error('Your account is pending Super Admin approval (roman@evdekimi.com). You cannot log in until approved.');
        }
        onLoginSuccess(userData);
      } else {
        // New user detected! Redirect to register passing the user.
        onNewSocialUser(user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('popup-closed-by-user')) {
        setError('Sign-in window was closed before completing authentication. Please try again when ready.');
      } else {
        setError(err.message || `${provider} login failed`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <EvdekimiLogo className="mx-auto h-16 w-auto" variant="blue" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          CONCIERGE<span className="text-blue-600">PRO</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-md text-sm">{error}</div>}
          
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-slate-800 focus:outline-none disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.92 3.78 2.22-3.2 1.69-2.65 6.02.48 7.31-.77 1.48-1.63 2.72-2.91 3.48zm-3.23-14.8c-.16-1.57 1.04-3.15 2.51-3.48.33 1.76-1.34 3.33-2.51 3.48z"/>
              </svg>
              Sign in with Apple
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address or Username</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-400 flex flex-col gap-2">
            <div>
              <span>New staff member or admin? </span>
              <button
                type="button"
                onClick={onRegisterClick}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
              >
                Register New Account →
              </button>
            </div>
            <div className="flex items-center justify-center gap-4">
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
      </div>
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
