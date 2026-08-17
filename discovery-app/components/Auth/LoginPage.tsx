'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/hooks/useAuth';
import { Sparkles, Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setErrorState] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg !== null) {
      setErrorKey((prev) => prev + 1);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      router.push('/discover');
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err?.message || 'Invalid email or password. Please try again.';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential')
      ) {
        msg = 'Invalid email or password. Please check your credentials.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderErrorAlert = () => (
    <>
      {error && (
        <motion.div
          key={errorKey}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, -12, 12, -9, 9, -5, 5, -2, 2, 0],
          }}
          transition={{
            duration: 0.35,
            ease: 'easeInOut',
          }}
          className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm shadow-sm my-1"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}
    </>
  );

  return (
    <div className="w-full max-w-xl mx-auto h-[580px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-slate-900 overflow-hidden">
      {/* Progress Bar Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5 text-blue-600">
            <Sparkles className="w-4 h-4" />
            Soloberty Portal
          </span>
          <span>Log In</span>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.form
          key="step1"
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onSubmit={handleLoginSubmit}
          className="space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-xs sm:text-sm text-slate-500">Enter your email and password to continue</p>
          </div>

          {renderErrorAlert()}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading || authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Log In
              </>
            )}
          </button>
        </motion.form>
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
