'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/hooks/useAuth';
import { LogIn, Sparkles, Mail, Lock, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { doc, getDoc } from 'firebase/firestore';
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
      await login(email.trim(), password);

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
      const errMsg = err?.message || '';

      if (
        errMsg.includes('invalid-credential') ||
        errMsg.includes('user-not-found') ||
        errMsg.includes('INVALID_LOGIN_CREDENTIALS')
      ) {
        setLocalError(null);
        setRedirectCountdown(3);
      } else {
        setLocalError(errMsg || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl space-y-4">
        {/* Card Container (exact same fixed size as SignupWizard) */}
        <div className="w-full h-[580px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-slate-900 overflow-hidden">
          {/* Header with subtle logo easeOut animation */}
          <div className="text-center space-y-2 pt-0 sm:pt-1">
            <motion.div
              initial={{ opacity: 0, scale: 1.0, y: -4 }}
              animate={{ opacity: 1, scale: 1.15, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
              }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 mt-0 mb-2 shadow-sm"
            >
              <SolobertyLogo className="w-7 h-7 text-blue-600 fill-blue-600" color="#2563EB" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
                delay: 0.04,
              }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 origin-center"
            >
              Welcome back to <span className="text-blue-600 font-extrabold">Soloberty</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, scale: 0.98, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
                delay: 0.06,
              }}
              className="text-sm text-slate-500 origin-center"
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
                className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
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
                className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-900 text-xs sm:text-sm font-semibold shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-rose-900">Account not registered yet</div>
                    <div className="text-[11px] font-normal text-rose-700">
                      Redirecting to Sign Up wizard...
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || redirectCountdown !== null}
                className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
