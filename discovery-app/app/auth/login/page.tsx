'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/hooks/useAuth';
import { LogIn, Sparkles, Mail, Lock, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/config';

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

      // Check if user's profile is fully set up in Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists() && userDoc.data()?.profileCompleted) {
            router.push('/discover');
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
          {/* Header with subtle logo easeOut animation */}
          <div className="text-center space-y-2 pt-0 sm:pt-1">
            <motion.div
              initial={{ opacity: 0, scale: 1.0, y: -4 }}
              animate={{ opacity: 1, scale: 1.15, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
              }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B8E7FF]/40 dark:bg-[#B8E7FF]/20 text-[#00AAFF] dark:text-[#B8E7FF] border border-[#00AAFF]/30 dark:border-[#B8E7FF]/30 mt-0 mb-2 shadow-md shadow-[#00AAFF]/15"
            >
              <SolobertyLogo className="w-7 h-7 fill-[#00AAFF] dark:fill-[#B8E7FF]" color="#00AAFF" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
                delay: 0.04,
              }}
              className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white origin-center"
            >
              Welcome back to <span className="text-[#00AAFF] dark:text-[#B8E7FF] font-heading font-extrabold">Soloberty</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, scale: 0.98, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
                delay: 0.06,
              }}
              className="text-sm text-slate-500 dark:text-slate-400 origin-center"
            >
              Log in to continue connecting with people who share your vibe
            </motion.p>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {displayError && redirectCountdown === null && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs sm:text-sm"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Redirect Countdown Popup Banner (Red alert styling) */}
          <AnimatePresence>
            {redirectCountdown !== null && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Content with minimized subtle transition */}
          <AnimatePresence mode="wait">
            <motion.form
              key="loginForm"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#00AAFF] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#00AAFF] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || redirectCountdown !== null}
                className="w-full mt-2 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            </motion.form>
          </AnimatePresence>
        </div>

        {/* Auth Switcher Component */}
        <AuthSwitch />
      </div>
    </div>
  );
}
