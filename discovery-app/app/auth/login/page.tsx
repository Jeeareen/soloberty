'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/hooks/useAuth';
import { LogIn, Mail, Lock, AlertCircle, Loader2, UserPlus } from 'lucide-react';

import SolobertyLogo from '../../../components/SolobertyLogo';
import AuthSwitch from '../../../components/Auth/AuthSwitch';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Clear stale errors when mounting login page
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, []);

  // Filter out raw Firebase system error strings for display
  const displayError =
    localError ||
    (error && !error.includes('invalid-credential') && !error.includes('user-not-found')
      ? error
      : null);

  // Live countdown timer for automatic signup redirection
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      router.push('/auth/signup');
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redirectCountdown !== null) return;

    setLocalError(null);
    setRedirectCountdown(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    try {
      // Dynamically load Firebase modules only on form submission to keep initial page load fast
      const [{ fetchSignInMethodsForEmail }, { doc, getDoc, collection, query, where, getDocs }, { db, auth }] =
        await Promise.all([
          import('firebase/auth'),
          import('firebase/firestore'),
          import('../../../lib/firebase/config'),
        ]);

      // 1. First check if the email exists in Firebase Auth or Firestore
      let isEmailRegistered = false;
      const cleanEmail = email.trim();

      try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        if (methods && methods.length > 0) {
          isEmailRegistered = true;
        }
      } catch (checkErr) {
        // Silently ignore auth method fetch errors
      }

      if (!isEmailRegistered) {
        // Check Firestore users collection as secondary verification
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
          const querySnapshot = await getDocs(userQuery);
          if (!querySnapshot.empty) {
            isEmailRegistered = true;
          }
        } catch (fsErr) {
          // Silently ignore
        }
      }

      // If email does not exist anywhere, trigger 3-second redirect to Sign Up
      if (!isEmailRegistered) {
        setLocalError(null);
        setRedirectCountdown(3);
        return;
      }

      // 2. Email exists; attempt authentication with password
      await login(cleanEmail, password);

      if (auth.currentUser && !auth.currentUser.emailVerified) {
        router.push('/auth/verify-email');
        return;
      }

      // Check if user's profile is fully set up in Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists() && userDoc.data()?.profileCompleted) {
            router.push('/feed');
            return;
          }
        } catch (fsErr) {
          console.warn('Firestore doc check warning on login:', fsErr);
        }
      }

      // If profile is incomplete, send back to signup wizard to finish
      router.push('/auth/signup');
    } catch (err: any) {
      console.warn('Login error encountered:', err);
      setLocalError('Invalid email or password. Please check your credentials.');
      setRedirectCountdown(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="w-full max-w-xl space-y-4">
        {/* Card Container (exact same fixed size as SignupWizard) */}
        <div className="w-full h-[580px] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-slate-900 dark:text-white overflow-hidden">
          {/* Header rendered immediately at full opacity for fast LCP */}
          <div className="text-center space-y-2 pt-0 sm:pt-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E8F4FC]/40 dark:bg-[#B8E7FF]/20 text-[#007ABB] dark:text-[#B8E7FF] border border-[#007ABB]/30 dark:border-[#B8E7FF]/30 mt-0 mb-2 shadow-md shadow-[#007ABB]/15">
              <SolobertyLogo className="w-7 h-7 fill-[#007ABB] dark:fill-[#B8E7FF]" color="#007ABB" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back to <span className="text-[#007ABB] dark:text-[#B8E7FF] font-heading font-extrabold">Soloberty</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Log in to continue connecting with people who share your vibe
            </p>
          </div>

          {/* Error Alert */}
          {displayError && redirectCountdown === null && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs sm:text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Redirect Countdown Popup Banner (Red alert styling) */}
          {redirectCountdown !== null && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-rose-900 dark:text-rose-200">Account not registered yet</div>
                  <div className="text-[11px] font-normal text-rose-700 dark:text-rose-300">
                    Redirecting to Sign Up wizard...
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                {redirectCountdown}s
              </div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#007ABB] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#007ABB] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || redirectCountdown !== null}
                className="w-full mt-2 py-3.5 px-4 bg-[#007ABB] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#007ABB]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Login
                  </>
                )}
              </button>
          </form>
        </div>

        {/* Auth Switcher Component */}
        <AuthSwitch />
      </div>
    </div>
  );
}
