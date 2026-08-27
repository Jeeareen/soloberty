'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface Step1CredentialsProps {
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleStep1Submit: (e: React.FormEvent) => void;
  renderErrorAlert: () => React.ReactNode;
  loading: boolean;
  authLoading: boolean;
  emailExists?: boolean;
  onEmailChange?: () => void;
}

export const Step1Credentials: React.FC<Step1CredentialsProps> = ({
  formData,
  setFormData,
  handleStep1Submit,
  renderErrorAlert,
  loading,
  authLoading,
  emailExists = false,
  onEmailChange,
}) => {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
    return null;
  };

  const validatePassword = (pwd: string) => {
    if (!pwd) return 'Password is required.';
    if (pwd.length < 8) return 'Password must be at least 8 characters long.';
    return null;
  };

  const validateConfirmPassword = (confirmPwd: string, pwd: string) => {
    if (!confirmPwd) return 'Please confirm your password.';
    if (confirmPwd !== pwd) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(formData.email);
    const pErr = validatePassword(formData.password);
    const cErr = validateConfirmPassword(formData.confirmPassword, formData.password);

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);

    if (eErr || pErr || cErr) {
      return;
    }

    handleStep1Submit(e);
  };

  return (
    <motion.form
      key="step1"
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onSubmit={handleSubmit}
      noValidate
      className="flex-1 min-h-0 flex flex-col justify-between space-y-3"
    >
      <div className="space-y-3 shrink-0">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Create your account</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Step 1: Enter your email and choose a secure password</p>
        </div>

        {renderErrorAlert()}
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-3.5 my-1">
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="signup-email"
              type="email"
              required
              value={formData.email}
              aria-describedby={emailError ? 'email-error' : undefined}
              aria-invalid={Boolean(emailError)}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, email: val });
                if (onEmailChange) onEmailChange();
                if (emailError) setEmailError(validateEmail(val));
              }}
              onBlur={() => setEmailError(validateEmail(formData.email))}
              placeholder="you@example.com"
              className={`w-full pl-[35px] pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${emailError
                  ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00AAFF]'
                } rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors`}
            />
          </div>
          {emailError && (
            <p
              id="email-error"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Password (min 8 characters)
          </label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              aria-describedby={passwordError ? 'password-error' : undefined}
              aria-invalid={Boolean(passwordError)}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, password: val });
                if (passwordError) setPasswordError(validatePassword(val));
                if (confirmPasswordError && formData.confirmPassword) {
                  setConfirmPasswordError(validateConfirmPassword(formData.confirmPassword, val));
                }
              }}
              onBlur={() => setPasswordError(validatePassword(formData.password))}
              placeholder="••••••••"
              className={`w-full pl-[35px] pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${passwordError
                  ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00AAFF]'
                } rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors`}
            />
          </div>
          {passwordError && (
            <p
              id="password-error"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{passwordError}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="signup-confirm-password"
              type="password"
              required
              value={formData.confirmPassword}
              aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
              aria-invalid={Boolean(confirmPasswordError)}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, confirmPassword: val });
                if (confirmPasswordError) setConfirmPasswordError(validateConfirmPassword(val, formData.password));
              }}
              onBlur={() => setConfirmPasswordError(validateConfirmPassword(formData.confirmPassword, formData.password))}
              placeholder="••••••••"
              className={`w-full pl-[35px] pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${confirmPasswordError
                  ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00AAFF]'
                } rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors`}
            />
          </div>
          {confirmPasswordError && (
            <p
              id="confirm-password-error"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{confirmPasswordError}</span>
            </p>
          )}
        </div>
      </div>

      <div className="pt-2 shrink-0">
        <button
          type="submit"
          disabled={loading || authLoading || emailExists}
          className="w-full py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading || authLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking account status...
            </>
          ) : emailExists ? (
            <>
              Account Already Exists
            </>
          ) : (
            <>
              Continue to Basic Info
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
};
