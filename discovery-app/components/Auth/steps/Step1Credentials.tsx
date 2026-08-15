'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

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
}

export const Step1Credentials: React.FC<Step1CredentialsProps> = ({
  formData,
  setFormData,
  handleStep1Submit,
  renderErrorAlert,
  loading,
  authLoading,
}) => {
  return (
    <motion.form
      key="step1"
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onSubmit={handleStep1Submit}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Create your account</h2>
        <p className="text-xs sm:text-sm text-slate-500">Step 1: Enter your email and choose a secure password</p>
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Password (min 8 characters)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
            Registering account...
          </>
        ) : (
          <>
            Continue to Basic Info
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.form>
  );
};
